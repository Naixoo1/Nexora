export type PrimaryQuestionTheme = 'counting' | 'animals' | 'geometry' | 'balance' | 'space';

export interface PrimaryQuestionOption {
  id: string;
  label: string;
  icon: string; // Emoji / Icon descriptor e.g. "🍎", "🔺", "⚖️", "🚀", "🦁"
  isCorrect: boolean;
}

export interface PrimaryExpoQuestion {
  id: string;
  title: string;
  storyPrompt: string;
  theme: PrimaryQuestionTheme;
  animationAsset: string;
  options: [
    PrimaryQuestionOption,
    PrimaryQuestionOption,
    PrimaryQuestionOption,
    PrimaryQuestionOption
  ];
  hint: string;
  explanation: string;
  points: number;
}

export const PRIMARY_EXPO_QUESTIONS: PrimaryExpoQuestion[] = [
  {
    id: 'pri-count-01',
    title: 'Keranjang Apel Bu Siti',
    storyPrompt:
      'Bu Siti memetik 24 buah apel merah dari kebun ceria. Bu Siti ingin membagikannya secara sama rata ke dalam 3 keranjang buah. Berapa banyak buah apel di dalam setiap keranjang?',
    theme: 'counting',
    animationAsset: '/media/themes/counting-fruits.svg',
    options: [
      { id: 'opt-a', label: '6 Buah Apel', icon: '🍎', isCorrect: false },
      { id: 'opt-b', label: '7 Buah Apel', icon: '🍎', isCorrect: false },
      { id: 'opt-c', label: '8 Buah Apel', icon: '🍎', isCorrect: true },
      { id: 'opt-d', label: '9 Buah Apel', icon: '🍎', isCorrect: false },
    ],
    hint: 'Bagi 24 apel ke dalam 3 bagian sama rata: 24 dibagi 3 sama dengan berapa ya? Coba ingat perkalian 3 x ... = 24! 🍎',
    explanation:
      'Kita hitung dengan pembagian sederhana: 24 apel ÷ 3 keranjang = 8 buah apel per keranjang. Hebat!',
    points: 100,
  },
  {
    id: 'pri-geo-02',
    title: 'Taman Bangun Datar Ajaib',
    storyPrompt:
      'Di taman bermain matematika, Kiki melihat sebuah bangun datar yang memiliki 3 sisi lurus dan 3 sudut lancip yang runcing. Bangun datar apakah yang dilihat oleh Kiki?',
    theme: 'geometry',
    animationAsset: '/media/themes/geometry-shapes.svg',
    options: [
      { id: 'opt-a', label: 'Segitiga', icon: '🔺', isCorrect: true },
      { id: 'opt-b', label: 'Persegi', icon: '🟦', isCorrect: false },
      { id: 'opt-c', label: 'Lingkaran', icon: '🟡', isCorrect: false },
      { id: 'opt-d', label: 'Persegi Panjang', icon: '🟩', isCorrect: false },
    ],
    hint: 'Bangun ini memiliki kata "tiga" pada namanya karena memiliki 3 sisi dan 3 titik sudut! 📐',
    explanation:
      'Bangun datar yang memiliki tepat 3 sisi dan 3 sudut adalah Segitiga. Persegi memiliki 4 sisi, dan lingkaran memiliki 1 sisi lengkung.',
    points: 100,
  },
  {
    id: 'pri-bal-03',
    title: 'Timbangan Ajaib di Laboratorium',
    storyPrompt:
      'Pada sebuah timbangan seimbang, sisi kiri diletakkan 2 buah kotak biru seberat 5 kg masing-masing (total 10 kg). Berapakah berat 1 kotak merah muda di sisi kanan agar timbangan tetap seimbang sempurna?',
    theme: 'balance',
    animationAsset: '/media/themes/balance-scale.svg',
    options: [
      { id: 'opt-a', label: '5 kg', icon: '⚖️', isCorrect: false },
      { id: 'opt-b', label: '8 kg', icon: '⚖️', isCorrect: false },
      { id: 'opt-c', label: '10 kg', icon: '⚖️', isCorrect: true },
      { id: 'opt-d', label: '15 kg', icon: '⚖️', isCorrect: false },
    ],
    hint: 'Agar timbangan seimbang rata, berat di sisi kiri (5 kg + 5 kg) harus persis sama dengan berat di sisi kanan! ⚖️',
    explanation:
      'Sisi kiri beratnya 5 kg + 5 kg = 10 kg. Maka kotak merah di sisi kanan juga harus memiliki berat 10 kg agar timbangan seimbang.',
    points: 100,
  },
  {
    id: 'pri-space-04',
    title: 'Misi Roket Bintang Kejora',
    storyPrompt:
      'Astronot Rio sedang menjelajahi tata surya. Planet manakah yang merupakan pusat tata surya yang memancarkan cahaya dan panas ke seluruh planet?',
    theme: 'space',
    animationAsset: '/media/themes/space-adventure.svg',
    options: [
      { id: 'opt-a', label: 'Matahari', icon: '☀️', isCorrect: true },
      { id: 'opt-b', label: 'Bulan', icon: '🌙', isCorrect: false },
      { id: 'opt-c', label: 'Planet Mars', icon: '🪐', isCorrect: false },
      { id: 'opt-d', label: 'Bumi Kita', icon: '🌍', isCorrect: false },
    ],
    hint: 'Bintang raksasa yang bersinar sangat terang di siang hari dan menghangatkan bumi! ☀️',
    explanation:
      'Matahari adalah bintang raksasa yang menjadi pusat tata surya kita dan memberikan energi cahaya bagi bumi.',
    points: 100,
  },
  {
    id: 'pri-anim-05',
    title: 'Pesta Satwa di Savana Rimba',
    storyPrompt:
      'Di hutan savana rimba, ada hewan gagah bertaring tajam yang dijuluki Sang Raja Hutan karena memiliki surai lebat di kepalanya. Hewan apakah itu?',
    theme: 'animals',
    animationAsset: '/media/themes/animal-safari.svg',
    options: [
      { id: 'opt-a', label: 'Singa', icon: '🦁', isCorrect: true },
      { id: 'opt-b', label: 'Jerapah', icon: '🦒', isCorrect: false },
      { id: 'opt-c', label: 'Gajah', icon: '🐘', isCorrect: false },
      { id: 'opt-d', label: 'Zebra', icon: '🦓', isCorrect: false },
    ],
    hint: 'Hewan ini bersuara "Aummm!" dan memiliki surai rambut emas di sekeliling lehernya! 🦁',
    explanation:
      'Singa jantan terkenal dengan surai rambutnya yang indah dan dijuluki sebagai Raja Hutan di padang savana.',
    points: 100,
  },
];
