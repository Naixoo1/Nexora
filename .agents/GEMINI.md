# GEMINI.md — Nexora

> Catatan penting: Sebaiknya tulis isi GEMINI.md dalam Bahasa Inggris.
> Gemini memproses instruksi Bahasa Inggris lebih optimal.

---

## 1. Project Overview

- Name : Nexora
- Description : Aplikasi berbasis AI yang membantu siswa SMA/mahasiswa mengerjakan tugas dan persiapan ujian.
- Goal : Memudahkan siswa SMA maupun mahasiswa dalam mengerjakan tugas/projek dan persiapan ujian yang matang.
- Target Users: Siswa SMA dan mahasiswa
- Version : v1.0.0
- Status : Active development

---

## 2. Tech Stack

- Language : TypeScript
- Framework : Next.js 15 (App Router, Server Actions, Edge/Node Runtime)
- Styling : Tailwind CSS
- UI Library : shadcn/ui + Luicide React / @xyflow/react + KaTeX / react-katex
- Database : PostgreSQL (via Supabase / Neon) + pgvector
- ORM : Drizzle ORM
- Auth : Better Auth (Support Google OAuth 2.0 native, session management & seamless Next.js App Router integration)
- State Management: Zustand  (Global UI state, active logic tree state, session timers)
- Data Fetching : TanStack Query (React Query) + Vercel AI SDK (useChat, useCompletion untuk streaming LLM)
- AI & RAG Engine:
    - LLM Orchestration: LangChain / LlamaIndex (TypeScript)
    - Models: Gemini Flash 3.6 (High-bandwidth / Fast streaming) & Claude 3.5 / 4.6 (Complex reasoning & logic extraction)
    - Document Parsing & OCR: LlamaParse / Unstructured.io (Ekstrasi PDF/DOCX, rumus matematika, & tabel)
    - Vector Search / Reranking: pgvector + Cohere Rerank
- Package Manager : pnpm
- Deployment : Vercel + Supabase Cloud

---

## 3. Commands

```bash
# Development
pnpm run dev          # Jalankan dev server
pnpm run build        # Build untuk production
pnpm run start        # Jalankan production build
pnpm run lint         # Jalankan linter
pnpm run format       # Format kode

# Package Management
pnpm add [package]    # Install package baru

# Testing
pnpm run test         # Jalankan semua test
pnpm run test:unit    # Jalankan unit test saja
pnpm run test:e2e     # Jalankan e2e test saja

# Database
pnpm run db:migrate   # Jalankan migrasi
pnpm run db:seed      # Seed data awal
pnpm run db:reset     # Reset database
```

Always use pnpm

---

## 4. Project Structure

Architecture: Feature-Driven Structure

```
.agents/
  ├── GEMINI.md            # Instruksi khusus & konteks untuk AI Coding Agent
  ├── PRD.md               # Product Requirement Document (Visi, Fitur, Target User)
  ├── DESIGN.md            # Panduan UI/UX (Warna, Font, Design System, Komponen)
  ├── ARCHITECTURE.md      # Dokumentasi teknis alur data dan arsitektur ini
  └── DATABASE.md          # Skema database & alur relasi data

src/
  ├── assets/              # Aset gambar, ikon, font statis
  │
  ├── components/          # Komponen UI global (Reusable)
  │   ├── ui/              # Button, Input, Card, Modal, Badge
  │   └── layout/          # Navbar, Sidebar, Footer
  │
  ├── features/            # Fitur Utama (Feature-Driven Structure)
  │   ├── auth/            # Fitur Login & Register
  │   ├── learning/        # Fitur Materi & Modul Edukasi
  │   ├── practice/        # Fitur Latihan Soal & Quiz
  │   └── discussion/      # Fitur Forum Diskusi & Tanya Jawab
  │       ├── components/  # Komponen khusus fitur tersebut
  │       ├── services/    # Logic pemanggilan API / database
  │       └── types/       # Type data khusus fitur tersebut
  │
  ├── hooks/               # Custom React Hooks (misal: useAuth, useDebounce)
  ├── lib/                 # Konfigurasi library (misal: Supabase, Axios, Firebase)
  ├── services/            # Logic pemanggilan API global
  ├── types/               # TypeScript Interfaces / Types global
  └── utils/               # Helper functions (formatDate, currency, dll)

public/                    # Static assets yang bisa diakses publik (favicon, logo)
package.json               # Config dependencies & script project
tsconfig.json              # Config TypeScript
.env.example               # Contoh variabel lingkungan (Environment variables)
```

