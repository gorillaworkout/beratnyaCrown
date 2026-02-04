# BeratnyaCrown

Dashboard admin untuk mencatat berat athlete, membandingkan dengan berat sebelumnya, dan memberi hukuman bila tidak ada progres penurunan.

## Cara menjalankan

1. Install dependency:

```bash
npm install
```

2. Jalankan aplikasi:

```bash
npm run dev
```

3. Buka `http://localhost:3000`.

## Akses Admin

- Halaman publik: `http://localhost:3000/dashboard`
- Login admin: `http://localhost:3000/admin`
- Kredensial admin diambil dari environment variable:
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`

## Catatan

- Data athlete disimpan di Firestore.
- Tampilan dashboard bersifat publik (read-only).
- Perubahan data hanya melalui sesi admin.
