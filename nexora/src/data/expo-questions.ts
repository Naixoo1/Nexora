import type { ExpoQuestion, ExpoGradeTier } from '@/types/expo';

export const EXPO_QUESTIONS_DATABASE: ExpoQuestion[] = [
  // ── PRIMARY (SD / SEKOLAH DASAR) ──────────────────────────
  {
    id: 'sd-math-01',
    gradeTier: 'PRIMARY',
    category: 'MATH',
    title: 'Apel Segar di Keranjang Bu Siti',
    storyScenario:
      'Bu Siti baru saja memanen apel dari kebunnya sebanyak 48 buah apel merah. Bu Siti ingin membagikan semua apel tersebut secara merata ke dalam 6 keranjang buah untuk dibagikan kepada tetangganya. Berapa banyak buah apel yang ada di dalam setiap keranjang?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['6 buah apel', '7 buah apel', '8 buah apel', '9 buah apel'],
    correctAnswer: '8 buah apel',
    acceptableAnswers: ['8', '8 buah', '8 apel', 'delapan'],
    hints: [
      'Operasi apa yang digunakan ketika membagi sejumlah benda sama banyak?',
      'Coba hitung: $48 \\div 6 = ?$',
    ],
    explanation:
      'Untuk membagi 48 apel secara merata ke dalam 6 keranjang, kita gunakan operasi pembagian:\n\n$$\n\\frac{48}{6} = 8\n$$\n\nJadi, masing-masing keranjang berisi 8 buah apel.',
    difficulty: 'EASY',
    points: 100,
    timeLimitSeconds: 60,
  },
  {
    id: 'sd-math-02',
    gradeTier: 'PRIMARY',
    category: 'MATH',
    title: 'Pagar Kebun Sayur Paman Budi',
    storyScenario:
      'Paman Budi memiliki kebun sayur berbentuk persegi panjang. Panjang kebun tersebut adalah 12 meter dan lebarnya adalah 8 meter. Paman Budi ingin memasang kawat pagar mengelilingi seluruh tepian kebun sayurnya. Berapa meter panjang kawat pagar yang dibutuhkan Paman Budi?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['20 meter', '40 meter', '96 meter', '48 meter'],
    correctAnswer: '40 meter',
    acceptableAnswers: ['40', '40 meter', '40 m', 'empat puluh'],
    hints: [
      'Keliling persegi panjang adalah jumlah seluruh panjang sisi-sisinya ($2 \\times (p + l)$).',
      'Tambahkan panjang dan lebar terlebih dahulu: $12 + 8 = 20$, lalu kalikan dua.',
    ],
    explanation:
      'Rumus keliling persegi panjang adalah:\n\n$$\nK = 2 \\times (p + l) = 2 \\times (12 + 8) = 2 \\times 20 = 40\\text{ meter}\n$$\n\nJadi, Paman Budi memerlukan 40 meter kawat pagar.',
    difficulty: 'MEDIUM',
    points: 120,
    timeLimitSeconds: 60,
  },
  {
    id: 'sd-math-03',
    gradeTier: 'PRIMARY',
    category: 'MATH',
    title: 'Belanja Buku & Pensil Warna Dika',
    storyScenario:
      'Dika membawa uang saku sebesar Rp 25.000 ke toko alat tulis. Dika membeli 2 buah buku tulis seharga Rp 5.000 per buku dan 1 kotak pensil warna seharga Rp 9.000. Berapa rupiah sisa uang saku Dika setelah berbelanja?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['Rp 5.000', 'Rp 6.000', 'Rp 7.000', 'Rp 8.000'],
    correctAnswer: 'Rp 6.000',
    acceptableAnswers: ['6000', '6.000', 'rp 6000', 'rp 6.000', 'enam ribu'],
    hints: [
      'Hitung total harga 2 buku tulis: $2 \\times 5.000 = ?$',
      'Jumlahkan dengan harga pensil warna: $10.000 + 9.000 = 19.000$, lalu kurangkan dari uang awal Rp 25.000.',
    ],
    explanation:
      'Total belanja Dika:\n\n- 2 buku tulis: $2 \\times 5.000 = \\text{Rp } 10.000$\n- 1 pensil warna: $\\text{Rp } 9.000$\n- Total = $\\text{Rp } 19.000$\n\nSisa uang Dika:\n\n$$\n25.000 - 19.000 = \\text{Rp } 6.000\n$$',
    difficulty: 'EASY',
    points: 100,
    timeLimitSeconds: 60,
  },
  {
    id: 'sd-gen-01',
    gradeTier: 'PRIMARY',
    category: 'GENERAL',
    title: 'Ibu Kota Nusantara (IKN)',
    storyScenario:
      'Indonesia sedang membangun Ibu Kota Negara baru yang bernama Ibu Kota Nusantara (IKN) sebagai pusat pemerintahan masa depan. Di provinsi manakah lokasi pembangunan IKN Nusantara berada?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: [
      'Kalimantan Barat',
      'Kalimantan Timur',
      'Kalimantan Selatan',
      'Kalimantan Tengah',
    ],
    correctAnswer: 'Kalimantan Timur',
    acceptableAnswers: ['kalimantan timur', 'kaltim'],
    hints: [
      'Provinsi ini memiliki kota besar seperti Balikpapan dan Samarinda.',
      'IKN terletak di sebagian wilayah Kabupaten Penajam Paser Utara dan Kutai Kartanegara.',
    ],
    explanation:
      'Ibu Kota Nusantara (IKN) berlokasi di Provinsi **Kalimantan Timur**, tepatnya di sebagian wilayah Kabupaten Penajam Paser Utara dan Kabupaten Kutai Kartanegara.',
    difficulty: 'EASY',
    points: 100,
    timeLimitSeconds: 45,
  },
  {
    id: 'sd-gen-02',
    gradeTier: 'PRIMARY',
    category: 'GENERAL',
    title: 'Siklus Terjadinya Hujan',
    storyScenario:
      'Pada siang hari yang terik, air laut dan sungai menguap menjadi uap air karena panas sinar matahari, lalu naik ke langit dan membentuk awan. Apa nama proses perubahan air menjadi uap air tersebut dalam siklus hidrologi?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['Evaporasi (Penguapan)', 'Kondensasi (Pengembunan)', 'Presipitasi (Hujan)', 'Infiltrasi (Penyerapan)'],
    correctAnswer: 'Evaporasi (Penguapan)',
    acceptableAnswers: ['evaporasi', 'penguapan'],
    hints: [
      'Kata kuncinya adalah zat cair yang berubah menjadi uap atau gas karena pemanasan matahari.',
      'Huruf awal dari proses ini adalah E.',
    ],
    explanation:
      '**Evaporasi** (penguapan) adalah proses saat air di permukaan bumi (danau, sungai, laut) berubah menjadi uap air akibat energi panas matahari.',
    difficulty: 'MEDIUM',
    points: 110,
    timeLimitSeconds: 45,
  },

  // ── JUNIOR HIGH (SMP / SEKOLAH MENENGAH PERTAMA) ───────────
  {
    id: 'smp-math-01',
    gradeTier: 'JUNIOR_HIGH',
    category: 'MATH',
    title: 'Skala Peta Ekspedisi Bandung - Cirebon',
    storyScenario:
      'Pada sebuah peta atlas Jawa Barat, jarak antara Kota Bandung dan Kota Cirebon tergambar sepanjang 5 cm. Jika jarak sebenarnya antara kedua kota tersebut adalah 130 km, berapakah skala yang digunakan pada peta atlas tersebut?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['1 : 260.000', '1 : 2.600.000', '1 : 26.000.000', '1 : 650.000'],
    correctAnswer: '1 : 2.600.000',
    acceptableAnswers: ['1:2600000', '1 : 2.600.000', '1:2.600.000', '2600000'],
    hints: [
      'Ubah terlebih dahulu satuan jarak sebenarnya dari kilometer (km) ke sentimeter (cm). $1\\text{ km} = 100.000\\text{ cm}$.',
      'Skala = $\\frac{\\text{Jarak pada peta}}{\\text{Jarak sebenarnya}} = \\frac{5\\text{ cm}}{13.000.000\\text{ cm}}$.',
    ],
    explanation:
      'Jarak sebenarnya = $130\\text{ km} = 130 \\times 100.000\\text{ cm} = 13.000.000\\text{ cm}$.\n\n$$\n\\text{Skala} = \\frac{5}{13.000.000} = \\frac{1}{2.600.000}\n$$\n\nJadi skala peta tersebut adalah **1 : 2.600.000**.',
    difficulty: 'MEDIUM',
    points: 120,
    timeLimitSeconds: 75,
  },
  {
    id: 'smp-math-02',
    gradeTier: 'JUNIOR_HIGH',
    category: 'MATH',
    title: 'Susunan Kursi Gedung Bioskop',
    storyScenario:
      'Di dalam sebuah aula bioskop sekolah, baris paling depan (baris pertama) memiliki 14 kursi. Setiap baris di belakangnya selalu memuat 3 kursi lebih banyak dari baris di depannya. Berapakah jumlah kursi yang ada pada baris ke-15?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['52 kursi', '56 kursi', '59 kursi', '62 kursi'],
    correctAnswer: '56 kursi',
    acceptableAnswers: ['56', '56 kursi', 'lima puluh enam'],
    hints: [
      'Gunakan rumus suku ke-$n$ barisan aritmatika: $U_n = a + (n - 1)b$.',
      'Diketahui suku pertama $a = 14$, beda $b = 3$, dan $n = 15$.',
    ],
    explanation:
      'Barisan aritmatika dengan $a = 14$ dan $b = 3$:\n\n$$\nU_{15} = a + (15 - 1)b = 14 + 14(3) = 14 + 42 = 56\\text{ kursi}\n$$\n\nJadi, pada baris ke-15 terdapat **56 kursi**.',
    difficulty: 'MEDIUM',
    points: 130,
    timeLimitSeconds: 75,
  },
  {
    id: 'smp-math-03',
    gradeTier: 'JUNIOR_HIGH',
    category: 'MATH',
    title: 'Tali Kawat Tiang Bendera',
    storyScenario:
      'Sebuah tiang bendera setinggi 12 meter berdiri tegak di lapangan sekolah. Dari puncak tiang bendera, dipasang kawat penahan lurus menuju patok di tanah yang berjarak 5 meter dari pangkal bawah tiang bendera. Berapakah panjang kawat penahan tersebut?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['13 meter', '15 meter', '17 meter', '14 meter'],
    correctAnswer: '13 meter',
    acceptableAnswers: ['13', '13 meter', '13 m', 'tiga belas'],
    hints: [
      'Gunakan Teorema Pythagoras untuk segitiga siku-siku: $c^2 = a^2 + b^2$.',
      'Hitung: $12^2 + 5^2 = 144 + 25 = 169$. Berapakah $\\sqrt{169}$?',
    ],
    explanation:
      'Berdasarkan Teorema Pythagoras:\n\n$$\nc = \\sqrt{a^2 + b^2} = \\sqrt{12^2 + 5^2} = \\sqrt{144 + 25} = \\sqrt{169} = 13\\text{ meter}\n$$\n\nJadi panjang kawat penahan adalah **13 meter** (Tripel Pythagoras 5-12-13).',
    difficulty: 'EASY',
    points: 110,
    timeLimitSeconds: 60,
  },
  {
    id: 'smp-gen-01',
    gradeTier: 'JUNIOR_HIGH',
    category: 'GENERAL',
    title: 'Peristiwa Bersejarah Rengasdengklok',
    storyScenario:
      'Pada tanggal 16 Agustus 1945 dini hari, golongan muda (antara lain Sukarni, Wikana, dan Chaerul Saleh) membawa Ir. Soekarno dan Drs. Mohammad Hatta ke Rengasdengklok, Karawang. Apa tujuan utama dari tindakan para pemuda tersebut?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: [
      'Menjauhkan Soekarno-Hatta dari pengaruh militer Jepang agar proklamasi segera diumumkan',
      'Menyusun naskah teks proklamasi bersama tentara Sekutu',
      'Melindungi Soekarno-Hatta dari serangan tentara Belanda',
      'Membentuk struktur kabinet menteri pertama Republik Indonesia',
    ],
    correctAnswer:
      'Menjauhkan Soekarno-Hatta dari pengaruh militer Jepang agar proklamasi segera diumumkan',
    acceptableAnswers: ['menjauhkan soekarno-hatta dari pengaruh militer jepang', 'A', 'opsi a'],
    hints: [
      'Golongan pemuda ingin proklamasi kemerdekaan adalah murni hasil perjuangan bangsa Indonesia, bukan hadiah dari Jepang.',
    ],
    explanation:
      'Peristiwa Rengasdengklok bertujuan mengamankan Soekarno dan Hatta dari pengaruh penguasa militer Jepang agar proklamasi kemerdekaan Republik Indonesia dapat segera dilaksanakan secara berdaulat tanpa campur tangan asing.',
    difficulty: 'MEDIUM',
    points: 120,
    timeLimitSeconds: 60,
  },
  {
    id: 'smp-gen-02',
    gradeTier: 'JUNIOR_HIGH',
    category: 'GENERAL',
    title: 'Transportasi Oksigen dalam Darah',
    storyScenario:
      'Dalam sistem peredaran darah manusia, sel darah merah (eritrosit) memiliki protein khusus yang mengikat oksigen dari paru-paru untuk diedarkan ke seluruh jaringan tubuh. Protein pengikat oksigen yang mengandung zat besi tersebut dinamakan...',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['Hemoglobin', 'Albumin', 'Fibrinogen', 'Miosin'],
    correctAnswer: 'Hemoglobin',
    acceptableAnswers: ['hemoglobin', 'hb'],
    hints: [
      'Protein ini juga yang memberikan pigmen warna merah khas pada darah.',
      'Sering disingkat dengan dua huruf: Hb.',
    ],
    explanation:
      '**Hemoglobin** adalah metaloprotein pengikat oksigen yang mengandung zat besi dalam sel darah merah, berfungsi mengangkut $O_2$ dari organ pernapasan ke seluruh jaringan tubuh.',
    difficulty: 'EASY',
    points: 100,
    timeLimitSeconds: 45,
  },

  // ── SENIOR HIGH (SMA / SMK / UTBK / UNIVERSITY) ────────────
  {
    id: 'sma-math-01',
    gradeTier: 'SENIOR_HIGH',
    category: 'MATH',
    title: 'Pantulan Bola Tenis & Deret Geometri Tak Hingga',
    storyScenario:
      'Sebuah bola tenis dijatuhkan vertikal dari ketinggian awal 10 meter. Setiap kali memantul ke lantai, bola tersebut mencapai ketinggian $\\frac{3}{4}$ dari tinggi pantulan sebelumnya. Berapakah total panjang lintasan yang ditempuh oleh bola tersebut sampai akhirnya berhenti bergerak?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['40 meter', '50 meter', '70 meter', '80 meter'],
    correctAnswer: '70 meter',
    acceptableAnswers: ['70', '70 meter', '70m', 'tujuh puluh'],
    hints: [
      'Perhatikan bahwa bola bergerak turun dan naik! Lintasan total = Tinggi awal + $2 \\times S_\\infty$ (pantulan naik-turun).',
      'Atau gunakan rumus cepat: $S = h \\times \\frac{b + a}{b - a}$ dengan rasio $r = \\frac{a}{b} = \\frac{3}{4}$ dan tinggi $h = 10$.',
    ],
    explanation:
      'Menggunakan formula lintasan pantulan bola deret geometri tak hingga:\n\n$$\nS_{\\text{total}} = h \\times \\frac{b + a}{b - a} = 10 \\times \\frac{4 + 3}{4 - 3} = 10 \\times \\frac{7}{1} = 70\\text{ meter}\n$$\n\nTotal panjang lintasan bola hingga berhenti adalah **70 meter**.',
    difficulty: 'HARD',
    points: 150,
    timeLimitSeconds: 90,
  },
  {
    id: 'sma-math-02',
    gradeTier: 'SENIOR_HIGH',
    category: 'MATH',
    title: 'Optimasi Luas Lahan Kandang Ternak',
    storyScenario:
      'Seorang peternak memiliki kawat pagar sepanjang 60 meter. Peternak tersebut ingin memagari sebidang tanah berbentuk persegi panjang yang salah satu sisinya menempel pada tembok dinding batu (sehingga sisi tersebut tidak perlu dipagari kawat). Berapakah luas lahan maksimum yang dapat dipagari oleh peternak tersebut?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['300 m²', '450 m²', '600 m²', '900 m²'],
    correctAnswer: '450 m²',
    acceptableAnswers: ['450', '450 m2', '450 m²', '450 meter persegi'],
    hints: [
      'Karena 1 sisi menempel dinding, panjang kawat adalah $2x + y = 60 \\implies y = 60 - 2x$.',
      'Fungsi luas $L(x) = x \\cdot y = x(60 - 2x) = 60x - 2x^2$. Cari titik stasioner turunan pertama $L\'(x) = 0$.',
    ],
    explanation:
      'Panjang kawat: $2x + y = 60 \\implies y = 60 - 2x$.\n\nFungsi Luas: $L(x) = 60x - 2x^2$.\n\nTurunan pertama untuk luas maksimum:\n\n$$\nL\'(x) = 60 - 4x = 0 \\implies x = 15\\text{ m}\n$$\n\nMaka $y = 60 - 2(15) = 30\\text{ m}$.\n\nLuas maksimum:\n\n$$\nL_{\\text{maks}} = 15 \\times 30 = 450\\text{ m}^2\n$$',
    difficulty: 'HARD',
    points: 160,
    timeLimitSeconds: 90,
  },
  {
    id: 'sma-math-03',
    gradeTier: 'SENIOR_HIGH',
    category: 'MATH',
    title: 'Kombinatorika Delegasi Tim Cerdas Cermat',
    storyScenario:
      'Dari 6 siswa laki-laki dan 4 siswa perempuan yang berprestasi, akan dipilih 3 orang siswa sebagai perwakilan delegasi sekolah dalam lomba cerdas cermat nasional. Jika disyaratkan delegasi tersebut harus terdiri dari **minimal 2 siswa laki-laki**, ada berapa banyak cara pemilihan delegasi yang mungkin?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['60 cara', '70 cara', '80 cara', '90 cara'],
    correctAnswer: '80 cara',
    acceptableAnswers: ['80', '80 cara', 'delapan puluh'],
    hints: [
      'Kasus 1: 2 Laki-laki dan 1 Perempuan $\\implies \\binom{6}{2} \\times \\binom{4}{1}$.',
      'Kasus 2: 3 Laki-laki dan 0 Perempuan $\\implies \\binom{6}{3} \\times \\binom{4}{0}$.',
      'Jumlahkan hasil Kasus 1 dan Kasus 2.',
    ],
    explanation:
      'Ada 2 kasus pemilihan:\n\n1. **2 Laki-laki & 1 Perempuan:**\n$$\\binom{6}{2} \\times \\binom{4}{1} = \\frac{6 \\times 5}{2} \\times 4 = 15 \\times 4 = 60$$\n\n2. **3 Laki-laki & 0 Perempuan:**\n$$\\binom{6}{3} \\times \\binom{4}{0} = \\frac{6 \\times 5 \\times 4}{6} \\times 1 = 20$$\n\nTotal cara pemilihan:\n\n$$\n60 + 20 = 80\\text{ cara}\n$$',
    difficulty: 'HARD',
    points: 150,
    timeLimitSeconds: 90,
  },
  {
    id: 'sma-gen-01',
    gradeTier: 'SENIOR_HIGH',
    category: 'GENERAL',
    title: 'Reaksi Gelap Fotosintesis (Siklus Calvin)',
    storyScenario:
      'Dalam proses fotosintesis tumbuhan, fiksasi karbon dioksida ($CO_2$) atmosfer ke dalam senyawa organik Ribulosa 1,5-bisfosfat (RuBP) dikatalisis oleh enzim yang paling melimpah di muka bumi. Apa nama enzim tersebut?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: ['RuBisCO', 'ATP Synthase', 'DNA Polimerase', 'Amilase'],
    correctAnswer: 'RuBisCO',
    acceptableAnswers: ['rubisco', 'rubp karboksilase'],
    hints: [
      'Nama lengkapnya adalah Ribulose-1,5-bisphosphate carboxylase-oxygenase.',
      'Enzim ini beroperasi pada stroma kloroplas selama Siklus Calvin.',
    ],
    explanation:
      '**RuBisCO** (Ribulose-1,5-bisphosphate carboxylase/oxygenase) adalah enzim utama dalam Siklus Calvin yang memfiksasi $CO_2$ anorganik menjadi molekul organik berenergi.',
    difficulty: 'MEDIUM',
    points: 130,
    timeLimitSeconds: 60,
  },
  {
    id: 'sma-gen-02',
    gradeTier: 'SENIOR_HIGH',
    category: 'GENERAL',
    title: 'Kebijakan Moneter & Pengendalian Inflasi',
    storyScenario:
      'Ketika laju inflasi suatu negara meningkat tajam melampaui target stabilitas harga, bank sentral (seperti Bank Indonesia) biasanya menerapkan kebijakan moneter kontraktif. Langkah utama apakah yang paling umum diambil oleh bank sentral untuk meredam inflasi tersebut?',
    targetAnswerType: 'MULTIPLE_CHOICE',
    options: [
      'Menaikkan suku bunga acuan (BI-Rate) untuk memperlambat laju peredaran uang',
      'Menurunkan tingkat Giro Wajib Minimum (GWM) perbankan komersial',
      'Membeli surat berharga pemerintah secara masif di pasar terbuka',
      'Mencetak uang kertas baru dalam jumlah besar',
    ],
    correctAnswer:
      'Menaikkan suku bunga acuan (BI-Rate) untuk memperlambat laju peredaran uang',
    acceptableAnswers: ['menaikkan suku bunga', 'A', 'opsi a'],
    hints: [
      'Suku bunga yang lebih tinggi mendorong masyarakat untuk menabung dan menekan permintaan agregat.',
    ],
    explanation:
      'Untuk mengendalikan inflasi, bank sentral **menaikkan suku bunga acuan** (BI-Rate). Kenaikan ini meningkatkan bunga pinjaman dan tabungan, sehingga menekan konsumsi berlebih dan memperlambat peredaran jumlah uang.',
    difficulty: 'MEDIUM',
    points: 120,
    timeLimitSeconds: 60,
  },
];

/**
 * Returns filtered questions for a specific grade tier.
 */
export function getQuestionsByGradeTier(gradeTier: ExpoGradeTier): ExpoQuestion[] {
  return EXPO_QUESTIONS_DATABASE.filter((q) => q.gradeTier === gradeTier);
}
