// Uji Firestore rules di emulator. Jalankan lewat:
//   firebase emulators:exec --only firestore "node scripts/test-firestore-rules.mjs"
//
// Menguji dua hal yang bikin rules ini ada:
//  - tamu tanpa login tidak bisa membaca apa pun
//  - anggota biasa tidak bisa mengangkat dirinya jadi admin
import assert from "node:assert";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";

const PROJECT = "gorillatix";
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8085").split(":");

const env = await initializeTestEnvironment({
  projectId: PROJECT,
  firestore: { host, port: Number(port), rules: readFileSync("firestore.rules", "utf8") },
});

await env.clearFirestore();

// Data awal ditulis tanpa rules supaya ada isi untuk dibaca.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, "crown-athletes", "admin-uid"), { name: "Admin", role: "admin" });
  await setDoc(doc(db, "crown-athletes", "member-uid"), { name: "Anggota", role: "athlete" });
  await setDoc(doc(db, "crown-recruits", "r1"), { name: "Calon", whatsapp: "0812", birthDate: "2012-01-01" });
  await setDoc(doc(db, "crown-logins", "l1"), { email: "a@b.c", city: "Bandung, ID" });
  await setDoc(doc(db, "athletes", "a1"), { name: "Atlet", currentWeight: 50 });
  await setDoc(doc(db, "crown-athlete-savings-transactions", "t1"), { athleteId: "member-uid", type: "DEPOSIT", amount: 100000 });
  await setDoc(doc(db, "crown-athlete-savings-audits", "audit-1"), { transactionId: "t1" });
});

const guest = env.unauthenticatedContext().firestore();
const member = env.authenticatedContext("member-uid").firestore();
const admin = env.authenticatedContext("admin-uid").firestore();
const owner = env.authenticatedContext("owner-uid", { email: "darmawanbayu1@gmail.com" }).firestore();

let passed = 0;
const check = async (label, promise) => {
  await promise;
  console.log("  ok —", label);
  passed++;
};

console.log("\nTamu (tanpa login):");
await check("tidak bisa baca data pendaftar", assertFails(getDocs(collection(guest, "crown-recruits"))));
await check("tidak bisa baca data atlet", assertFails(getDocs(collection(guest, "crown-athletes"))));
await check("tidak bisa baca catatan login", assertFails(getDocs(collection(guest, "crown-logins"))));
await check("tidak bisa baca data berat", assertFails(getDocs(collection(guest, "athletes"))));
await check("tidak bisa menulis jadwal", assertFails(setDoc(doc(guest, "crown-schedules", "x"), { date: "2026-09-30" })));

console.log("\nAnggota (sudah login):");
await check("bisa baca jadwal", assertSucceeds(getDocs(collection(member, "crown-schedules"))));
await check("bisa tulis jadwal", assertSucceeds(setDoc(doc(member, "crown-schedules", "s1"), { date: "2026-09-30", city: "Jakarta" })));
await check("bisa tulis absensi", assertSucceeds(setDoc(doc(member, "crown-absences", "ab1"), { date: "2026-09-30" })));
await check("TIDAK bisa baca data pendaftar", assertFails(getDocs(collection(member, "crown-recruits"))));
await check("TIDAK bisa baca catatan login", assertFails(getDocs(collection(member, "crown-logins"))));
await check("TIDAK bisa mengangkat diri jadi admin", assertFails(setDoc(doc(member, "crown-athletes", "member-uid"), { name: "Anggota", role: "admin" })));
await check("TIDAK bisa mengubah berat langsung", assertFails(setDoc(doc(member, "athletes", "a1"), { currentWeight: 1 })));
await check("bisa ubah namanya sendiri", assertSucceeds(setDoc(doc(member, "crown-athletes", "member-uid"), { name: "Anggota Baru", role: "athlete" })));
await check("bisa simpan atlet tanpa field role", assertSucceeds(setDoc(doc(member, "crown-athletes", "baru-1"), { name: "Atlet Baru", divisions: ["C4"] })));
await check("TIDAK bisa hapus atlet", assertFails(deleteDoc(doc(member, "crown-athletes", "baru-1"))));
await check("bisa baca tabungan semua atlet", assertSucceeds(getDocs(collection(member, "crown-athlete-savings-transactions"))));
await check("TIDAK bisa menambah transaksi tabungan langsung", assertFails(setDoc(doc(member, "crown-athlete-savings-transactions", "t2"), { athleteId: "member-uid", type: "DEPOSIT", amount: 1 })));
await check("TIDAK bisa mengubah transaksi tabungan langsung", assertFails(updateDoc(doc(member, "crown-athlete-savings-transactions", "t1"), { amount: 1 })));
await check("TIDAK bisa menghapus transaksi tabungan", assertFails(deleteDoc(doc(member, "crown-athlete-savings-transactions", "t1"))));
await check("TIDAK bisa baca audit perubahan", assertFails(getDocs(collection(member, "crown-athlete-savings-audits"))));
await check("bisa baca kas", assertSucceeds(getDocs(collection(member, "crown-kas-daily"))));
await check("TIDAK bisa menulis kas harian", assertFails(setDoc(doc(member, "crown-kas-daily", "k1"), { date: "2026-10-10", paidAmount: 13000 })));
await check("TIDAK bisa menulis transaksi kas", assertFails(setDoc(doc(member, "crown-kas-transactions", "kt1"), { amount: 13000 })));
await check("TIDAK bisa menulis receipt bulk", assertFails(setDoc(doc(member, "crown-kas-bulk-requests", "kr1"), { athleteId: "member-uid" })));

