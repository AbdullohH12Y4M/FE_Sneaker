import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: process.env.DATABASE_URL!,
    // tambahkan ini untuk Supabase + Vercel
    directUrl: process.env.DIRECT_URL!,
  },
});