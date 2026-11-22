# Panduan Publish CodBer: dari nol sampai Google Play

Ditulis untuk pemakai yang bekerja hanya dari HP Android. Bila ada laptop atau warnet, beberapa langkah jadi lebih ringan dan saya tandai.
Harga, tampilan menu, dan kebijakan Google/Supabase/Expo bisa berubah. Bila layar di HP-mu beda dari tulisan di sini, ikuti nama menunya, bukan letaknya.

## 0. Gambaran besar

Urutannya tidak boleh dibalik, karena tiap tahap butuh hasil tahap sebelumnya:

1. Buat akun-akun yang dibutuhkan (Bagian 1)
2. Siapkan Supabase: database, OTP, admin pertama (Bagian 2)
3. Siapkan Google Maps (Bagian 3)
4. Taruh kode di GitHub (Bagian 4)
5. Build APK uji dan coba sendiri (Bagian 5)
6. Uji keamanan dan semua alur (Bagian 6)
7. Siapkan dokumen dan data Play Store (Bagian 7)
8. Tes tertutup 14 hari, lalu produksi (Bagian 8)
9. Uji coba terbatas di Jember sebelum dibuka luas (Bagian 9)

Perkiraan waktu: 3 sampai 5 minggu. Sebagian besar dihabiskan menunggu 14 hari tes tertutup Google, bukan menulis kode.

**Saran strategi:** rilis pertama hanya **COD**, tanpa QRIS. QRIS butuh penyedia pembayaran dengan dokumen usaha dan proses persetujuan. Aplikasi ini sudah mematikan QRIS secara bawaan (`qris_enabled = 0` di server, `EXPO_PUBLIC_QRIS_ENABLED=0` di aplikasi). Aktifkan nanti setelah penyedia siap.

## 1. Akun yang dibuat

Daftar semuanya dengan satu email khusus proyek, dan aktifkan verifikasi dua langkah (2FA) di tiap akun. Simpan password di pengelola password, jangan di catatan biasa.

| Akun | Fungsi | Biaya |
|---|---|---|
| GitHub | Menyimpan kode | Gratis (repo **private**) |
| Supabase | Database, login OTP, penyimpanan foto | Gratis untuk uji; untuk publik pertimbangkan paket berbayar (cadangan harian, tidak otomatis di-pause). Cek halaman harga |
| Expo (expo.dev) | Membangun APK/AAB | Ada kuota gratis; cek batasnya |
| Google Play Console | Menerbitkan aplikasi | Sekitar US$25 sekali bayar (cek di Play Console); butuh verifikasi identitas |
| Google Cloud | API key Google Maps | Perlu akun penagihan; pasang batas anggaran |
| Penyedia SMS (mis. Twilio) | Mengirim kode OTP | Bayar per SMS. Pasang batas pengeluaran |
| Penyedia QRIS (nanti) | Pembayaran QRIS | Tunda sampai rilis kedua |

Catatan akun Play: akun **personal** baru wajib tes tertutup 12 tester selama 14 hari (Bagian 8). Akun **organisasi** tidak kena aturan itu, tetapi butuh nomor D-U-N-S dan verifikasi yang bisa lebih lama.

## 2. Supabase

### 2.1 Buat proyek
1. supabase.com → New project. Pilih region **Singapore** (terdekat dengan Jember).
2. Buat password database yang kuat, simpan.
3. Buat **dua proyek** bila bisa: `codber-staging` untuk uji dan `codber-prod` untuk pengguna asli. Semua langkah di bawah diulang untuk masing-masing. Ini mencegah data uji bercampur dengan data asli.

### 2.2 Pasang database
1. Menu **SQL Editor** → New query.
2. Buka file `supabase/migrations/001_schema.sql`, salin seluruh isinya, tempel, tekan **Run**. Harus muncul "Success".
3. Ulangi untuk `002_security.sql`, lalu `003_rpc.sql`, lalu `supabase/seed.sql`. **Urutannya wajib.**
4. Bila ada error merah, jangan lanjut. Salin pesan errornya dan kirim ke saya.

### 2.3 Aktifkan login nomor HP
1. **Authentication → Sign In / Providers → Phone** → aktifkan.
2. Pilih penyedia SMS (Twilio paling umum), isi kredensialnya dari dashboard penyedia.
3. Di penyedia SMS, **batasi pengeluaran bulanan** dan, bila ada, batasi negara tujuan ke Indonesia. Ini mencegah penyalahgunaan yang menguras saldo.
4. Di pengaturan Auth, kecilkan batas SMS per jam dan aktifkan proteksi bot (CAPTCHA) bila tersedia.
5. Untuk uji tanpa biaya SMS, pakai fitur **nomor tes dan OTP tetap** (Test phone numbers) bila tersedia di menu Phone.

