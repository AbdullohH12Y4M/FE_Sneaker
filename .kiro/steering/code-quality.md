---
inclusion: always
---

# Standar Kualitas Kode — Non-Negotiable

## Security First

### Input Validation
- SEMUA input dari user/external harus divalidasi SEBELUM diproses
- Gunakan allowlist, bukan blocklist untuk validasi
- Sanitize HTML output untuk mencegah XSS

### Authentication & Authorization
- JANGAN simpan sensitive data di localStorage tanpa enkripsi
- SELALU verifikasi authorization di server-side, bukan hanya client-side
- Gunakan parameterized queries, JANGAN string concatenation untuk SQL

### Secrets Management
- DILARANG commit API keys, passwords, atau tokens
- Gunakan environment variables untuk semua credentials
- Rotate secrets secara berkala

## Performance Standards

### Database Queries
- SELALU tambahkan index untuk kolom yang sering di-query/join
- Hindari N+1 query problem — gunakan eager loading
- Paginate results untuk data yang banyak (max 100 records per request)
- Gunakan `SELECT` spesifik, hindari `SELECT *`

### Frontend Performance
- Lazy load components yang tidak terlihat di viewport
- Memoize expensive calculations dengan `useMemo`/`useCallback`
- Optimalkan images (next/image atau lazy loading)
- Bundle size matters — import selektif, bukan seluruh library

## Testing Standards

### Coverage Minimum
- Unit tests: 80% coverage untuk business logic
- Integration tests: semua API endpoints
- E2E tests: user journeys kritis

### Test Structure (AAA Pattern)
```javascript
test('should calculate correct total', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(30);
});
```

### Mock Boundaries
- Mock external services (API, database) di unit tests
- Gunakan real database untuk integration tests
- Test error paths, bukan hanya happy path

## Code Review Checklist (Kiro harus verifikasi ini sebelum selesai)
- [ ] Tidak ada console.log yang tertinggal
- [ ] Error handling sudah proper
- [ ] Types sudah di-define dengan benar
- [ ] Tidak ada magic numbers/strings
- [ ] Functions memiliki single responsibility
- [ ] Tests sudah ditulis untuk fungsi baru
- [ ] Tidak ada code duplication yang signifikan
- [ ] Accessibility (a11y) sudah dipertimbangkan untuk UI changes

### Untuk Pertanyaan Teknis
- Jawab langsung tanpa basa-basi berlebihan
- Tunjukkan kode jika relevan
- Sebutkan alternatif jika ada trade-off yang signifikan

## Batasan Penting
- JANGAN implement feature yang tidak diminta tanpa konfirmasi
- JANGAN refactor kode yang tidak berhubungan dengan task (kecuali diminta)
- JANGAN jalankan tests secara otomatis kecuali diminta user
- SATU task dalam satu waktu — selesaikan dulu, baru lanjut