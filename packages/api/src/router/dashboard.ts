import { startOfMonth } from "date-fns";
import { eq, and, gte, ne, desc, lt, sql, inArray } from "drizzle-orm";
import { invoice as invoiceTable, payment as paymentTable, customer as customerTable } from "@billing-system/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.user.companyId;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [invoiceStats] = await ctx.db
      .select({
        totalAmount: sql<string>`coalesce(sum(${invoiceTable.totalAmount})::text, '0')`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoiceTable)
      .where(
        and(
          eq(invoiceTable.companyId, companyId),
          gte(invoiceTable.createdAt, monthStart),
          ne(invoiceTable.status, "cancelled"),
        ),
      );

    const recentInvoices = await ctx.db
      .select({
        id: invoiceTable.id,
        invoiceNumber: invoiceTable.invoiceNumber,
        totalAmount: invoiceTable.totalAmount,
        status: invoiceTable.status,
        createdAt: invoiceTable.createdAt,
        customerName: customerTable.name,
      })
      .from(invoiceTable)
      .innerJoin(customerTable, eq(invoiceTable.customerId, customerTable.id))
      .where(eq(invoiceTable.companyId, companyId))
      .orderBy(desc(invoiceTable.createdAt))
      .limit(5);

    const [totalPaymentsThisMonth] = await ctx.db
      .select({
        total: sql<string>`coalesce(sum(${paymentTable.amount})::text, '0')`,
      })
      .from(paymentTable)
      .where(
        and(
          eq(paymentTable.companyId, companyId),
          gte(paymentTable.paymentDate, monthStart),
        ),
      );

    const overdueInvoices = await ctx.db
      .select({
        id: invoiceTable.id,
        invoiceNumber: invoiceTable.invoiceNumber,
        totalAmount: invoiceTable.totalAmount,
        dueDate: invoiceTable.dueDate,
        customerName: customerTable.name,
      })
      .from(invoiceTable)
      .innerJoin(customerTable, eq(invoiceTable.customerId, customerTable.id))
      .where(
        and(
          eq(invoiceTable.companyId, companyId),
          sql`${invoiceTable.dueDate} IS NOT NULL`,
          lt(invoiceTable.dueDate!, startOfToday),
          ne(invoiceTable.status, "paid"),
        ),
      )
      .orderBy(invoiceTable.dueDate)
      .limit(5);

    const overdueIds = overdueInvoices.map((o) => o.id);
    let overdueAmount = 0;
    if (overdueIds.length > 0) {
      const paymentsByInvoice = await ctx.db
        .select({
          invoiceId: paymentTable.invoiceId,
          total: sql<string>`coalesce(sum(${paymentTable.amount})::text, '0')`,
        })
        .from(paymentTable)
        .where(inArray(paymentTable.invoiceId, overdueIds))
        .groupBy(paymentTable.invoiceId);
      const paidPerInvoice = new Map(
        paymentsByInvoice.map((p) => [p.invoiceId, Number(p.total)]),
      );
      overdueAmount = overdueInvoices.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.totalAmount) - (paidPerInvoice.get(inv.id) ?? 0)),
        0,
      );
    }

    const totalSales = Number(invoiceStats?.totalAmount ?? 0);
    const invoiceCount = invoiceStats?.count ?? 0;
    const totalReceived = Number(totalPaymentsThisMonth?.total ?? 0);
    const pendingAmount = totalSales - totalReceived;

    return {
      totalSales,
      invoiceCount,
      totalReceived,
      pendingAmount,
      overdueAmount,
      recentInvoices: recentInvoices.map((i) => ({
        ...i,
        customer: { name: i.customerName },
      })),
      topOverdueInvoices: overdueInvoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        totalAmount: i.totalAmount,
        dueDate: i.dueDate,
        customer: { name: i.customerName },
      })),
    };
  }),
});
