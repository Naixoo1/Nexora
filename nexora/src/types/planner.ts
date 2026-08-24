/**
 * Curriculum Taxonomy & Grade-Level Types for Nexora AI Study Planner.
 * Supports Indonesian National Curriculum (Kurikulum Merdeka / K13) and general multidisciplinary studies.
 */

export type GradeLevel = 'PRIMARY' | 'JUNIOR_HIGH' | 'SENIOR_HIGH';

export type SubjectCategory =
  | 'LANGUAGE_LITERATURE'
  | 'SOCIAL_HUMANITIES'
  | 'STEM_ANALYTICAL'
  | 'GENERAL_PROJECT';

export interface SubjectTaxonomyEntry {
  id: string;
  name: string;
  category: SubjectCategory;
  gradeLevels: GradeLevel[];
  keywords: string[];
  forbiddenKeywords?: string[];
  defaultFocusAreas: string[];
}

export interface StudyContextClassification {
  subject: string;
  subjectCategory: SubjectCategory;
  gradeLevel: GradeLevel;
  confidenceScore: number;
  detectedKeywords: string[];
  suggestedFocusAreas: string[];
  forbidMathFormulas: boolean;
}

export interface PlannerGeneratePayload {
  prompt: string;
  dueDate?: string; // Full ISO 8601 string: YYYY-MM-DDTHH:mm:ss.sssZ
  category?: string;
  gradeLevel?: GradeLevel;
  maxTasks?: number;
}

/**
 * Standard Indonesian High School & Multidisciplinary Subject Taxonomy Matrix.
 */
