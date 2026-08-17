import type {
  PlannerGeneratePayload,
  PlannerTaskItem,
  ApiResponse,
} from '@/types/task';

export const mockPlannerGeneratePayload: PlannerGeneratePayload = {
  prompt: 'Buat rencana belajar persiapan ujian Fisika Kuantum bab Efek Fotolistrik dan Model Atom Bohr dalam 3 hari',
  dueDate: '2026-08-20T23:59:59.000Z',
  category: 'Fisika',
  maxTasks: 5,
};

export const mockPlannerGeneratedTasks: PlannerTaskItem[] = [
  {
    title: 'Review Teori Efek Fotolistrik',
    description: 'Pahami fungsi kerja, energi kinetik maksimum fotoelektron, dan frekuensi ambang',
    priority: 'high',
    dueDate: '2026-08-18T18:00:00.000Z',
    children: [
      {
        title: 'Penurunan Rumus Einstein untuk Efek Fotolistrik',
        description: 'E_k = h*f - W_0',
        priority: 'high',
        children: [
          {
            title: 'Latihan Soal Grafik Frekuensi vs Energi Kinetik',
            priority: 'medium',
          },
        ],
      },
    ],
  },
  {
    title: 'Review Postulat & Model Atom Bohr',
    description: 'Transisi elektron, deret Lyman, Balmer, Paschen, dan jari-jari orbit',
    priority: 'high',
    dueDate: '2026-08-19T18:00:00.000Z',
    children: [
      {
        title: 'Simulasi Perhitungan Panjang Gelombang Foton Terpancar',
        priority: 'medium',
      },
    ],
  },
  {
    title: 'Simulasi Tryout Ujian Fisika Kuantum Komprehensif',
    description: 'Uji pemahaman dengan 20 soal bertipe HOTS',
    priority: 'urgent',
    dueDate: '2026-08-20T20:00:00.000Z',
  },
];

export const mockPlannerSuccessApiResponse: ApiResponse<{
  plan: PlannerTaskItem[];
  createdCount: number;
}> = {
  success: true,
  data: {
    plan: mockPlannerGeneratedTasks,
    createdCount: 5,
  },
  message: 'Study plan generated and scheduled successfully',
};

export const mockPlannerErrorApiResponse: ApiResponse<null> = {
  success: false,
  data: null,
  message: 'AI Service rate limit exceeded. Please retry in 10 seconds.',
};
