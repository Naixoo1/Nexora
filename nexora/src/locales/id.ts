export const id = {
  // Navigation & Navbar
  'nav.canvas': 'Kanvas Logika',
  'nav.chat': 'Tanya AI',
  'nav.planner': 'Rencana Belajar',
  'nav.expo': 'Arena Tantangan',
  'nav.orientation': 'Orientasi',
  'nav.settings': 'Pengaturan',
  'nav.signIn': 'Masuk dengan Google',
  'nav.signOut': 'Keluar',

  // Canvas Workspace
  'canvas.title': 'Kanvas Derivasi STEM',
  'canvas.addNode': 'Tambah Node',
  'canvas.suggestBranch': 'Rekomendasi Cabang',
  'canvas.clear': 'Bersihkan Kanvas',
  'canvas.export': 'Ekspor',
  'canvas.syncTask': 'Jadikan Tugas',
  'canvas.variables': 'Variabel Dinamis',
  'canvas.evaluate': 'Validasi Langkah',
  'canvas.attachBranch': 'Pasang Cabang',
  'canvas.emptyPlaceholder': 'Mulai dengan menambahkan problem root atau rumus...',

  // Study Planner
  'planner.title': 'Generator Rencana Belajar AI',
  'planner.newPlan': 'Buat Rencana Baru',
  'planner.gradeLevel': 'Jenjang Pendidikan',
  'planner.deadline': 'Batas Waktu',
  'planner.targetGoal': 'Target Capaian',
  'planner.generate': 'Hasilkan Rencana',
  'planner.generating': 'Menyusun jadwal...',
  'planner.subject': 'Mata Pelajaran',
  'planner.description': 'Deskripsi Materi / Tugas',

  // Expo Challenge Arena
  'expo.title': 'Arena Tantangan Cerdas Nexora',
  'expo.start': 'Mulai Tantangan',
  'expo.speakMic': 'Bicara Jawaban',
  'expo.askHint': 'Minta Petunjuk',
  'expo.submit': 'Kirim Jawaban',
  'expo.next': 'Soal Berikutnya',
  'expo.score': 'Skor',
  'expo.streak': 'Runtunan',
  'expo.timeRemaining': 'Sisa Waktu',
  'expo.listening': 'Mendengarkan...',
  'expo.voiceNotSupported': 'Browser tidak mendukung rekaman suara',

  // Chat & Settings
  'chat.inputPlaceholder': 'Tanyakan soal, konsep, atau rumus matematika...',
  'chat.send': 'Kirim',
  'chat.newChat': 'Sesi Baru',
  'chat.settings': 'Setelan AI',
  'chat.history': 'Riwayat Percakapan',
  'chat.tutorMode': 'Mode Pengajaran',
  'chat.apiKey': 'Kunci API Kustom',
  'chat.saveSettings': 'Simpan Setelan',
};

export type TranslationKey = keyof typeof id;
export type TranslationDictionary = Record<TranslationKey, string>;
