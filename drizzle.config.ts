import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './electron/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
})

