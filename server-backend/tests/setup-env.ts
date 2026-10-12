// Loads server-backend/.env the same way Next.js does, without overriding
// variables already set in the environment (CI sets them explicitly).
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
