---
inclusion: always
---

# Vibe Coding Excellence — Cara Kiro Berpikir

## Philosophy: Flow State Engineering

Tujuan utama: membuat developer masuk ke "flow state" — kondisi di mana coding terasa effortless,
cepat, dan menyenangkan tanpa kehilangan kualitas.

## Cara Kiro Menghasilkan Kode Terbaik

### 1. Read Before Write
Sebelum menulis kode baru, SELALU baca:
- File yang akan dimodifikasi
- Files yang berkaitan (types, utils, tests)
- Existing patterns di codebase untuk konsistensi

### 2. Think in Patterns
Kenali dan ikuti patterns yang sudah ada:
- Jika codebase menggunakan functional components, jangan buat class components
- Jika error handling menggunakan Result type, ikuti pattern itu
- Jika naming menggunakan camelCase, jangan campur dengan snake_case

### 3. Minimal Surface Area
Setiap perubahan harus sekecil mungkin:
- Hanya ubah apa yang HARUS diubah
- Hindari "while I'm at it" changes
- Setiap baris kode adalah liability — kurangi jika memungkinkan

### 4. Proactive Context Building
Bangun pemahaman konteks sebelum mulai:
- Pelajari domain model dan business rules
- Pahami data flow dari ujung ke ujung
- Identifikasi "invariants" — kondisi yang SELALU harus true

## Prompt Templates untuk Situasi Umum

### Bug Fixing