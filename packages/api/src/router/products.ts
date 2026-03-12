import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, or, like, lt } from "drizzle-orm";
import { product as productTable } from "@billing-system/db";
import { createTRPCRouter, protectedProcedure, subscriptionProcedure } from "../trpc";

export const productsRouter = createTRPCRouter({
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
      const conditions = [eq(productTable.companyId, ctx.user.companyId)];
      if (input?.search) {
        conditions.push(
          or(
            like(productTable.name, `%${input.search}%`),
            like(productTable.sku, `%${input.search}%`),
          )!,
        );
      }
      if (input?.cursor) {
        conditions.push(lt(productTable.id, input.cursor));
      }
      const items = await ctx.db
        .select()
        .from(productTable)
        .where(and(...conditions))
        .orderBy(desc(productTable.createdAt), desc(productTable.id))
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
        sku: z.string().optional(),
        unit: z.string().optional(),
        price: z.number().min(0),
        gstRate: z.number().min(0).max(100),
        hsnCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(productTable)
        .values({
          ...input,
          price: String(input.price),
          gstRate: String(input.gstRate),
          companyId: ctx.user.companyId,
        })
        .returning();
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return created;
    }),

  update: subscriptionProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        sku: z.string().optional(),
        unit: z.string().optional(),
        price: z.number().min(0).optional(),
        gstRate: z.number().min(0).max(100).optional(),
        hsnCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [existing] = await ctx.db
        .select()
        .from(productTable)
        .where(and(eq(productTable.id, id), eq(productTable.companyId, ctx.user.companyId)))
        .limit(1);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      const set: Record<string, unknown> = { ...data, updatedAt: new Date() };
      if (data.price !== undefined) set.price = String(data.price);
      if (data.gstRate !== undefined) set.gstRate = String(data.gstRate);
      const [updated] = await ctx.db
        .update(productTable)
        .set(set)
        .where(eq(productTable.id, id))
        .returning();
      return updated!;
    }),

  delete: subscriptionProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(productTable)
      .where(and(eq(productTable.id, input.id), eq(productTable.companyId, ctx.user.companyId)));
    return { ok: true };
  }),
});