export const CURRICULUM_TAXONOMY: SubjectTaxonomyEntry[] = [
  // 1. LANGUAGE & LITERATURE
  {
    id: 'indonesian_language',
    name: 'Bahasa Indonesia',
    category: 'LANGUAGE_LITERATURE',
    gradeLevels: ['PRIMARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'bahasa indonesia',
      'teks eksposisi',
      'teks anekdot',
      'teks negosiasi',
      'cerpen',
      'puisi',
      'resensi',
      'makalah',
      'pidato',
      'tata bahasa',
      'ejaan',
      'novel',
      'karya ilmiah',
    ],
    defaultFocusAreas: [
      'Analisis struktur teks dan kaidah kebahasaan',
      'Penyusunan kerangka karangan & draf naskah',
      'Latihan artikulasi, intonasi, & gaya penyampaian',
      'Penyuntingan ejaan dan penyempurnaan karya',
    ],
  },
  {
    id: 'sundanese_language',
    name: 'Bahasa Sunda',
    category: 'LANGUAGE_LITERATURE',
    gradeLevels: ['PRIMARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'bahasa sunda',
      'basa sunda',
      'sunda',
      'drama sunda',
      'drama basa sunda',
      'paguneman',
      'carpon',
      'sisindiran',
      'guguritan',
      'wawacan',
      'warta sunda',
      'undak usuk basa',
      'sajak sunda',
    ],
    defaultFocusAreas: [
      'Pangaweruh undak usuk basa jeung tatakrama',
      'Nulis naskah dialog / paguneman & drama',
      'Latihan olah vokal, rengkuh, jeung peta pintonan',
      'Gladikotor jeung pintonan pungkasan',
    ],
  },
  {
    id: 'english_language',
    name: 'English (Bahasa Inggris)',
    category: 'LANGUAGE_LITERATURE',
    gradeLevels: ['PRIMARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'english',
      'bahasa inggris',
      'dialogue',
      'conversation',
      'grammar',
      'reading comprehension',
      'speech',
      'narrative text',
      'descriptive text',
      'recount text',
      'presentation',
      'speaking drill',
      'pronunciation',
    ],
    defaultFocusAreas: [
      'Key vocabulary acquisition & grammatical structures',
      'Dialogue drafting & script refinement',
      'Pronunciation, stress, and intonation drills',
      'Roleplay simulation & final presentation delivery',
    ],
  },
  {
    id: 'advanced_english',
    name: 'Advanced English (Bahasa Inggris Tingkat Lanjut)',
    category: 'LANGUAGE_LITERATURE',
    gradeLevels: ['SENIOR_HIGH'],
    keywords: [
      'advanced english',
      'inggris tingkat lanjut',
      'academic writing',
      'critical reading',
      'parliamentary debate',
      'essay argument',
      'literary analysis',
      'toefl',
      'ielts',
    ],
    defaultFocusAreas: [
      'Thesis statement formulation & academic outlining',
      'Rhetorical analysis & evidence synthesis',
      'Debate argumentation & rebuttal drafting',
      'Peer review, vocabulary elevation, and formal delivery',
    ],
  },

  // 2. SOCIAL & HUMANITIES
  {
    id: 'history',
    name: 'Sejarah & Sejarah Indonesia',
    category: 'SOCIAL_HUMANITIES',
    gradeLevels: ['JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'sejarah',
      'history',
      'sejarah indonesia',
      'peradaban',
      'proklamasi',
      'orde baru',
      'orde lama',
      'reformasi',
      'kerajaan nusantara',
      'perang dunia',
      'kolonialisme',
      'timeline sejarah',
      'kronologi',
    ],
    defaultFocusAreas: [
      'Penyusunan linimasa kronologis peristiwa penting',
      'Analisis hubungan sebab-akibat (kausalitas sejarah)',
      'Kajian sumber primer/sekunder & tokoh kunci',
      'Sintesis komparatif & ringkasan esai reflektif',
    ],
  },
  {
    id: 'pancasila_civics',
    name: 'Pendidikan Pancasila & PPKn',
    category: 'SOCIAL_HUMANITIES',
    gradeLevels: ['PRIMARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'pancasila',
      'ppkn',
      'pendidikan pancasila',
      'kewarganegaraan',
      'uud 1945',
      'konstitusi',
      'norma hukum',
      'hak asasi manusia',
      'ham',
      'demokrasi',
      'wawasan nusantara',
      'kebijakan publik',
    ],
    defaultFocusAreas: [
      'Pemahaman pasal-pasal konstitusi & nilai Pancasila',
      'Analisis studi kasus pelanggaran norma & solusi hukum',
      'Penyusunan argumen diskusi etika kewarganegaraan',
      'Refleksi implementasi nilai kebangsaan sehari-hari',
    ],
  },
  {
    id: 'geography',
    name: 'Geografi',
    category: 'SOCIAL_HUMANITIES',
    gradeLevels: ['JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'geografi',
      'geography',
      'litosfer',
      'atmosfer',
      'hidrosfer',
      'biosfer',
      'sig',
      'gis',
      'penginderaan jauh',
      'peta tematik',
      'tata ruang',
      'demografi',
      'kependudukan',
      'bencana alam',
    ],
    defaultFocusAreas: [
      'Identifikasi fenomena geosfer dan pendekatan spasial',
      'Interpretasi peta tematik dan data penginderaan jauh',
      'Kajian mitigasi bencana & analisis kependudukan',
      'Penyusunan laporan kajian wilayah',
    ],
  },
  {
    id: 'sociology_economics',
    name: 'Sosiologi & Ekonomi',
    category: 'SOCIAL_HUMANITIES',
    gradeLevels: ['SENIOR_HIGH'],
    keywords: [
      'sosiologi',
      'ekonomi',
      'interaksi sosial',
      'stratifikasi',
      'konflik sosial',
      'akuntansi',
      'jurnal umum',
      'inflasi',
      'apbn',
      'permintaan penawaran',
      'kebijakan moneter',
    ],
    defaultFocusAreas: [
      'Kajian teori sosial & identifikasi dinamika kelompok',
      'Pencatatan transaksi akuntansi / kurva keseimbangan pasar',
      'Analisis studi kasus empiris masyarakat / ekonomi',
      'Sintesis kebijakan dan solusi permasalahan',
    ],
  },
  {
    id: 'religious_studies',
    name: 'Pendidikan Agama & Budi Pekerti',
    category: 'SOCIAL_HUMANITIES',
    gradeLevels: ['PRIMARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'agama',
      'pendidikan agama',
      'pai',
      'fiqih',
      'akhlak',
      'akidah',
      'sejarah kebudayaan islam',
      'etika moral',
      'toleransi',
    ],
    defaultFocusAreas: [
      'Pemahaman dalil, teks suci, dan landasan moral',
      'Kajian kontekstual penerapan akhlak terpuji',
      'Penyusunan rangkuman intisari & refleksi ibadah',
    ],
  },

  // 3. STEM & ANALYTICAL
  {
    id: 'mathematics',
    name: 'Matematika & Matematika Lanjut',
    category: 'STEM_ANALYTICAL',
    gradeLevels: ['PRIMARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'matematika',
      'math',
      'kalkulus',
      'aljabar',
      'trigonometri',
      'geometri',
      'vektor',
      'matriks',
      'turunan',
      'integral',
      'polinomial',
      'statistika',
      'peluang',
      'deret aritmetika',
      'deret geometri',
      'rumus matematika',
    ],
    defaultFocusAreas: [
      'Kajian definisi konsep dasar & pembuktian teorema',
      'Latihan soal bertingkat (dasar, menengah, HOTS)',
      'Verifikasi langkah derivasi & pengecekan syarat batas',
      'Simulasi tryout mandiri & analisis kesalahan hitung',
    ],
  },
  {
    id: 'physics',
    name: 'Fisika',
    category: 'STEM_ANALYTICAL',
    gradeLevels: ['JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'fisika',
      'physics',
      'kinematika',
      'dinamika',
      'gerak lurus',
      'hukum newton',
      'optik',
      'termodinamika',
      'gelombang',
      'listrik magnet',
      'fisika modern',
      'efek fotolistrik',
      'relativitas',
      'utbk fisika',
    ],
    defaultFocusAreas: [
      'Pemodelan diagram benda bebas & rumus fisika',
      'Penyelesaian soal analisis variabel fisis & satuan',
      'Eksplorasi simulasi visual fenomena fisika',
      'Review rumus cepat & pembahasan soal komprehensif',
    ],
  },
  {
    id: 'chemistry',
    name: 'Kimia',
    category: 'STEM_ANALYTICAL',
    gradeLevels: ['SENIOR_HIGH'],
    keywords: [
      'kimia',
      'chemistry',
      'stoikiometri',
      'struktur atom',
      'ikatan kimia',
      'larutan asam basa',
      'kesetimbangan kimia',
      'laju reaksi',
      'termokimia',
      'redoks',
      'hidrokarbon',
      'polimer',
    ],
    defaultFocusAreas: [
      'Penyetaraan reaksi & perhitungan stoikiometri mol',
      'Analisis struktur molekul & sifat senyawa',
      'Latihan soal titrasi / kesetimbangan konsentrasi',
      'Rangkuman tabel periodik & uji pemahaman',
    ],
  },
  {
    id: 'biology',
    name: 'Biologi',
    category: 'STEM_ANALYTICAL',
    gradeLevels: ['JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'biologi',
      'biology',
      'genetika',
      'dna',
      'rna',
      'sel',
      'jaringan',
      'sistem organ',
      'ekosistem',
      'evolusi',
      'bioteknologi',
      'respirasi seluler',
      'fotosintesis',
    ],
    defaultFocusAreas: [
      'Pembuatan peta konsep alur bioproses & organel',
      'Kajian persilangan genetika & hukum Mendel',
      'Flashcard terminologi biologi & klasifikasi taksonomi',
      'Latihan soal analisis diagram biologis',
    ],
  },
  {
    id: 'informatics',
    name: 'Informatika & Ilmu Komputer',
    category: 'STEM_ANALYTICAL',
    gradeLevels: ['JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'informatika',
      'coding',
      'pemrograman',
      'python',
      'algoritma',
      'struktur data',
      'dynamic programming',
      'graph',
      'tree',
      'basis data',
      'sql',
      'jaringan komputer',
      'komputasi',
    ],
    defaultFocusAreas: [
      'Desain flowchart & analisis kompleksitas algoritma Big-O',
      'Implementasi modul kode & unit test debugging',
      'Optimasi struktur data & pengujian edge-cases',
      'Dokumentasi kode & presentasi deliverable',
    ],
  },

  // 4. GENERAL PROJECT & EXTRACURRICULAR
  {
    id: 'general_project',
    name: 'Proyek Umum & Ekstrakurikuler',
    category: 'GENERAL_PROJECT',
    gradeLevels: ['PRIMARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'],
    keywords: [
      'tugas kelompok',
      'proyek',
      'skripsi',
      'tesis',
      'karya tulis',
      'osis',
      'pramuka',
      'lomba',
      'presentasi',
      'riset',
      'magang',
    ],
    defaultFocusAreas: [
      'Penetapan tujuan proyek & pembagian peran tim',
      'Pengumpulan data / literatur & draf awal',
      'Uji coba, revisi bertahap, dan gladi bersih',
      'Finalisasi laporan proyek & evaluasi capaian',
    ],
  },
];