Aturan penempatan file:
- Selalu pertahankan struktur folder seperti di atas.
- Komponen UI baru selalu di `src/components/`.
- Logic bisnis selalu di `src/features/[nama-fitur]/services/`.
- Tipe TypeScript selalu di `src/types/` atau di `src/features/[nama-fitur]/types/` jika spesifik fitur.
- Helper dan utility selalu di `src/utils/`.
- Jangan membuat folder baru tanpa konfirmasi terlebih dahulu.

---

## 5. Naming Conventions

```
# File dan Folder
- Komponen      : PascalCase    contoh: UserCard.tsx
- Non-komponen  : camelCase     contoh: useAuth.ts, getUserById.ts
- Folder        : kebab-case    contoh: user-profile/
- Halaman       : page.tsx atau index.tsx
- Layout        : layout.tsx
- Test file     : [nama].test.ts atau [nama].spec.ts

# Di dalam Kode
- Variabel      : camelCase     contoh: userData, isLoading
- Konstanta     : UPPER_SNAKE   contoh: MAX_RETRY, BASE_URL
- Fungsi        : camelCase     contoh: getUserById, formatDate
- Tipe/Interface: PascalCase    contoh: UserType, ApiResponse
- Enum          : PascalCase    contoh: UserRole, OrderStatus
- CSS Class     : kebab-case    contoh: user-card, nav-item

# Git Branch
- Fitur baru    : feat/[nama-fitur]
- Bug fix       : fix/[nama-bug]
- Hotfix        : hotfix/[nama]
- Refactor      : refactor/[nama]
```

---

## 6. Code Conventions

```
# Pendekatan Coding
- Terapkan prinsip [clean code / DRY / SOLID / dll]
- Hindari duplikasi kode, jadikan function jika dipakai lebih dari sekali
- Tulis kode yang mudah dibaca, bukan yang paling singkat

# TypeScript (jika pakai TypeScript)
- Gunakan strict mode
- Tidak boleh menggunakan tipe 'any'
- Selalu tulis tipe return function secara eksplisit
- Gunakan interface untuk object, type untuk union atau intersection

# Urutan Import
1. Library eksternal (React, Next.js, dll)
2. Internal absolut (@/components, @/utils, dll)
3. Internal relatif (./Component, ../utils)
4. Tipe dan Interface
5. Assets dan styles

# Export Pattern
- Gunakan named export untuk komponen dan fungsi
- Gunakan default export hanya untuk page.tsx dan layout.tsx

# Error Handling
- Selalu gunakan try-catch untuk async function
- Jangan biarkan error tanpa penanganan
- Tulis pesan error yang informatif dan spesifik
```

---

## 7. Component Rules

```
# Urutan Penulisan dalam Satu Komponen
1. Import
2. Tipe atau Interface props
3. Definisi komponen
4. Hooks (useState, useEffect, dll)
5. Handler dan fungsi lokal
6. Return JSX
7. Export

# Aturan Props
- Selalu tulis tipe props secara eksplisit
- Gunakan default value untuk props yang opsional
- Maksimal [angka] props per komponen

# Server vs Client Component (untuk Next.js)
- Default: gunakan Server Component
- Gunakan 'use client' hanya jika butuh:
    useState / useEffect / hooks lainnya
    Event listener (onClick, onChange, dll)
    Browser API (localStorage, window, dll)
    Library yang tidak support SSR

# Komponen Kecil
- Pisah ke file sendiri jika dipakai lebih dari satu tempat
- Boleh digabung dalam satu file jika hanya dipakai di satu komponen
```

---

## 8. Styling Rules

