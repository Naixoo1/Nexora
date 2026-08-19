import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema.ts", // adjust this path to where your schema file lives
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});