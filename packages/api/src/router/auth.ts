import { SignJWT } from "jose";
import { TRPCError } from "@trpc/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { user as userTable, company as companyTable } from "@billing-system/db";
import { env } from "../../env";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return ctx.user;
  }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const emailLower = input.email.toLowerCase();

      // Dev whitelist: if env has DEV_LOGIN_EMAIL + DEV_LOGIN_PASSWORD and they match, log in as first user
      if (
        env.DEV_LOGIN_EMAIL &&
        env.DEV_LOGIN_PASSWORD &&
        emailLower === env.DEV_LOGIN_EMAIL.toLowerCase() &&
        input.password === env.DEV_LOGIN_PASSWORD
      ) {
        const [firstUser] = await ctx.db
          .select({
            id: userTable.id,
            email: userTable.email,
            name: userTable.name,
            companyId: companyTable.id,
            companyName: companyTable.name,
            planStatus: companyTable.planStatus,
            validTill: companyTable.validTill,
            role: userTable.role,
          })
          .from(userTable)
          .innerJoin(companyTable, eq(userTable.companyId, companyTable.id))
          .where(eq(userTable.isActive, true))
          .limit(1);
        if (!firstUser) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Dev whitelist is set but no user exists in the database. Create a user first.",
          });
        }
        const u = firstUser;
        const secret = new TextEncoder().encode(env.AUTH_SECRET ?? "dev-secret-change-me");
        const token = await new SignJWT({})
          .setProtectedHeader({ alg: "HS256" })
          .setSubject(u.id)
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(secret);
        return {
          token,
          user: {
            id: u.id,
            email: u.email,
            name: u.name,
            companyId: u.companyId,
            companyName: u.companyName,
            planStatus: u.planStatus,
            validTill: u.validTill,
            subscriptionActive:
              u.planStatus === "active" &&
              (!u.validTill || u.validTill >= new Date()),
            role: u.role ?? "admin",
          },
        };
      }

      const [row] = await ctx.db
        .select({
          id: userTable.id,
          email: userTable.email,
          name: userTable.name,
          passwordHash: userTable.passwordHash,
          companyId: companyTable.id,
          companyName: companyTable.name,
          planStatus: companyTable.planStatus,
          validTill: companyTable.validTill,
          role: userTable.role,
        })
        .from(userTable)
        .innerJoin(companyTable, eq(userTable.companyId, companyTable.id))
        .where(
          and(
            eq(userTable.email, emailLower),
            eq(userTable.isActive, true),
          ),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const u = row;
      const valid = await compare(input.password, u.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const secret = new TextEncoder().encode(env.AUTH_SECRET ?? "dev-secret-change-me");
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(u.id)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);
      return {
        token,
        user: {
          id: u.id,
          email: u.email,
          name: u.name,
          companyId: u.companyId,
          companyName: u.companyName,
          planStatus: u.planStatus,
          validTill: u.validTill,
          subscriptionActive:
            u.planStatus === "active" &&
            (!u.validTill || u.validTill >= new Date()),
          role: u.role ?? "admin",
        },
      };
    }),

  logout: protectedProcedure.mutation(() => {
    return { ok: true };
  }),
});