```
# Pendekatan Styling
- Gunakan [Tailwind CSS / CSS Modules / Styled Components / dll]
- Jangan gunakan inline style kecuali untuk nilai yang benar-benar dinamis
- Jangan gunakan !important

# Tailwind CSS (jika pakai Tailwind)
- Gunakan utility class langsung di JSX
- Gunakan clsx atau cn untuk conditional class
- Ekstrak ke komponen jika class yang sama dipakai lebih dari sekali
- Urutan class: layout > spacing > sizing > color > typography > state

# Responsive Design
- Pendekatan mobile-first
- Breakpoint: sm (640px) / md (768px) / lg (1024px) / xl (1280px)

# Dark Mode
- Gunakan [dark: prefix Tailwind / CSS variables / dll]
- Selalu test tampilan di dark mode setelah membuat komponen baru

# Design Tokens
- Gunakan CSS variables untuk warna, spacing, dan typography
- Jangan hardcode nilai warna langsung
- Gunakan variabel yang sudah didefinisikan di [file config]
```

---

## 9. API & Data Fetching Rules

```
# Kapan Pakai Server vs Client Fetch
- Server fetch  : data yang tidak butuh interaksi user (halaman awal)
- Client fetch  : data yang berubah setelah interaksi user
- Gunakan [SWR / React Query] untuk client-side data fetching
- Jangan gunakan useEffect untuk fetching data

# Format Response API
- Selalu kembalikan format yang konsisten di semua endpoint:
  { success: boolean, data: T | null, message: string }

# Error Handling di API
- Selalu tangani error dengan try-catch
- Kembalikan status code yang tepat (200, 400, 401, 404, 500)
- Jangan expose detail error ke client di production

# Lokasi Fetch Function
- Semua fungsi fetch disimpan di folder [services / api / lib]
- Jangan tulis fungsi fetch langsung di dalam komponen

# Environment
- Gunakan environment variable untuk semua URL dan API key
- Jangan hardcode URL atau secret apapun langsung di kode
```

---

## 10. State Management Rules

```
# Hierarki State (gunakan dari yang paling sederhana dulu)
1. Local state (useState)   : hanya dipakai 1 komponen
2. Lifted state             : dipakai 2-3 komponen yang berdekatan
3. Global state             : dipakai banyak komponen di banyak tempat

# Kapan Pakai Global State
- Data user atau auth yang dibutuhkan banyak komponen
- UI state global (tema, bahasa, layout toggle)
- Data yang perlu persist antar halaman

# Aturan [Zustand / Redux / Pinia / dll]
- Buat store per domain atau fitur, jangan satu store untuk semuanya
- Jangan simpan data yang bisa dihitung dari data lain
- Gunakan selector untuk mengambil data spesifik dari store
- [Tambahkan aturan spesifik state manager yang kamu pakai]

# Kapan Pakai Context
- Untuk data yang jarang berubah (tema, locale, config global)
- Jangan gunakan Context untuk state yang sering berubah
```

---

## 11. Performance Rules

```
# Code Splitting
- Gunakan dynamic import untuk komponen besar yang tidak langsung terlihat
- Lazy load halaman dan komponen yang jarang diakses

# Image Optimization
- Selalu gunakan komponen Image dari framework (next/image, dll)
- Tentukan width dan height untuk setiap gambar
- Gunakan format WebP atau AVIF untuk gambar baru
- Jangan gunakan tag img HTML biasa

# Re-render Optimization
- Gunakan useMemo untuk kalkulasi yang berat
- Gunakan useCallback untuk fungsi yang dikirim sebagai props
- Jangan overuse memo, lakukan profiling dulu sebelum optimize

# Bundle Size
- Import hanya yang dibutuhkan, bukan seluruh library
  Benar : import { debounce } from 'lodash'
  Salah : import _ from 'lodash'

# SSR dan SSG (Next.js)
- Default ke Server Component untuk mengurangi JavaScript di client
- Gunakan Static Generation untuk halaman yang datanya jarang berubah
- Gunakan ISR untuk halaman yang butuh revalidasi berkala
```

---

## 12. Git Rules

Setiap kali Claude Code selesai membuat perubahan atau penambahan kode,
langsung commit ke GitHub sebelum melanjutkan ke task berikutnya.
Ini penting supaya kamu bisa membandingkan kode lama dan kode baru,
dan melakukan undo jika hasilnya tidak sesuai ekspektasi.

