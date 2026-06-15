---
inclusion: always
---

# Stack Teknologi & Konvensi

## [SESUAIKAN DENGAN PROJECT ANDA]

### Bahasa & Runtime
- Primary: [misal: TypeScript 5.x / Python 3.12 / Go 1.22]
- Package Manager: [npm/pnpm/yarn/pip/uv/cargo]
- Runtime: [Node.js 22 / Python / Go]

### Framework
- Frontend: [misal: Next.js 14 App Router / React 18 / Vue 3]
- Backend: [misal: FastAPI / Express / NestJS / Gin]
- Database: [misal: PostgreSQL 16 + Prisma ORM / MongoDB + Mongoose]
- Testing: [misal: Vitest + Playwright / pytest / Go test]

### Aturan Wajib

#### TypeScript (jika digunakan)
- SELALU gunakan `strict: true`
- DILARANG menggunakan `any` — gunakan `unknown` atau type yang proper
- Gunakan `const` assertion untuk literal types
- Interface untuk object shapes, Type untuk unions/aliases
- Gunakan `satisfies` operator untuk type-safe object literals

#### Python (jika digunakan)
- SELALU gunakan type hints
- Gunakan `dataclass` atau `pydantic` untuk data structures
- `async/await` untuk I/O operations
- Gunakan `pathlib.Path` bukan `os.path`

#### Error Handling
- SELALU handle error secara eksplisit
- JANGAN swallow error dengan empty catch
- Log error dengan context yang cukup untuk debugging
- Gunakan custom error classes untuk business logic errors

#### Naming Conventions
- Variables/functions: camelCase (JS/TS) atau snake_case (Python)
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case untuk components, snake_case untuk modules

#### Struktur Import
1. Built-in modules
2. External packages
3. Internal aliases (@/)
4. Relative imports
5. Type-only imports (terakhir)