### 2.4 Ambil kunci untuk aplikasi
**Project Settings → API**: salin **Project URL** dan kunci **anon/publishable**.
- Kunci anon boleh ada di aplikasi.
- Kunci **service_role / secret tidak boleh** ditempel di aplikasi, GitHub, atau chat mana pun.

### 2.5 Pasang Edge Functions (lewat dashboard, tanpa laptop)
Untuk rilis COD-only, **lewati bagian ini dulu** kecuali ingin notifikasi push. Bila ingin push:
1. **Edge Functions → Deploy a new function → Via Editor**. Nama: `push-notify`. Tempel isi `supabase/functions/push-notify/index.ts`. Matikan **Verify JWT**. Deploy.
2. **Edge Functions → Secrets** → tambah `PUSH_WEBHOOK_SECRET` (isi teks acak panjang).
3. **Database → Webhooks → Create**: tabel `notifications`, event `INSERT`, tipe Edge Function `push-notify`, tambahkan header `x-webhook-secret` dengan nilai yang sama.
4. Fungsi `create-qris` dan `payment-webhook` dipasang dengan cara yang sama, **nanti** saat QRIS dikerjakan.

### 2.6 Jadikan dirimu admin
1. Pasang aplikasi (Bagian 5), login dengan nomormu sekali sampai masuk beranda.
2. SQL Editor, jalankan (ganti nomornya, format 62...):
```sql
insert into public.user_roles (user_id, role, approved_at)
select id, 'admin', now() from public.profiles where phone = '628123456789'
on conflict (user_id, role) do update set is_active = true;
```
3. Di aplikasi: Profil → Ganti mode → Admin.

Admin hanya bisa dibuat lewat SQL ini. Memang sengaja tidak ada tombolnya di aplikasi.

## 3. Google Maps
1. console.cloud.google.com → buat proyek → aktifkan **Maps SDK for Android**.
2. Buat API key. Di **Application restrictions** pilih Android apps, isi package `id.codber.app` dan **SHA-1** dari keystore build (Bagian 5.4). Di API restrictions pilih hanya Maps SDK for Android.
3. Pasang **budget alert** di Billing.
4. Tempel key di `app.json` pada `android.config.googleMaps.apiKey`.

Build Play Store ditandatangani ulang oleh Google, jadi nanti tambahkan juga SHA-1 dari menu **Play Console → Setup → App signing**. Tanpa ini peta kosong di versi Play Store.

## 4. Kode ke GitHub
1. github.com → New repository → nama `codber` → **Private**.
2. Karena dari HP, unggah lewat web tidak menjaga susunan folder. Cara yang jalan: pakai **Termux** (pasang dari F-Droid, bukan Play Store).
```bash
pkg update && pkg install git unzip nodejs
termux-setup-storage
git config --global user.name "Namamu"
git config --global user.email "emailmu@contoh.com"
git clone https://github.com/USERNAME/codber.git
cd codber
unzip -o ~/storage/downloads/codber.zip -d /tmp/cb
cp -r /tmp/cb/codber/. .
git add .
git commit -m "versi awal"
git push
```
3. Saat diminta password, pakai **Personal Access Token** (GitHub → Settings → Developer settings → Fine-grained tokens, izin Contents: Read and write, hanya repo ini).
4. Cek di GitHub bahwa **tidak ada** file `.env`. File itu sengaja diabaikan oleh `.gitignore`.

Setiap update kode: ganti file, lalu `git add . && git commit -m "pesan" && git push`.

## 5. Build APK uji

### 5.1 Buat proyek Expo
1. expo.dev → daftar → **Create a project**, nama `codber`. Salin **Project ID**.
2. Di `app.json`, isi `"extra": { "eas": { "projectId": "ID-DI-SINI" } }`.

### 5.2 Isi variabel lingkungan di Expo (penting)
Build berjalan di server Expo, bukan di GitHub, jadi rahasia di GitHub tidak ikut. Di expo.dev → proyek → **Environment variables**, buat untuk lingkungan `preview` dan `production`:

| Nama | Isi |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Kunci anon |
| `EXPO_PUBLIC_QRIS_ENABLED` | `0` |

Isi yang berawalan `EXPO_PUBLIC_` akan ikut tertanam di aplikasi. Karena itu **hanya** kunci publik yang boleh masuk sini.

### 5.3 Build pertama (harus interaktif)
Build pertama membuat **keystore** (kunci tanda tangan). Ini butuh jawaban interaktif, jadi jalankan di Termux:
```bash
npm install -g eas-cli
cd ~/codber
npm install
npx expo install --fix
eas login
eas build -p android --profile preview
```
Jawab **Yes** saat ditanya membuat keystore baru. Tunggu sampai selesai (bisa 15 sampai 40 menit), lalu buka link APK dari HP dan pasang.

