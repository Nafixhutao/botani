# File Upload Troubleshooting Guide

## Masalah: Gagal mengunggah file

### Langkah-langkah Troubleshooting:

#### 1. Periksa Console Browser
- Buka Developer Tools (F12)
- Lihat tab Console untuk error messages
- Perhatikan pesan error yang muncul saat upload

#### 2. Gunakan Debug Tool
- Klik tombol "🔧 Debug" di header chat
- Klik "Run Debug Tests" untuk memeriksa:
  - Bucket storage availability
  - File listing permissions
  - Upload permissions
  - Public URL generation
- Jika bucket tidak ada, klik "Create Bucket" untuk membuat bucket secara manual

#### 3. Periksa File yang Diupload
- **Ukuran file**: Maksimal 10MB
- **Tipe file**: Hanya file yang didukung:
  - Gambar: JPEG, JPG, PNG, GIF, WebP, BMP
  - Audio: WebM, MP3, WAV
  - Video: MP4, WebM
  - Dokumen: PDF, TXT

#### 4. Periksa Koneksi Internet
- Pastikan koneksi internet stabil
- Coba refresh halaman
- Periksa apakah ada firewall yang memblokir upload

#### 5. Periksa Supabase Configuration
- Pastikan bucket `chat-files` sudah dibuat
- Periksa storage policies
- Pastikan user sudah login

#### 6. Common Error Messages dan Solusi:

**Error: "new row violates row-level security policy"**
- Ini adalah masalah RLS (Row Level Security) policy
- Jalankan migration: `npx supabase db push`
- Atau klik tombol "Run Migration" di debug tool

**Error: "must be owner of table objects"**
- Ini adalah masalah permission di Supabase
- **Solusi 1**: Jalankan migration sederhana: `npx supabase db push`
- **Solusi 2**: Klik tombol "Fix RLS Policy" di debug tool
- **Solusi 3**: Buat bucket manual di Supabase Dashboard
- **Solusi 4**: Coba upload file, bucket akan dibuat otomatis

**Error: "Storage bucket tidak tersedia"**
- Bucket `chat-files` belum dibuat
- Jalankan migration: `npx supabase db push`
- Atau gunakan tombol "Create Bucket" di debug tool

**Error: "File terlalu besar"**
- Kompres file atau pilih file yang lebih kecil
- Maksimal ukuran: 10MB

**Error: "Tipe file tidak didukung"**
- Pilih file dengan format yang didukung
- Lihat daftar tipe file yang diizinkan di atas

**Error: "Gagal mengunggah file"**
- Periksa koneksi internet
- Coba upload file yang berbeda
- Periksa console untuk error details

#### 7. Testing Upload
1. Coba upload file kecil (1KB) terlebih dahulu
2. Jika berhasil, coba file yang lebih besar
3. Test dengan berbagai tipe file

#### 8. Reset dan Cleanup
Jika masih bermasalah:
1. Clear browser cache
2. Logout dan login kembali
3. Restart aplikasi

#### 9. Contact Support
Jika masalah masih berlanjut:
- Screenshot error message
- Catat langkah-langkah yang sudah dicoba
- Sertakan informasi browser dan OS

### Debug Information
Debug tool akan menampilkan informasi detail tentang:
- Bucket configuration
- Storage policies
- Upload permissions
- File access permissions

Gunakan informasi ini untuk mengidentifikasi masalah spesifik. 