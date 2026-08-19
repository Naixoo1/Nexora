import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local first, fallback to .env
config({ path: '.env.local' });
config();

export default defineConfig({
  schema: './src/db/schema',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