### 5.4 Cadangkan keystore dan ambil SHA-1
Jalankan `eas credentials` → Android → lihat **SHA-1** untuk Google Maps (Bagian 3) dan unduh cadangan keystore. **Bila keystore hilang, update aplikasi bisa terkunci.** Simpan cadangan di dua tempat aman, di luar GitHub.

### 5.5 Build berikutnya dari GitHub
Setelah keystore ada: GitHub → Settings → Secrets → tambah `EXPO_TOKEN` (buat di expo.dev → Access tokens). Lalu tab **Actions → EAS Build → Run workflow** dan pilih `preview`.

## 6. Uji sebelum dibuka ke publik

Buat 4 akun uji (pakai nomor tes OTP): satu customer, satu merchant, satu driver, dan dirimu sebagai admin. Gunakan proyek **staging**.

### 6.1 Uji alur
- [ ] Customer: daftar OTP → isi nama → tambah alamat dengan peta
- [ ] Merchant: ajukan toko dengan foto → admin setujui → tambah 2 produk → buka toko
- [ ] Driver: ajukan dengan KTP, SIM, foto kendaraan → admin buka dokumen → setujui
- [ ] Customer: pesan COD → merchant terima, siapkan, siap diambil
- [ ] Admin: tugaskan driver → driver terima → ambil → antar → selesai
- [ ] Customer: lihat peta posisi driver, lalu beri bintang
- [ ] Cek laporan admin: komisi 10% dan bagi ongkir 80/20 sesuai contoh PRD (Rp30.000 + ongkir Rp5.000 → admin Rp4.000)
- [ ] Tolak pesanan, batalkan pesanan, driver menolak tugas: stok kembali dan status benar
- [ ] Matikan data seluler saat checkout lalu tekan berkali-kali: tidak boleh ada pesanan ganda
- [ ] Pesan dari alamat jauh di luar Jember: harus ditolak

### 6.2 Uji keamanan (wajib, ini inti "aman")
Pakai dua akun customer berbeda (A dan B):
- [ ] A tidak bisa melihat pesanan, alamat, atau notifikasi B
- [ ] Customer biasa membuka menu admin: tidak ada datanya, dan server menolak
- [ ] Merchant X tidak melihat pesanan merchant Y
- [ ] Driver hanya melihat tugas yang ditugaskan kepadanya
- [ ] Customer tidak bisa melihat lokasi driver setelah pesanan selesai
- [ ] Dokumen KTP/SIM tidak bisa dibuka lewat link publik; hanya admin, dengan link yang kedaluwarsa dalam 60 detik
- [ ] Di Supabase **Advisors** (Security), tidak ada peringatan merah soal RLS
- [ ] Cari di repo GitHub kata `service_role`: tidak boleh ada

Temuan apa pun di sini: **jangan rilis**. Kirim ke saya, kita perbaiki dulu.

## 7. Persiapan Play Store

### 7.1 Yang harus ada sebelum submit
- [ ] **Kebijakan privasi** di URL publik. Template ada di `KEBIJAKAN_PRIVASI_TEMPLATE.md`; isi, lalu publikasikan lewat GitHub Pages atau halaman web sederhana. Minta orang yang paham hukum memeriksanya, terutama soal UU Pelindungan Data Pribadi.
- [ ] **Syarat layanan** (aturan pesanan, pembatalan, refund)
- [ ] Formulir **Data safety** di Play Console. Isi jujur: nomor HP, nama, alamat, lokasi, foto, dokumen identitas driver, riwayat pesanan
- [ ] **Deklarasi izin lokasi** dengan penjelasan: lokasi dipakai menandai alamat dan, untuk driver, hanya saat mengantar
- [ ] Rating konten, target usia (jangan pilih anak-anak), kontak dukungan
- [ ] Ikon 512x512, gambar fitur 1024x500, minimal 2 tangkapan layar HP
- [ ] **Hapus akun**: Google Play mewajibkan aplikasi yang bisa membuat akun menyediakan cara menghapus akun, di dalam aplikasi dan lewat tautan web. **Fitur ini belum ada di kode.** Minta saya membuatnya sebelum submit.

### 7.2 Kategori Obat
Kategori Obat berisiko secara hukum dan kebijakan toko aplikasi. Untuk rilis awal, **nonaktifkan** dulu: Supabase → Table Editor → `categories` → ubah `is_active` untuk "Obat" menjadi `false`. Tanpa update aplikasi. Aktifkan kembali hanya setelah aturan penjualannya jelas.

