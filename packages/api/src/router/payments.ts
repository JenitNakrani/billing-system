import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { invoice as invoiceTable, payment as paymentTable } from "@billing-system/db";
import { createTRPCRouter, protectedProcedure, subscriptionProcedure } from "../trpc";

export const paymentsRouter = createTRPCRouter({
  listByInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [inv] = await ctx.db
        .select()
        .from(invoiceTable)
        .where(
          and(
            eq(invoiceTable.id, input.invoiceId),
            eq(invoiceTable.companyId, ctx.user.companyId),
          ),
        )
        .limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      return ctx.db
        .select()
        .from(paymentTable)
        .where(eq(paymentTable.invoiceId, input.invoiceId))
        .orderBy(desc(paymentTable.paymentDate));
    }),

  create: subscriptionProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        amount: z.number().positive(),
        paymentDate: z.coerce.date(),
        method: z.enum(["cash", "upi", "bank", "cheque"]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [invoice] = await ctx.db
        .select()
        .from(invoiceTable)
        .where(
          and(
            eq(invoiceTable.id, input.invoiceId),
            eq(invoiceTable.companyId, ctx.user.companyId),
          ),
        )
        .limit(1);
      if (!invoice)
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (invoice.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add payment to cancelled invoice",
        });
      }

      const [payment] = await ctx.db
        .insert(paymentTable)
        .values({
          companyId: ctx.user.companyId,
          invoiceId: input.invoiceId,
          amount: String(input.amount),
          paymentDate: input.paymentDate,
          method: input.method,
          reference: input.reference,
          notes: input.notes,
        })
        .returning();
      if (!payment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [sumResult] = await ctx.db
        .select({
          total: sql<string>`coalesce(sum(${paymentTable.amount})::text, '0')`,
        })
        .from(paymentTable)
        .where(eq(paymentTable.invoiceId, input.invoiceId));
      const paid = Number(sumResult?.total ?? 0);
      const total = Number(invoice.totalAmount);
      const status = paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";

      await ctx.db
        .update(invoiceTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(invoiceTable.id, input.invoiceId));

      return payment;
    }),
});
