// Firebase configuration and service
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDz40yzA7_pnQD8FCTIgldsnL8DGV6rc20",
  authDomain: "porto-12274.firebaseapp.com",
  projectId: "porto-12274",
  storageBucket: "porto-12274.firebasestorage.app",
  messagingSenderId: "482185826572",
  appId: "1:482185826572:web:74a091b8aac9cff1b93929",
  measurementId: "G-4S77Z6JG97",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const testFirebaseConnection = async () => {
  try {
    console.log("[v0] Testing Firebase connection...");
    // Try to read from a system collection to test connection
    const testQuery = query(collection(db, "modules"));
    await getDocs(testQuery);
    console.log("[v0] Firebase connection successful");
    return true;
  } catch (error) {
    console.error("[v0] Firebase connection failed:", error);
    return false;
  }
};

// Firestore service class
class FirestoreService {
  async getMonitoringLockStatus(wilayah, year, month) {
    try {
      await this.checkConnection();

      const docId = `${wilayah.rt}_${wilayah.rw}_${wilayah.kelurahan}_${wilayah.kecamatan}_${wilayah.kabupaten_kota}_${year}_${month}`;

      const docRef = doc(db, "bendaharaMonitoringLock", docId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        return { locked: false }; // default jika belum pernah dibuat
      }

      return snap.data(); // data misalnya { locked: true, updatedAt: ... }
    } catch (error) {
      console.error("[v0] getMonitoringLockStatus error:", error);
      return { locked: false };
    }
  }

  async checkConnection() {
    if (!db) throw new Error("Firestore is not initialized");
  }
  async getAll(collectionName) {
    await this.checkConnection();
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  }
  async add(collectionName, data) {
    await this.checkConnection();
    return await addDoc(collection(db, collectionName), data);
  }
  async update(collectionName, id, data) {
    await this.checkConnection();
    const ref = doc(db, collectionName, id);
    return await updateDoc(ref, data);
  }

  async delete(collectionName, id) {
    await this.checkConnection();
    const ref = doc(db, collectionName, id);
    return await deleteDoc(ref);
  }

