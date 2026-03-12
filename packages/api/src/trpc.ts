import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@billing-system/db";
import { user as userTable, company as companyTable } from "@billing-system/db";
import { env } from "../env";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  companyId: string;
  companyName: string;
  planStatus: string;
  validTill: Date | null;
  subscriptionActive: boolean;
  /** "admin" | "staff" – admin can access Settings and delete entities */
  role: string;
};

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const sessionToken = opts.headers.get("cookie")?.match(/billing_session=([^;]+)/)?.[1];
  let user: SessionUser | null = null;

  if (sessionToken) {
    try {
      const secret = new TextEncoder().encode(env.AUTH_SECRET ?? "dev-secret-change-me");
      const { payload } = await import("jose").then((j) => j.jwtVerify(sessionToken, secret));
      const userId = payload.sub as string;
      if (userId) {
        const [dbUser] = await db
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
          .where(and(eq(userTable.id, userId), eq(userTable.isActive, true)))
          .limit(1);
        if (dbUser) {
          const validTill = dbUser.validTill;
          const subscriptionActive =
            dbUser.planStatus === "active" &&
            (!validTill || validTill >= new Date());
          user = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            companyId: dbUser.companyId,
            companyName: dbUser.companyName,
            planStatus: dbUser.planStatus,
            validTill: dbUser.validTill,
            subscriptionActive,
            role: dbUser.role ?? "admin",
          };
        }
      }
    } catch {
      // invalid or expired token
    }
  }

  return {
    db,
    user,
    headers: opts.headers,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
  });
});

/** Use for mutations that should be blocked when subscription is expired */
export const subscriptionProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.subscriptionActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Subscription expired. Please renew to continue.",
    });
  }
  return next({ ctx });
});

/** Admin-only: Settings, delete customers/products, void invoice. Staff can create/edit data but not change company or delete. */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }
  return next({ ctx });
});
