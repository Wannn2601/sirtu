import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";

// Initialize Firebase (pastikan credentials sudah tersedia via environment)
const firebaseConfig = {
  apiKey: "AIzaSyDz40yzA7_pnQD8FCTIgldsnL8DGV6rc20",
  authDomain: "porto-12274.firebaseapp.com",
  projectId: "porto-12274",
  storageBucket: "porto-12274.firebasestorage.app",
  messagingSenderId: "482185826572",
  appId: "1:482185826572:web:74a091b8aac9cff1b93929",
  measurementId: "G-4S77Z6JG97",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateRekeningKegiatanFields() {
  try {
    console.log("[v0] Starting batch update for rekeningKegiatan...");

    // Batch 1: Update rekeningKegiatan collection
    // Map field: kelompok_pembukuan -> pencatatan
    const rekeningRef = collection(db, "rekeningKegiatan");
    const rekeningDocs = await getDocs(rekeningRef);

    const batch1 = writeBatch(db);
    let rekeningCount = 0;

    rekeningDocs.forEach((doc) => {
      const data = doc.data();
      const updates = {};

      if (data.kelompok_pembukuan && !data.pencatatan) {
        updates.pencatatan = data.kelompok_pembukuan;
        console.log(
          `[v0] rekeningKegiatan/${doc.id}: Adding pencatatan = "${data.kelompok_pembukuan}"`
        );
      }

      if (Object.keys(updates).length > 0) {
        batch1.update(doc.ref, updates);
        rekeningCount++;
      }
    });

    if (rekeningCount > 0) {
      await batch1.commit();
      console.log(
        `[v0] ✅ Updated ${rekeningCount} documents in rekeningKegiatan`
      );
    } else {
      console.log("[v0] ℹ️ No updates needed for rekeningKegiatan");
    }

    // Batch 2: Update subRekeningKegiatan collection
    // Map field: sub_rekening_kegiatan -> uraian
    const subRekeningRef = collection(db, "subRekeningKegiatan");
    const subRekeningDocs = await getDocs(subRekeningRef);

    const batch2 = writeBatch(db);
    let subRekeningCount = 0;

    subRekeningDocs.forEach((doc) => {
      const data = doc.data();
      const updates = {};

      if (data.sub_rekening_kegiatan && !data.uraian) {
        updates.uraian = data.sub_rekening_kegiatan;
        console.log(
          `[v0] subRekeningKegiatan/${doc.id}: Adding uraian = "${data.sub_rekening_kegiatan}"`
        );
      }

      if (data.kelompok_pembukuan && !data.pencatatan) {
        updates.pencatatan = data.kelompok_pembukuan;
        console.log(
          `[v0] subRekeningKegiatan/${doc.id}: Adding pencatatan = "${data.kelompok_pembukuan}"`
        );
      }

      if (Object.keys(updates).length > 0) {
        batch2.update(doc.ref, updates);
        subRekeningCount++;
      }
    });

    if (subRekeningCount > 0) {
      await batch2.commit();
      console.log(
        `[v0] ✅ Updated ${subRekeningCount} documents in subRekeningKegiatan`
      );
    } else {
      console.log("[v0] ℹ️ No updates needed for subRekeningKegiatan");
    }

    console.log("[v0] ✅ Batch update completed successfully!");
    console.log(
      `[v0] Total: ${rekeningCount} rekeningKegiatan + ${subRekeningCount} subRekeningKegiatan updated`
    );
  } catch (error) {
    console.error("[v0] ❌ Error during batch update:", error.message);
    process.exit(1);
  }
}

updateRekeningKegiatanFields();
