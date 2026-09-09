import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prefer DIRECT_URL (session pooler) for schema push / migrate; fall back to DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
