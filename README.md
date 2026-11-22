# CodBer · Delivery Jember

Aplikasi Android (Expo + React Native + TypeScript) dengan backend Supabase. Satu aplikasi, empat role: Customer, Driver, Merchant, Admin. Dibangun dari `PRD_CodBer.md` v1.0.

## Isi proyek

| Folder | Isi |
|---|---|
| `app/` | Layar (Expo Router): `(auth)`, `(tabs)` customer, `customer/`, `driver/`, `merchant/`, `admin/`, `settings/` |
| `src/` | `components/` UI bersama, `stores/` (auth, cart, tracking), `hooks/`, `services/`, `lib/`, `utils/`, `constants/theme.ts` |
| `supabase/migrations/` | `001_schema` (19 tabel PRD + tambahan), `002_security` (RLS, trigger, storage, realtime), `003_rpc` (checkout, status, ledger, laporan) |
| `supabase/functions/` | `create-qris`, `payment-webhook` (verifikasi signature), `push-notify` |
| `supabase/seed.sql` | Kategori, zona 1-3, komisi 10%, bagi ongkir 80/20 |

> **Mulai dari `PANDUAN_PUBLISH.md`.** Itu panduan lengkap dari nol sampai Google Play. Bagian di bawah hanya ringkasan teknis.

## Langkah menjalankan

1. **Supabase**: buat proyek. Di SQL Editor jalankan berurutan `001_schema.sql`, `002_security.sql`, `003_rpc.sql`, lalu `seed.sql`.
2. **OTP**: Authentication → Providers → Phone → aktifkan dan hubungkan penyedia SMS (Twilio/MessageBird/Vonage). Tanpa ini OTP tidak terkirim.
3. **Admin pertama**: login sekali dengan nomormu, lalu jalankan query di bagian bawah `seed.sql` (ganti nomor). Admin tidak bisa dibuat dari aplikasi.
4. **Env**: salin `.env.example` menjadi `.env`, isi URL dan anon key. Jangan pernah memasukkan `service_role` ke aplikasi.
5. **Google Maps**: isi API key Android di `app.json` (`android.config.googleMaps.apiKey`), batasi key ke package `id.codber.app`.
6. **Edge Functions** (perlu Supabase CLI): `supabase functions deploy create-qris payment-webhook push-notify`, lalu `supabase secrets set --env-file supabase/.env`. Untuk push, buat Database Webhook INSERT pada `notifications` ke `push-notify` dengan header `x-webhook-secret`.
7. **Build**: `npm install`, `npx expo install --fix`, isi `extra.eas.projectId`, isi variabel `EXPO_PUBLIC_*` di expo.dev (bukan di GitHub), lalu `eas build -p android --profile preview`. Build pertama harus interaktif untuk membuat keystore. Detail di `PANDUAN_PUBLISH.md`.

## Cakupan PRD

| PRD | Status |
|---|---|
| OTP, sesi SecureStore, profil | Ada |
| Alamat + peta, beranda, cari, toko, produk, keranjang satu-toko | Ada |
| Checkout COD/QRIS, total dihitung server, idempotency key | Ada |
| 13 status pesanan, riwayat status, transisi hanya lewat RPC | Ada |
| Pengajuan Driver/Merchant, review admin, dokumen privat + signed URL 60 detik | Ada |
| Penugasan driver oleh admin, terima/tolak, ganti driver | Ada |
| Lokasi driver hanya saat pengantaran aktif, customer hanya lihat driver pesanannya | Ada (foreground) |
| Zona & ongkir (admin), komisi 10%, ongkir 80/20, ledger append-only | Ada |
| Laporan admin/merchant/driver, audit log, penilaian | Ada |
| Notifikasi dalam aplikasi + push | Ada (butuh langkah 6) |

## Keputusan yang saya ambil (PRD bagian 24 masih terbuka)

- **Zona**: ditentukan server dari jarak lurus toko ke alamat (`rules.max_km`). Di luar zona = pesanan ditolak (`out_of_area`).
- **Konfirmasi selesai**: driver menekan "sudah diantar". COD dianggap lunas saat itu.
- **QRIS**: dimatikan secara bawaan (`qris_enabled=0` di server dan `EXPO_PUBLIC_QRIS_ENABLED=0` di aplikasi). Penyedia belum dipilih. `create-qris` memakai mode `mock`; sambungkan penyedia di fungsi `createCharge`. Status pembayaran hanya berubah lewat `payment-webhook` yang diverifikasi HMAC-SHA256 (sesuaikan nama header dengan penyedia).
- **Batal**: customer bisa sebelum toko menerima; sesudahnya hanya admin. QRIS yang sudah dibayar lalu batal ditandai `refund_required` untuk diproses manual lewat penyedia.
- **Stok** dikurangi saat pesanan dibuat dan dikembalikan bila ditolak/batal/gagal.

## Belum ada / perlu diputuskan

- "Produk populer" di beranda belum ada karena butuh agregat penjualan. Saat ini daftar toko terdekat saja.
- Pelacakan lokasi hanya saat aplikasi terbuka. Pelacakan latar belakang butuh foreground service dan izin tambahan.
- Tampilan QRIS memakai `qr_image_url` dari penyedia. Bila penyedia hanya memberi string QR, tambahkan pustaka pembuat QR.
- Pencairan, pajak, biaya payment gateway, refund otomatis, kebijakan privasi/syarat layanan, retensi data: belum ditetapkan.
- Kadaluarsa QRIS otomatis butuh `pg_cron` atau webhook `expired` dari penyedia (sudah ditangani `mark_payment_failed`).
- **Ukuran ≤20 MB belum bisa dibuktikan** dari lingkungan ini. Ukur APK arm64 hasil `production` (build ke-1 biasanya perlu audit dependensi, terutama `react-native-maps`).

## Kontrak desain (anti-ui-slop)

- Warna dari logo: hijau tua `#0B3D12`, hijau tombol `#1B7F14` (kontras 5,3:1 dengan teks putih), oranye `#F26A00/#D94F00` untuk harga dan status, merah pin `#C62020` hanya untuk bahaya.
- Font sistem (tanpa aset font), ikon Ionicons, tanpa gambar bundel selain logo (±54 KB).
- Tombol ≥48 px, satu aksi utama per layar, harga selalu `Rp` + titik ribuan.
- Tiap layar data punya state: memuat, kosong, galat + coba lagi, dan banner offline.
- Konten mengikuti PRD (tanpa metrik, ulasan, atau promo rekaan).

## Status pengujian

Kode lolos pemeriksaan sintaks TypeScript. **Belum dijalankan**: lingkungan pembuatan tidak punya jaringan, jadi `npm install`, type-check penuh, SQL terhadap Postgres sungguhan, dan uji perangkat belum dilakukan. Jalankan `npm run typecheck` setelah `npm install` dan uji RLS per role sebelum dipakai publik (PRD bagian 14 dan 20).
