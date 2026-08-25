// This file handles all IUR calculations with reward and keringanan adjustments

export const toKey = (date) => {
  if (!date) return null
  if (typeof date === "string" && date.includes("-")) return date
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${year}-${month}`
}

export const fromKey = (key) => {
  if (!key) return null
  const [year, month] = key.split("-")
  return new Date(year, Number.parseInt(month) - 1, 1)
}

export const getMonthName = (monthNum) => {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]
  return months[monthNum - 1]
}

export const isMonthInRange = (month, startMonth, endMonth) => {
  // month, startMonth, endMonth format: "2025-01"
  return month >= startMonth && month <= endMonth
}

// Calculate adjusted IUR amount based on reward and keringanan
export const calculateAdjustedIUR = (baseAmount, reward, keringanan) => {
  // If reward exists, return 0 (gratis)
  if (reward) {
    return {
      amount: 0,
      status: "Gratis (Reward)",
      type: "reward",
      originalAmount: baseAmount,
    }
  }

  // If keringanan exists
  if (keringanan) {
    let adjustedAmount = baseAmount
    let description = ""

    if (keringanan.jenis === "PEMBEBASAN") {
      // Pembebasan = gratis
      adjustedAmount = 0
      description = "Gratis (Pembebasan)"
    } else if (keringanan.jenis === "PENGHAPUSAN") {
      // Penghapusan = dihapus dari kewajiban
      adjustedAmount = 0
      description = "Dihapus"
    } else if (keringanan.jenis === "KERINGANAN") {
      // Keringanan = potongan atau persentase
      if (keringanan.bentuk === "Potongan Rupiah") {
        adjustedAmount = Math.max(0, baseAmount - (keringanan.jumlahPotongan || 0))
        description = `Keringanan Rp ${keringanan.jumlahPotongan || 0}`
      } else if (keringanan.bentuk === "Prosentase") {
        const percentage = keringanan.prosentase || 0
        const potongan = (baseAmount * percentage) / 100
        adjustedAmount = Math.max(0, baseAmount - potongan)
        description = `Keringanan ${percentage}%`
      }
    }

    return {
      amount: adjustedAmount,
      status: description,
      type: "keringanan",
      originalAmount: baseAmount,
      keringananAmount: baseAmount - adjustedAmount,
    }
  }

  // Normal IUR
  return {
    amount: baseAmount,
    status: "Normal",
    type: "normal",
    originalAmount: baseAmount,
  }
}

// Get reward for a specific month and warga
export const getRewardForMonth = (rewards, wargaId, monthKey) => {
  if (!rewards || !Array.isArray(rewards)) return null

  return rewards.find((reward) => {
    if (reward.wargaId !== wargaId && reward.iuranWajib !== wargaId) return false

    const startMonth = reward.mulaiMonth || reward.mulai_bulan
    const endMonth = reward.sdMonth || reward.sd_bulan

    return isMonthInRange(monthKey, startMonth, endMonth)
  })
}

// Get keringanan for a specific month and warga
export const getKeringananForMonth = (keringanan, wargaId, monthKey) => {
  if (!keringanan || !Array.isArray(keringanan)) return null

  return keringanan.find((k) => {
    if (k.wargaId !== wargaId && k.kepalaWargaId !== wargaId) return false

    const startMonth = k.mulaiMonth || k.mulai_bulan
    const endMonth = k.sdMonth || k.sd_bulan

    return isMonthInRange(monthKey, startMonth, endMonth)
  })
}

// Calculate total pembebasan and kekurangan for a warga
export const calculateTotals = (payments) => {
  let totalPembebasan = 0
  let totalKekurangan = 0
  let totalBayar = 0

  payments.forEach((payment) => {
    if (payment.type === "reward" || payment.status === "Gratis (Reward)") {
      totalPembebasan += payment.originalAmount || 0
    } else if (payment.type === "keringanan" && payment.keringananAmount) {
      totalKekurangan += payment.keringananAmount
    }

    if (payment.amount > 0) {
      totalBayar += payment.amount
    }
  })

  return {
    totalPembebasan,
    totalKekurangan,
    totalBayar,
    totalSeharusnya: totalBayar + totalPembebasan + totalKekurangan,
  }
}