/**
 * Formats full ISO datetime string to an intuitive relative countdown badge
 * e.g. "Due in 2h 45m", "Due tomorrow at 14:00", "Overdue by 10m", "Due in 3d (27 Aug, 14:00)"
 */
export function formatRelativeDeadline(
  isoString: string | Date | null | undefined,
  currentTimestamp: number = Date.now()
): string {
  if (!isoString) return '';

  const targetDate = typeof isoString === 'string' ? new Date(isoString) : isoString;
  if (isNaN(targetDate.getTime())) return '';

  const diffMs = targetDate.getTime() - currentTimestamp;
  const absMs = Math.abs(diffMs);

  const mins = Math.floor(absMs / (1000 * 60));
  const hours = Math.floor(absMs / (1000 * 60 * 60));
  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));

  const formatTimeStr = (d: Date): string => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  };

  const formatDateStr = (d: Date): string => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(d);
  };

  const formatFullDateStr = (d: Date): string => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  };

  // OVERDUE HANDLING
  if (diffMs < 0) {
    if (mins < 60) {
      return `Overdue by ${Math.max(1, mins)}m`;
    }
    if (hours < 24) {
      const remainingMins = mins % 60;
      return remainingMins > 0
        ? `Overdue by ${hours}h ${remainingMins}m`
        : `Overdue by ${hours}h`;
    }
    return `Overdue by ${days}d`;
  }

  // FUTURE DEADLINE HANDLING
  if (mins < 60) {
    return `Due in ${Math.max(1, mins)}m`;
  }

  const isToday =
    targetDate.getDate() === new Date(currentTimestamp).getDate() &&
    targetDate.getMonth() === new Date(currentTimestamp).getMonth() &&
    targetDate.getFullYear() === new Date(currentTimestamp).getFullYear();

  const tomorrow = new Date(currentTimestamp);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    targetDate.getDate() === tomorrow.getDate() &&
    targetDate.getMonth() === tomorrow.getMonth() &&
    targetDate.getFullYear() === tomorrow.getFullYear();

  if (isToday) {
    const remainingMins = mins % 60;
    return remainingMins > 0
      ? `Due in ${hours}h ${remainingMins}m (Today at ${formatTimeStr(targetDate)})`
      : `Due in ${hours}h (Today at ${formatTimeStr(targetDate)})`;
  }

  if (isTomorrow) {
    return `Due tomorrow at ${formatTimeStr(targetDate)}`;
  }

  if (days <= 7) {
    return `Due in ${days}d (${formatDateStr(targetDate)}, ${formatTimeStr(targetDate)})`;
  }

  return `Due on ${formatFullDateStr(targetDate)}, ${formatTimeStr(targetDate)}`;
}
