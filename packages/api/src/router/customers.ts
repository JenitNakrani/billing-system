import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, or, sql, lt } from "drizzle-orm";
import { customer as customerTable } from "@billing-system/db";
import { createTRPCRouter, protectedProcedure, subscriptionProcedure, adminProcedure } from "../trpc";

export const customersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(500).default(50),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const conditions = [eq(customerTable.companyId, ctx.user.companyId)];
      if (input?.search) {
        const term = `%${input.search.trim()}%`;
        conditions.push(
          or(
            sql`${customerTable.name} ilike ${term}`,
            sql`${customerTable.email} ilike ${term}`,
            sql`${customerTable.phone} ilike ${term}`,
          )!,
        );
      }
      if (input?.cursor) {
        conditions.push(lt(customerTable.id, input.cursor));
      }
      const items = await ctx.db
        .select()
        .from(customerTable)
        .where(and(...conditions))
        .orderBy(desc(customerTable.createdAt), desc(customerTable.id))
        .limit(limit + 1);
      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop()!;
        nextCursor = next.id;
      }
      return { items, nextCursor };
    }),

  create: subscriptionProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        gstin: z.string().optional(),
        stateCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(customerTable)
        .values({ ...input, companyId: ctx.user.companyId })
        .returning();
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return created;
    }),

  update: subscriptionProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        gstin: z.string().optional(),
        stateCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [existing] = await ctx.db
        .select()
        .from(customerTable)
        .where(and(eq(customerTable.id, id), eq(customerTable.companyId, ctx.user.companyId)))
        .limit(1);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      const [updated] = await ctx.db
        .update(customerTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(customerTable.id, id))
        .returning();
      return updated!;
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(customerTable)
      .where(and(eq(customerTable.id, input.id), eq(customerTable.companyId, ctx.user.companyId)));
    return { ok: true };
  }),
});
