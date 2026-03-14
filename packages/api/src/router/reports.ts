import { z } from "zod";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { invoice as invoiceTable, customer as customerTable, invoiceItem as invoiceItemTable, product as productTable } from "@billing-system/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const reportsRouter = createTRPCRouter({
  salesByMonth: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.user.companyId;
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const rows = await ctx.db
      .select({
        month: sql<string>`to_char(${invoiceTable.invoiceDate}, 'YYYY-MM')`,
        total: sql<string>`coalesce(sum(${invoiceTable.totalAmount})::text, '0')`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoiceTable)
      .where(
        and(
          eq(invoiceTable.companyId, companyId),
          gte(invoiceTable.invoiceDate, twelveMonthsAgo),
          sql`${invoiceTable.status} <> 'cancelled'`,
        ),
      )
      .groupBy(sql`to_char(${invoiceTable.invoiceDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${invoiceTable.invoiceDate}, 'YYYY-MM')`);

    return rows.map((r) => ({
      month: r.month,
      total: Number(r.total),
      count: r.count,
    }));
  }),

  topCustomers: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const limit = Math.min(input?.limit ?? 10, 50);
      const companyId = ctx.user.companyId;

      const rows = await ctx.db
        .select({
          customerId: invoiceTable.customerId,
          customerName: customerTable.name,
          total: sql<string>`coalesce(sum(${invoiceTable.totalAmount})::text, '0')`,
          count: sql<number>`count(*)::int`,
        })
        .from(invoiceTable)
        .innerJoin(customerTable, eq(invoiceTable.customerId, customerTable.id))
        .where(
          and(
            eq(invoiceTable.companyId, companyId),
            sql`${invoiceTable.status} <> 'cancelled'`,
          ),
        )
        .groupBy(invoiceTable.customerId, customerTable.name)
        .orderBy(desc(sql`sum(${invoiceTable.totalAmount})::numeric`))
        .limit(limit);

      return rows.map((r) => ({
        customerId: r.customerId,
        customerName: r.customerName,
        total: Number(r.total),
        count: r.count,
      }));
    }),

  topProducts: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const limit = Math.min(input?.limit ?? 10, 50);
      const companyId = ctx.user.companyId;

      const rows = await ctx.db
        .select({
          productId: invoiceItemTable.productId,
          productName: productTable.name,
          totalQuantity: sql<string>`coalesce(sum(${invoiceItemTable.quantity})::text, '0')`,
          totalRevenue: sql<string>`coalesce(sum(${invoiceItemTable.lineTotal})::text, '0')`,
        })
        .from(invoiceItemTable)
        .innerJoin(productTable, eq(invoiceItemTable.productId, productTable.id))
        .innerJoin(invoiceTable, eq(invoiceItemTable.invoiceId, invoiceTable.id))
        .where(
          and(
            eq(invoiceTable.companyId, companyId),
            sql`${invoiceTable.status} <> 'cancelled'`,
          ),
        )
        .groupBy(invoiceItemTable.productId, productTable.name)
        .orderBy(desc(sql`sum(${invoiceItemTable.lineTotal})::numeric`))
        .limit(limit);

      return rows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        totalQuantity: Number(r.totalQuantity),
        totalRevenue: Number(r.totalRevenue),
      }));
    }),

  agingByCustomer: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.user.companyId;

    const rows = await ctx.db
      .select({
        customerId: invoiceTable.customerId,
        customerName: customerTable.name,
        bucket0_30: sql<string>`coalesce(sum(case when (current_date - (coalesce(${invoiceTable.dueDate}, ${invoiceTable.invoiceDate})::date)) between 0 and 30 then ${invoiceTable.totalAmount} else 0 end)::text, '0')`,
        bucket31_60: sql<string>`coalesce(sum(case when (current_date - (coalesce(${invoiceTable.dueDate}, ${invoiceTable.invoiceDate})::date)) between 31 and 60 then ${invoiceTable.totalAmount} else 0 end)::text, '0')`,
        bucket61_90: sql<string>`coalesce(sum(case when (current_date - (coalesce(${invoiceTable.dueDate}, ${invoiceTable.invoiceDate})::date)) between 61 and 90 then ${invoiceTable.totalAmount} else 0 end)::text, '0')`,
        bucket90_plus: sql<string>`coalesce(sum(case when (current_date - (coalesce(${invoiceTable.dueDate}, ${invoiceTable.invoiceDate})::date)) > 90 then ${invoiceTable.totalAmount} else 0 end)::text, '0')`,
      })
      .from(invoiceTable)
      .innerJoin(customerTable, eq(invoiceTable.customerId, customerTable.id))
      .where(
        and(
          eq(invoiceTable.companyId, companyId),
          sql`${invoiceTable.status} <> 'paid'`,
          sql`${invoiceTable.status} <> 'cancelled'`,
        ),
      )
      .groupBy(invoiceTable.customerId, customerTable.name)
      .orderBy(desc(sql`sum(${invoiceTable.totalAmount})::numeric`));

    return rows.map((r) => {
      const b0 = Number(r.bucket0_30);
      const b1 = Number(r.bucket31_60);
      const b2 = Number(r.bucket61_90);
      const b3 = Number(r.bucket90_plus);
      return {
        customerId: r.customerId,
        customerName: r.customerName,
        bucket0_30: b0,
        bucket31_60: b1,
        bucket61_90: b2,
        bucket90_plus: b3,
        total: b0 + b1 + b2 + b3,
      };
    });
  }),
});