console.log("\nAngkatan 18 (admin-only):");
// Runs BEFORE the Admin section below promotes member-uid to admin,
// otherwise the "member" checks below would run as an admin.
await check("TAMU tidak bisa baca absensi A18", assertFails(getDocs(collection(guest, "crown-a18-attendance"))));
await check("TAMU tidak bisa baca penilaian A18", assertFails(getDocs(collection(guest, "crown-a18-evaluations"))));
await check("ANGGOTA tidak bisa baca absensi A18", assertFails(getDocs(collection(member, "crown-a18-attendance"))));
await check("ANGGOTA tidak bisa tulis absensi A18", assertFails(setDoc(doc(member, "crown-a18-attendance", "r1"), { sessions: { "2026-08-26": "hadir" } })));
await check("ANGGOTA tidak bisa baca penilaian A18", assertFails(getDocs(collection(member, "crown-a18-evaluations"))));
await check("ADMIN bisa tulis absensi A18 valid", assertSucceeds(setDoc(doc(admin, "crown-a18-attendance", "r1"), { recruitId: "r1", fullName: "Calon", sessions: { "2026-08-26": "hadir", "2026-08-29": "izin" } })));
await check("ADMIN ditolak bila status di luar hadir/izin/alpa", assertFails(setDoc(doc(admin, "crown-a18-attendance", "r2"), { recruitId: "r2", sessions: { "2026-08-26": "sakit" } })));
await check("ADMIN bisa tulis penilaian A18 (satu kolom bebas)", assertSucceeds(setDoc(doc(admin, "crown-a18-evaluations", "r1"), { recruitId: "r1", notes: "Teknik bagus, attitude oke" })));
await check("ANGGOTA tidak bisa tulis penilaian A18", assertFails(setDoc(doc(member, "crown-a18-evaluations", "r1"), { recruitId: "r1", notes: "x" })));

console.log("\nAdmin:");
await check("bisa baca data pendaftar", assertSucceeds(getDocs(collection(admin, "crown-recruits"))));
await check("bisa baca catatan login", assertSucceeds(getDocs(collection(admin, "crown-logins"))));
await check("bisa mengangkat anggota jadi admin", assertSucceeds(setDoc(doc(admin, "crown-athletes", "member-uid"), { name: "Anggota", role: "admin" })));
await check("bisa hapus atlet", assertSucceeds(deleteDoc(doc(admin, "crown-athletes", "baru-1"))));
await check("bisa baca audit perubahan tabungan", assertSucceeds(getDocs(collection(admin, "crown-athlete-savings-audits"))));
await check("TIDAK bisa menulis transaksi langsung", assertFails(setDoc(doc(admin, "crown-athlete-savings-transactions", "t3"), { athleteId: "admin-uid", type: "DEPOSIT", amount: 1 })));
await check("TIDAK bisa menghapus transaksi tabungan", assertFails(deleteDoc(doc(admin, "crown-athlete-savings-transactions", "t1"))));
await check("bisa menulis kas harian", assertSucceeds(setDoc(doc(admin, "crown-kas-daily", "k1"), { date: "2026-10-10", paidAmount: 13000 })));
await check("bisa menulis transaksi kas", assertSucceeds(setDoc(doc(admin, "crown-kas-transactions", "kt1"), { amount: 13000 })));
await check("TIDAK bisa menulis receipt bulk langsung", assertFails(setDoc(doc(admin, "crown-kas-bulk-requests", "kr1"), { athleteId: "admin-uid" })));

console.log("\nOwner:");
await check("bisa baca audit perubahan tabungan", assertSucceeds(getDocs(collection(owner, "crown-athlete-savings-audits"))));
await check("TIDAK bisa menulis transaksi langsung", assertFails(setDoc(doc(owner, "crown-athlete-savings-transactions", "t4"), { athleteId: "owner-uid", type: "DEPOSIT", amount: 1 })));

await env.cleanup();
assert.equal(passed, 45, `harusnya 45 pemeriksaan lolos, dapat ${passed}`);
console.log(`\nSemua ${passed} pemeriksaan lolos.`);