  // firebase.js (di dalam class FirestoreService)
  async updatePaymentsForMonth(bulanBerlaku, newAmount) {
    await this.checkConnection();

    const bulan = bulanBerlaku.split(" ")[0].toLowerCase(); // contoh: "Februari"
    const tahun = bulanBerlaku.split(" ")[1];

    console.log(
      `[v0] Syncing payments for ${bulan} ${tahun} to Rp ${newAmount}`
    );

    const querySnapshot = await getDocs(collection(db, "iurPayments"));

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      if (data.payments && data.payments[bulan]) {
        await updateDoc(doc(db, "iurPayments", docSnap.id), {
          [`payments.${bulan}.amount`]: newAmount,
          updatedAt: new Date(),
        });
        console.log(
          `[v0] Updated ${bulan} ${tahun} in ${docSnap.id} to Rp ${newAmount}`
        );
      }
    }
  }

  constructor() {
    this.isConnected = null; // null = not tested, true = connected, false = failed
    this.connectionPromise = null;
    this.db = db; // Add db reference for external access
  }

  async ensureConnection() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.initConnection();
    return this.connectionPromise;
  }

  async set(collectionName, id, data) {
    try {
      await this.checkConnection();

      const cleanData = { ...data };
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, {
        ...cleanData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[v0] Document set in ${collectionName} with ID: ${id}`);
      return id;
    } catch (error) {
      console.error(`[v0] Error setting document in ${collectionName}:`, error);
      throw new Error(
        `Failed to set document in ${collectionName}: ${error.message}`
      );
    }
  }

  // di dalam class FirestoreService (firebase.js)
  async setDocCustom(collectionName, id, data) {
    try {
      await this.checkConnection();
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return id;
    } catch (error) {
      console.error(`[v0] Error setDocCustom ${collectionName}:`, error);
      throw new Error(`Failed to set custom doc: ${error.message}`);
    }
  }

  /**
   * Get all documents from a collection filtered by id_client
   */
  async getAllByIdClient(collectionName, idClient) {
    try {
      await this.checkConnection();
      console.log(
        `[v0] Getting documents from ${collectionName} for idClient: ${idClient}`
      );

      const q = query(
        collection(db, collectionName),
        where("id_client", "==", idClient)
      );

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(
        `[v0] Retrieved ${results.length} documents from ${collectionName} for idClient ${idClient}`
      );
      return results;
    } catch (error) {
      console.error(`[v0] Error getting ${collectionName} by idClient:`, error);
      throw new Error(
        `Failed to get ${collectionName} by idClient: ${error.message}`
      );
    }
  }

  /**
   * Get documents from a collection filtered by multiple conditions including id_client
   */
  async getByConditions(collectionName, idClient, additionalConditions = []) {
    try {
      await this.checkConnection();

      const conditions = [
        where("id_client", "==", idClient),
        ...additionalConditions,
      ];
      const q = query(collection(db, collectionName), ...conditions);

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return results;
    } catch (error) {
      console.error(
        `[v0] Error getting ${collectionName} by conditions:`,
        error
      );
      throw new Error(
        `Failed to get ${collectionName} by conditions: ${error.message}`
      );
    }
  }

  /**
   * Add document with automatic id_client
   */
  async addWithIdClient(collectionName, data, idClient) {
    try {
      await this.checkConnection();
      console.log(
        `[v0] Adding document to ${collectionName} for idClient: ${idClient}`
      );

      const cleanData = { ...data };
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      const docRef = await addDoc(collection(db, collectionName), {
        ...cleanData,
        id_client: idClient,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(
        `[v0] Document added with ID: ${docRef.id} and idClient: ${idClient}`
      );
      return docRef.id;
    } catch (error) {
      console.error(`[v0] Error adding to ${collectionName}:`, error);
      throw new Error(`Failed to add to ${collectionName}: ${error.message}`);
    }
  }

  /**
   * Update document and preserve id_client
   */
  async updateWithIdClient(collectionName, id, data, idClient) {
    try {
      await this.checkConnection();

      const cleanData = { ...data };
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      const docRef = doc(db, collectionName, id);

      // Verify document belongs to this idClient before updating
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || docSnap.data().id_client !== idClient) {
        throw new Error(
          "Unauthorized: Document does not belong to this client"
        );
      }

      await updateDoc(docRef, {
        ...cleanData,
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error(`[v0] Error updating ${collectionName}:`, error);
      throw new Error(`Failed to update ${collectionName}: ${error.message}`);
    }
  }

  /**
   * Delete document and verify id_client ownership
   */
  async deleteWithIdClient(collectionName, id, idClient) {
    try {
      await this.checkConnection();

      const docRef = doc(db, collectionName, id);

      // Verify document belongs to this idClient before deleting
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || docSnap.data().id_client !== idClient) {
        throw new Error(
          "Unauthorized: Document does not belong to this client"
        );
      }

      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[v0] Error deleting from ${collectionName}:`, error);
      throw new Error(
        `Failed to delete from ${collectionName}: ${error.message}`
      );
    }
  }

  /**
   * Get user by id field (not Firebase ID) and validate subscription
   */
  async getUserById(userId, idClient) {
    try {
      await this.checkConnection();

      const q = query(
        collection(db, "users"),
        where("id", "==", userId),
        where("id_client", "==", idClient)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error("[v0] Error getting user by ID:", error);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get all users for a specific client
   */
  async getUsersByIdClient(idClient) {
    try {
      await this.checkConnection();

      const q = query(
        collection(db, "users"),
        where("id_client", "==", idClient),
        where("status", "==", "aktif")
      );

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return results;
    } catch (error) {
      console.error("[v0] Error getting users by idClient:", error);
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  async initConnection() {
    try {
      console.log("[v0] Initializing Firebase connection...");
      this.isConnected = await testFirebaseConnection();
      if (this.isConnected) {
        console.log("[v0] Firebase service ready");
      } else {
        console.error("[v0] Firebase service failed to connect");
      }
      return this.isConnected;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      this.isConnected = false;
      return false;
    }
  }

  async checkConnection() {
    const connected = await this.ensureConnection();
    if (!connected) {
      throw new Error(
        "Tidak dapat terhubung ke Firebase. Periksa koneksi internet Anda."
      );
    }
  }

  async testFirebaseConnection() {
    try {
      console.log("[v0] Testing Firebase connection from service...");
      const testQuery = query(collection(db, "modules"));
      await getDocs(testQuery);
      console.log("[v0] Firebase connection test successful");
      return true;
    } catch (error) {
      console.error("[v0] Firebase connection test failed:", error);
      return false;
    }
  }

  // Generic CRUD operations
  async getAll(collectionName) {
    try {
      await this.checkConnection();
      console.log(`[v0] Getting all documents from ${collectionName}`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(
        `[v0] Retrieved ${results.length} documents from ${collectionName}`
      );
      return results;
    } catch (error) {
      console.error(`[v0] Error getting ${collectionName}:`, error);
      throw new Error(`Failed to get ${collectionName}: ${error.message}`);
    }
  }

  async getById(collectionName, id) {
    try {
      await this.checkConnection();
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`[v0] Error getting ${collectionName} by ID:`, error);
      throw new Error(
        `Failed to get ${collectionName} by ID: ${error.message}`
      );
    }
  }

  async add(collectionName, data) {
    try {
      await this.checkConnection();
      console.log(`[v0] Adding document to ${collectionName}:`, data);

      const cleanData = { ...data };

      // Remove any undefined or null values
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      const docRef = await addDoc(collection(db, collectionName), {
        ...cleanData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[v0] Document added with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`[v0] Error adding to ${collectionName}:`, error);
      throw new Error(`Failed to add to ${collectionName}: ${error.message}`);
    }
  }

  async update(collectionName, id, data) {
    try {
      await this.checkConnection();

      const cleanData = { ...data };
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...cleanData,
        updatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error(`[v0] Error updating ${collectionName}:`, error);
      throw new Error(`Failed to update ${collectionName}: ${error.message}`);
    }
  }

  async delete(collectionName, id) {
    try {
      await this.checkConnection();
      await deleteDoc(doc(db, collectionName, id));
      return true;
    } catch (error) {
      console.error(`[v0] Error deleting from ${collectionName}:`, error);
      throw new Error(
        `Failed to delete from ${collectionName}: ${error.message}`
      );
    }
  }

  // User authentication with Firestore
  async loginUser(username, password) {
    try {
      await this.checkConnection();
      console.log(`[v0] Attempting login for username: ${username}`);

      // First, find user in Firestore by username
      const usersQuery = query(
        collection(db, "users"),
        where("username", "==", username),
        where("password", "==", password) // In production, use proper password hashing
      );

      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        throw new Error("Invalid username or password");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };
      console.log(`[v0] Login successful for user:`, userData);

      return userData;
    } catch (error) {
      console.error("[v0] Login error:", error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Module-specific operations
  async getModules() {
    try {
      console.log("[v0] Loading modules from Firebase...");
      const modules = await this.getAll("modules");

      // Ensure proper sorting and data structure
      const sortedModules = modules
        .filter((module) => module && module.id_menu) // Filter out invalid modules
        .sort((a, b) => {
          return (
            Number.parseFloat(a.id_menu || 0) -
            Number.parseFloat(b.id_menu || 0)
          );
        });

      console.log(
        "[v0] Successfully loaded and sorted",
        sortedModules.length,
        "modules"
      );
      return sortedModules;
    } catch (error) {
      console.error("[v0] Error getting modules:", error);
      throw error;
    }
  }

  async addModule(moduleData) {
    try {
      return await this.add("modules", moduleData);
    } catch (error) {
      console.error("[v0] Error adding module:", error);
      throw error;
    }
  }

  async updateModule(id, moduleData) {
    try {
      return await this.update("modules", id, moduleData);
    } catch (error) {
      console.error("[v0] Error updating module:", error);
      throw error;
    }
  }

  async deleteModule(id) {
    try {
      return await this.delete("modules", id);
    } catch (error) {
      console.error("[v0] Error deleting module:", error);
      throw error;
    }
  }

  async addDocument(collectionName, data) {
    return await this.add(collectionName, data);
  }

  async addBatch(collectionName, dataArray) {
    try {
      await this.checkConnection();
      console.log(
        `[v0] Adding batch documents to ${collectionName}:`,
        dataArray.length,
        "items"
      );

      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error("Data array is empty or invalid");
      }

      const batch = writeBatch(db);
      const collectionRef = collection(db, collectionName);
      const results = [];

      for (const data of dataArray) {
        const cleanData = { ...data };
        Object.keys(cleanData).forEach((key) => {
          if (cleanData[key] === undefined || cleanData[key] === null) {
            delete cleanData[key];
          }
        });

        const docRef = doc(collectionRef);
        batch.set(docRef, {
          ...cleanData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        results.push({ id: docRef.id, ...cleanData });
      }

      await batch.commit();
      console.log(
        `[v0] Successfully added ${results.length} documents to ${collectionName}`
      );
      return results;
    } catch (error) {
      console.error(`[v0] Error adding batch to ${collectionName}:`, error);
      throw new Error(
        `Failed to add batch to ${collectionName}: ${error.message}`
      );
    }
  }

  async syncDummyData(dummyData) {
    try {
      await this.checkConnection();
      console.log("[v0] Starting dummy data sync to Firebase...");

      if (!dummyData || typeof dummyData !== "object") {
        throw new Error("Data tidak valid untuk sync");
      }

      const results = {};
      const collections = [
        "users",
        "modules",
        "ageCategories",
        "kkData",
        "wargaData",
        "pengurusRT",
        "pekerjaan",
      ];

      // Clear existing data first
      console.log("[v0] Clearing existing collections...");
      await this.clearAllCollections();

      // Sync each collection
      for (const collectionName of collections) {
        if (
          dummyData[collectionName] &&
          Array.isArray(dummyData[collectionName])
        ) {
          console.log(
            `[v0] Syncing ${collectionName} (${dummyData[collectionName].length} items)...`
          );
          results[collectionName] = [];

          const validItems = dummyData[collectionName].filter((item) => {
            if (!item || typeof item !== "object") {
              console.warn(
                `[v0] Skipping invalid item in ${collectionName}:`,
                item
              );
              return false;
            }
            return true;
          });

          if (validItems.length === 0) {
            console.log(`[v0] No valid items to sync for ${collectionName}`);
            continue;
          }

          // Use batch operations for better performance
          const batch = writeBatch(db);
          const collectionRef = collection(db, collectionName);

          for (const item of validItems) {
            try {
              const cleanItem = { ...item };
              Object.keys(cleanItem).forEach((key) => {
                if (cleanItem[key] === undefined || cleanItem[key] === null) {
                  delete cleanItem[key];
                }
              });

              const docRef = doc(collectionRef);
              batch.set(docRef, {
                ...cleanItem,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              results[collectionName].push({ id: docRef.id, ...cleanItem });
            } catch (itemError) {
              console.error(
                `[v0] Error processing item in ${collectionName}:`,
                itemError
              );
              // Continue with other items
            }
          }

          try {
            await batch.commit();
            console.log(
              `[v0] Successfully synced ${collectionName} (${results[collectionName].length} items)`
            );
          } catch (batchError) {
            console.error(
              `[v0] Error committing batch for ${collectionName}:`,
              batchError
            );
            throw new Error(
              `Gagal menyimpan data ${collectionName}: ${batchError.message}`
            );
          }
        } else {
          console.log(`[v0] Skipping ${collectionName} - no valid data`);
        }
      }

      console.log("[v0] Dummy data sync completed successfully");
      return results;
    } catch (error) {
      console.error("[v0] Error syncing dummy data:", error);

      if (error.message.includes("permission-denied")) {
        throw new Error(
          "Akses ditolak. Periksa konfigurasi Firebase Security Rules."
        );
      } else if (error.message.includes("network")) {
        throw new Error(
          "Masalah koneksi jaringan. Periksa koneksi internet Anda."
        );
      } else if (error.message.includes("quota-exceeded")) {
        throw new Error("Kuota Firebase terlampaui. Coba lagi nanti.");
      } else {
        throw new Error(`Sync gagal: ${error.message}`);
      }
    }
  }

  // Clear all collections (for testing)
  async clearAllCollections() {
    try {
      await this.checkConnection();
      const collections = [
        "users",
        "modules",
        "ageCategories",
        "kkData",
        "wargaData",
        "pengurusRT",
        "pekerjaan",
      ];

      for (const collectionName of collections) {
        console.log(`[v0] Clearing collection: ${collectionName}`);
        const querySnapshot = await getDocs(collection(db, collectionName));

        if (!querySnapshot.empty) {
          const batch = writeBatch(db);
          querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      }

      return true;
    } catch (error) {
      console.error("[v0] Error clearing collections:", error);
      throw new Error(`Failed to clear collections: ${error.message}`);
    }
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;