```
# Format Commit Message
feat     : [deskripsi fitur baru]
fix      : [deskripsi bug yang diperbaiki]
refactor : [deskripsi perubahan refactor]
style    : [perubahan styling atau formatting]
docs     : [perubahan dokumentasi]
test     : [penambahan atau perubahan test]
chore    : [perubahan konfigurasi atau tooling]

# Contoh
feat: add user authentication with Google OAuth
fix: resolve infinite scroll not triggering on mobile
refactor: extract user card into reusable component

# Aturan Tambahan
- Jangan commit file .env atau file yang berisi secret apapun
- Satu commit untuk satu perubahan yang spesifik
- Jangan gabungkan banyak perubahan yang tidak berkaitan dalam satu commit
```

---

## 13. Features

```
# Sudah selesai dan berjalan
- [x] [Nama fitur 1]
- [x] [Nama fitur 2]
- [x] [Nama fitur 3]

# Sedang dikerjakan — jangan diubah tanpa konfirmasi
- [ ] [Nama fitur yang sedang in-progress]
- [ ] [Nama fitur yang sedang in-progress]

# Belum dimulai
- [ ] [Nama fitur yang direncanakan]
- [ ] [Nama fitur yang direncanakan]
```

---

## 14. Testing

```
# Pendekatan Testing
- Jenis testing  : [Unit / Integration / E2E / Manual]
- Framework      : [Jest / Vitest / Playwright / Cypress / dll]

# Yang Perlu Di-test
- Semua fungsi utility dan helper
- Logic bisnis yang kompleks
- API endpoint (happy path dan error case)
- Komponen kritis yang sering dipakai banyak halaman

# Yang Tidak Perlu Di-test
- Komponen presentational yang sangat sederhana
- Third-party library (sudah di-test oleh pembuatnya)
- File konfigurasi

# Aturan Penulisan Test
- Satu test file per satu file yang di-test
- Nama test harus deskriptif:
  'should [expected behavior] when [condition]'
- Gunakan pola AAA: Arrange, Act, Assert

# Coverage Target
- Minimum coverage : [angka]%
- Prioritas        : fungsi bisnis > API > komponen UI
```

---

## 15. Do Not

Jika instruksi atau prompt kamu ambigu, TANYA DULU sebelum mulai coding.
Jangan berasumsi dan langsung mengerjakan tanpa konfirmasi.

```
# Struktur dan File
- Jangan buat folder baru tanpa konfirmasi
- Jangan hapus file tanpa konfirmasi
- Jangan pindahkan file tanpa konfirmasi
- Jangan ubah struktur folder yang sudah ada

# Kode
- Jangan gunakan tipe 'any' di TypeScript
- Jangan hardcode nilai yang seharusnya dari environment variable
- Jangan commit file .env atau file yang berisi secret
- Jangan install package baru tanpa konfirmasi
- Jangan hapus atau ubah fitur yang sudah berjalan tanpa instruksi jelas

# Pattern yang Dilarang
- Jangan gunakan [package atau pattern yang tidak boleh dipakai]
- Jangan gunakan useEffect untuk data fetching
- Jangan gunakan inline style untuk nilai yang bisa pakai utility class

# Database
- Jangan jalankan perintah yang mengubah atau menghapus data production
- Jangan buat migrasi database tanpa konfirmasi
- Jangan expose credential database ke sisi client

# Keamanan
- Jangan expose API key atau secret apapun ke client
- Jangan bypass validasi input dari user
- Jangan skip error handling di API routes
```

---

## 16. Environment Variables

```
# Setup
- Copy .env.example ke .env.local untuk development lokal
- Jangan pernah commit file .env atau .env.local ke repository

# Public Variables — aman dipakai di sisi client
NEXT_PUBLIC_[NAMA]      # [Deskripsi variabel ini untuk apa]
NEXT_PUBLIC_[NAMA]      # [Deskripsi variabel ini untuk apa]

# Server-only Variables — JANGAN pernah expose ke client
[DATABASE_URL]          # [Deskripsi]
[SECRET_KEY]            # [Deskripsi]
[API_KEY]               # [Deskripsi]
[SMTP_PASSWORD]         # [Deskripsi]

# Auth Variables
[AUTH_SECRET]           # Secret untuk JWT signing
[AUTH_URL]              # Base URL aplikasi
[OAUTH_CLIENT_ID]       # OAuth client ID
[OAUTH_CLIENT_SECRET]   # OAuth client secret — server only
```
