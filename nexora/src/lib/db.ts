import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as taskSchema from '@/db/schema/tasks';

const connectionString = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/nexora';

// Connection pool for queries
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, {
  schema: {
    ...taskSchema,
  },
});

export type Database = typeof db;
