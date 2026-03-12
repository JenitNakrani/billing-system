import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    /** Optional dev whitelist: when set, this email/password can log in as the first user in the DB */
    DEV_LOGIN_EMAIL: z.string().email().optional(),
    DEV_LOGIN_PASSWORD: z.string().optional(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    DEV_LOGIN_EMAIL: process.env.DEV_LOGIN_EMAIL,
    DEV_LOGIN_PASSWORD: process.env.DEV_LOGIN_PASSWORD,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
