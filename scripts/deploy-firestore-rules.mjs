// Pasang firestore.rules ke project produksi lewat Firebase Rules REST API.
// Dipakai karena `firebase deploy` menolak service account (401) sementara
// token login CLI sudah kadaluarsa.
//
// Jalankan: node scripts/deploy-firestore-rules.mjs
// Butuh env FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (sudah ada di .env).
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEY_PATH = "/tmp/gorillatix-deploy-sa.json";
const source = readFileSync("firestore.rules", "utf8");

writeFileSync(
  KEY_PATH,
  JSON.stringify({
    type: "service_account",
    project_id: PROJECT,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  { mode: 0o600 }
);

try {
  const auth = new GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const base = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;

  // 1. Validasi dulu — jangan pernah pasang rules yang gagal kompilasi.
  const test = await client.request({
    url: `${base}:test`,
    method: "POST",
    data: { source: { files: [{ name: "firestore.rules", content: source }] } },
  });
  const issues = (test.data.issues ?? []).filter((i) => i.severity === "ERROR");
  if (issues.length) {
    console.error("Rules gagal kompilasi:");
    for (const i of issues) console.error(" -", i.description);
    process.exit(1);
  }
  console.log("Validasi rules: OK");

  // 2. Buat ruleset baru.
  const ruleset = await client.request({
    url: `${base}/rulesets`,
    method: "POST",
    data: { source: { files: [{ name: "firestore.rules", content: source }] } },
  });
  const rulesetName = ruleset.data.name;
  console.log("Ruleset dibuat:", rulesetName);

  // 3. Arahkan release `cloud.firestore` ke ruleset baru.
  const releaseName = `projects/${PROJECT}/releases/cloud.firestore`;
  await client.request({
    url: `https://firebaserules.googleapis.com/v1/${releaseName}`,
    method: "PATCH",
    data: { release: { name: releaseName, rulesetName } },
  });
  console.log("Rules aktif di produksi:", PROJECT);
} finally {
  try {
    unlinkSync(KEY_PATH);
  } catch {}
}
