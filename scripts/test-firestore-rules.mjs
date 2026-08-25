// Uji Firestore rules di emulator. Jalankan lewat:
//   firebase emulators:exec --only firestore "node scripts/test-firestore-rules.mjs"
//
// Menguji dua hal yang bikin rules ini ada:
//  - tamu tanpa login tidak bisa membaca apa pun
//  - anggota biasa tidak bisa mengangkat dirinya jadi admin
import assert from "node:assert";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
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
});

const guest = env.unauthenticatedContext().firestore();
const member = env.authenticatedContext("member-uid").firestore();
const admin = env.authenticatedContext("admin-uid").firestore();

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

console.log("\nAdmin:");
await check("bisa baca data pendaftar", assertSucceeds(getDocs(collection(admin, "crown-recruits"))));
await check("bisa baca catatan login", assertSucceeds(getDocs(collection(admin, "crown-logins"))));
await check("bisa mengangkat anggota jadi admin", assertSucceeds(setDoc(doc(admin, "crown-athletes", "member-uid"), { name: "Anggota", role: "admin" })));
await check("bisa hapus atlet", assertSucceeds(deleteDoc(doc(admin, "crown-athletes", "baru-1"))));

await env.cleanup();
assert.equal(passed, 19, `harusnya 19 pemeriksaan lolos, dapat ${passed}`);
console.log(`\nSemua ${passed} pemeriksaan lolos.`);
