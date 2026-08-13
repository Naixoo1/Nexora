# PRD: Nexora
## Problem Statement
Banyak siswa SMA maupun mahasiswa kesulitan mengerjakan tugas/projek dan persiapan ujian yang matang tanpa bantuan les/bimbel. Jika menggunakkan AI untuk tugas sekolah, terkadang hasilnya tidak sesuai dengan apa yang diharapkan, terkadang AI terlalu kaku dan tidak sesuai dengan apa yang di harapkan guru, selain itu AI juga tidak memberikan konteks yang sesuai/relevan dengan pertanyaan yang di prompt user. Oleh sebab itu dibuatlah aplikasi ini yang diharapkan dapat membantu siswa SMA dan mahasiswa dalam mengerjakan tugas/projek dan persiapan ujian yang matang.
## Goals
- Memudahkan siswa SMA maupun mahasiswa dalam mengerjakan tugas/projek dan persiapan ujian yang matang.
- 80% pengguna dapat menjadi architect sehingga AI dapat memberikan hasil yang sesuai dengan konteks yang diberikan pengguna.
- Waktu belajar siswa SMA dan mahasiswa dapat dihemat dengan menggunakan aplikasi ini.
- Automasi pekerjaan yang diulangi dalam waktu yang lama seperti pembuatan karya tulis ilmiah menjadi lebih singkat karena AI mencarikan hal-hal yang relevan serta terstruktur sesuai dengan kebutuhan pengguna.
## Target Users
- End user: Siswa SMA dan mahasiswa.
- Admin/stakeholder: Tim ADM dari Yosuka (Alvaro, Danish, Marcelo)
- AI/dev: Alvaro + Antigravity CLI (Claude OPUS 4.6 & Gemini Flash 3.6 High-Bandwidth).
## User Stories
- Sebagai siswa kelas 12 SMA yang sedang bersiap masuk perguruan tinggi, saya ingin mengerjakan latihan soal try out dengan waktu mundur (timer), agar saya terbiasa mengelola waktu pengerjaan saat ujian masuk PTN yang sebenarnya.
- Sebagai mahasiswa STEM, saya ingin mengunggah slide atau paper algoritma supaya dokumen statis tersebut diubah menjadi logic tree interaktif. Pengguna dapat mengklik/memperluas (expand) tiap langkah penurunan, menguji asumsi variabel, serta mensimulasikan skenario "What if this variable changes?".
- Sebagai mahasiswa semester akhir, saya ingin upload tesis/skripsi lalu sistem mengekstrak kerangka bab, mengidentifikasi gap literatur, hingga menyusun rancangan metodologi. AI harus mampu menyarankan judul alternatif yang lebih relevan berdasarkan tren riset terkini. 
## Functional Requirements
- CRUD tugas
- Progress Tracker (saat brainstorming dengan AI, akan muncul target beserta progres yang akan dilihat seberapa besar progresnya saat user ingin membatalkan atau lanjut)
- AI Memory (Mengingat output yang sudah pernah dibuat/dihasilkan dengan ai sebelumnya.)
- Calculator & Solver (Bukan calculator biasa yang hanya menunjukkan jawaban, tetapi menjelaskan step by step pengerjaan.)
- AI Planner (Merencanakan jadwal belajar yang detail sesuai dengan apa yang dibutuhkan dan di inginkan pengguna dalam bentuk tugas/projek.)
- Conversation Practice (Melatih conversation dengan ai dalam berbagai bahasa yang tujuanya melatih conversation dengan ai dalam berbagai bahasa yang di inginkan pengguna untuk berbagai tujuan.)
- AI Coach (Memberikan saran yang sesuai dengan apa yang dibutuhkan dan di inginkan pengguna).
## Non-Functional Requirements
- Performa: load 1000 user, waktu prapemrosesan dokumen / pembuatan logic tree paling lama 3 menit, waktu evaluasi pengerjaan langkah demi langkah < 2 detik. Serta dapat berjalan di koneksi internet yang kecil (misal 4G / modem).
- Security: 
    - Enkripsi dokumen pengguna saat penyimpanan (at rest)
    - Enkripsi komunikasi antara client dan server (in transit)
    - Otentikasi dan otorisasi yang kuat (OAuth 2.0)
    - Rate limiting untuk mencegah penyalahgunaan
    - Input validation untuk mencegah injection attacks
    - Halaman login aman dengan login melalui Google Account
    - Reset password dengan verifikasi email
    - Auto-logout setelah periode tidak aktif
- Reliability: Uptime 99.5%,, response time dibawah 1s, handle 1000 concurrent user
## Scope
- In scope: 
    - Upload dokumen (pdf/docx)
    - Buat tugas
    - Logic tree
    - Conversation practice
    - AI coach
    - Chat dengan ai (Chatbot interface)
    - AI Planner (Merencanakan jadwal belajar yang detail sesuai dengan apa yang dibutuhkan dan di inginkan pengguna dalam bentuk tugas/projek.)
- Out of scope: 
    - Penjadwalan otomatis yang terintegrasi dengan kalender eksternal
    - Analisis sentimen mendalam pada input pengguna
    - Multi-bahasa untuk antarmuka (saat MVP fokus pada Bahasa Indonesia)
    - Mode kolaborasi real-time antar mahasiswa/siswa dalam satu logic tree
    - Integrasi ke LMS universitas (Canvas, Google Classroom).
    - Mode Offline / penggunaan lokal
    - Sistem reputasi/poin untuk pengguna (gamifikasi)
    - Integrasi marketplace template logic tree
Catatan: PRD = living doc, update berkala.