### 7.3 Build untuk Play (AAB)
Play butuh format **AAB**, bukan APK. Profil `production` sudah diatur begitu:
```bash
eas build -p android --profile production
```
Unduh file `.aab` dari expo.dev. Unggahan **pertama** ke Play Console dilakukan manual lewat browser (buka dalam mode situs desktop).

## 8. Tes tertutup dan produksi

Berlaku untuk akun personal baru. Sumber: pusat bantuan Play Console.
1. Play Console → buat aplikasi → **Testing → Closed testing** → buat track dan unggah AAB.
2. Kumpulkan **minimal 12 tester** (beri tahu mereka alamat email Google-nya dimasukkan sebagai tester), dan semuanya harus **tetap ikut serta 14 hari berturut-turut**. Cari 15 sampai 20 orang supaya aman bila ada yang keluar.
3. Minta mereka benar-benar memakai aplikasinya dan memberi masukan. Jawaban pada formulir permohonan produksi nanti harus jelas dan jujur.
4. Setelah 14 hari, ajukan **Apply for production access**, jawab pertanyaan, lalu tunggu peninjauan.
5. Setelah disetujui, buat rilis produksi.

Jangan membeli jasa tester massal yang menawarkan "tester pasti lolos". Ini berisiko ditolak atau akunmu ditandai.

### Soal pemasangan APK langsung di Indonesia
Mulai 30 September 2026 Google mewajibkan aplikasi terdaftar oleh developer terverifikasi untuk terpasang di perangkat Android bersertifikasi di Indonesia. Aplikasi dari Play Store terdaftar otomatis. APK yang dibagikan lewat WhatsApp/link akan kena langkah tambahan bagi pengguna, kecuali kamu mendaftarkannya di Android Developer Console. **Untuk pengguna umum, lewat Play Store adalah jalur paling nyaman.** Cek halaman developer verification Android untuk aturan terbaru.

## 9. Uji coba terbatas, baru dibuka luas

Jangan buka ke seluruh Jember di hari pertama.
- **Minggu 1:** 2 sampai 3 toko yang kamu kenal, 3 sampai 5 driver, pesanan dari lingkaran terdekat. Kamu sendiri yang menugaskan driver.
- **Siapkan SOP kecil:** nomor WhatsApp dukungan, jam operasional, aturan bila driver tidak ada, pesanan dibatalkan, atau pelanggan tidak di rumah.
- **Pantau tiap hari:** Supabase (Logs dan Reports), pesanan yang macet di status tertentu, laporan harian admin.
- **Cocokkan uang setiap malam:** laporan admin vs uang tunai COD yang dipegang driver. Ledger tidak bisa diubah, jadi koreksi lewat catatan penyesuaian.
- Baru tambah toko dan driver setelah seminggu tanpa masalah besar.

## 10. Keamanan harian

- [ ] 2FA aktif di GitHub, Supabase, Expo, Google, penyedia SMS
- [ ] Repo GitHub private, tidak ada `.env` atau kunci di dalamnya
- [ ] Cadangan keystore tersimpan di dua tempat
- [ ] Batas pengeluaran SMS dan budget alert Google Maps aktif
- [ ] Cadangan database aktif (paket berbayar Supabase) dan kamu pernah mencoba memulihkannya
- [ ] Jangan pernah mengirim kunci rahasia lewat chat, termasuk ke saya

## 11. Cara update aplikasi

1. Ubah file di repo → push.
2. Naikkan build: `eas build -p android --profile production` (nomor versi naik otomatis).
3. Unggah AAB baru ke Play Console → rilis (mulai dari persentase kecil bila ada pilihan).
4. Perubahan **database** dilakukan terpisah: buat file migrasi baru (`004_...sql`), jalankan di staging dulu, baru di produksi.
5. Pembaruan instan tanpa build (EAS Update) **belum dipasang** di proyek ini. Tiap perubahan kode butuh build baru.

## 12. Hal yang masih kurang sebelum benar-benar publik

| Hal | Status |
|---|---|
| Hapus akun (wajib Play) | Belum ada, bisa saya buatkan |
| QRIS sungguhan | Tunda; saat ini mode uji dan dimatikan |
| Pelacakan driver saat aplikasi di latar belakang | Belum; hanya saat aplikasi terbuka |
| Produk populer di beranda | Belum |
| Ukuran APK maksimal 20 MB | Belum terukur; ukur dari build produksi |
| Pengujian otomatis RLS | Belum; uji manual di Bagian 6.2 |
| Kode belum pernah dijalankan di perangkat | Karena itu Bagian 5 dan 6 wajib dilakukan sebelum pengguna asli |
