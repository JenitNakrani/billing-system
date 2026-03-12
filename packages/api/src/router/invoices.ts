import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import {
  invoice as invoiceTable,
  invoiceItem as invoiceItemTable,
  customer as customerTable,
  product as productTable,
  payment as paymentTable,
} from "@billing-system/db";
import { createTRPCRouter, protectedProcedure, subscriptionProcedure } from "../trpc";

const itemSchema = z.object({
  productId: z.string(),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional(),
  gstRate: z.number().min(0).max(100).optional(),
});

export const invoicesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(500).default(50),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const conditions = [eq(invoiceTable.companyId, ctx.user.companyId)];
      if (input?.cursor) conditions.push(lt(invoiceTable.id, input.cursor));
      const items = await ctx.db
        .select({
          id: invoiceTable.id,
          invoiceNumber: invoiceTable.invoiceNumber,
          customerId: invoiceTable.customerId,
          invoiceDate: invoiceTable.invoiceDate,
          status: invoiceTable.status,
          totalAmount: invoiceTable.totalAmount,
          createdAt: invoiceTable.createdAt,
          customerName: customerTable.name,
        })
        .from(invoiceTable)
        .innerJoin(customerTable, eq(invoiceTable.customerId, customerTable.id))
        .where(and(...conditions))
        .orderBy(desc(invoiceTable.createdAt), desc(invoiceTable.id))
        .limit(limit + 1);
      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop()!;
        nextCursor = next.id;
      }
      return {
        items: items.map((i) => ({
          ...i,
          customer: { id: i.customerId, name: i.customerName },
        })),
        nextCursor,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [inv] = await ctx.db
      .select()
      .from(invoiceTable)
      .where(and(eq(invoiceTable.id, input.id), eq(invoiceTable.companyId, ctx.user.companyId)))
      .limit(1);
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
    const [customer] = await ctx.db
      .select()
      .from(customerTable)
      .where(eq(customerTable.id, inv.customerId))
      .limit(1);
    const itemRows = await ctx.db
      .select({
        id: invoiceItemTable.id,
        invoiceId: invoiceItemTable.invoiceId,
        productId: invoiceItemTable.productId,
        description: invoiceItemTable.description,
        quantity: invoiceItemTable.quantity,
        unitPrice: invoiceItemTable.unitPrice,
        gstRate: invoiceItemTable.gstRate,
        lineTotal: invoiceItemTable.lineTotal,
        productName: productTable.name,
      })
      .from(invoiceItemTable)
      .innerJoin(productTable, eq(invoiceItemTable.productId, productTable.id))
      .where(eq(invoiceItemTable.invoiceId, inv.id));
    const paymentsForInvoice = await ctx.db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.invoiceId, inv.id));
    return {
      ...inv,
      customer: customer ?? undefined,
      items: itemRows.map((row) => ({
        id: row.id,
        invoiceId: row.invoiceId,
        productId: row.productId,
        description: row.description,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        gstRate: row.gstRate,
        lineTotal: row.lineTotal,
        product: { id: row.productId, name: row.productName },
      })),
      payments: paymentsForInvoice,
    };
  }),

  create: subscriptionProcedure
    .input(
      z.object({
        customerId: z.string(),
        invoiceDate: z.coerce.date(),
        items: z.array(itemSchema).min(1),
        discountAmount: z.number().min(0).default(0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.user.companyId;
      const [customer] = await ctx.db
        .select()
        .from(customerTable)
        .where(and(eq(customerTable.id, input.customerId), eq(customerTable.companyId, companyId)))
        .limit(1);
      if (!customer)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Customer not found" });

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoiceTable)
        .where(eq(invoiceTable.companyId, companyId));
      const count = countResult?.count ?? 0;
      const invoiceNumber = `INV-${String(count + 1).padStart(5, "0")}`;

      let subtotalSum = 0;
      let taxSum = 0;
      const lineItems: Array<{
        productId: string;
        description: string | null;
        quantity: string;
        unitPrice: string;
        gstRate: string;
        lineTotal: string;
      }> = [];

      for (const row of input.items) {
        const [product] = await ctx.db
          .select()
          .from(productTable)
          .where(and(eq(productTable.id, row.productId), eq(productTable.companyId, companyId)))
          .limit(1);
        if (!product)
          throw new TRPCError({ code: "BAD_REQUEST", message: `Product ${row.productId} not found` });
        const qty = row.quantity;
        const price = row.unitPrice ?? Number(product.price);
        const gstRate = row.gstRate ?? Number(product.gstRate);
        const lineTotalBeforeTax = price * qty;
        const tax = (lineTotalBeforeTax * gstRate) / 100;
        const lineTotal = lineTotalBeforeTax + tax;
        subtotalSum += lineTotal;
        taxSum += tax;
        lineItems.push({
          productId: product.id,
          description: row.description ?? null,
          quantity: String(qty),
          unitPrice: String(price),
          gstRate: String(gstRate),
          lineTotal: String(lineTotal),
        });
      }

      const discountAmount = input.discountAmount;
      const totalAmount = subtotalSum - discountAmount;

      const [invoice] = await ctx.db
        .insert(invoiceTable)
        .values({
          companyId,
          invoiceNumber,
          customerId: input.customerId,
          invoiceDate: input.invoiceDate,
          subtotal: String(subtotalSum),
          discountAmount: String(discountAmount),
          taxAmount: String(taxSum),
          totalAmount: String(totalAmount),
          notes: input.notes,
        })
        .returning();
      if (!invoice) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      for (const item of lineItems) {
        await ctx.db.insert(invoiceItemTable).values({
          invoiceId: invoice.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          lineTotal: item.lineTotal,
        });
      }

      const createdItemRows = await ctx.db
        .select({
          id: invoiceItemTable.id,
          invoiceId: invoiceItemTable.invoiceId,
          productId: invoiceItemTable.productId,
          description: invoiceItemTable.description,
          quantity: invoiceItemTable.quantity,
          unitPrice: invoiceItemTable.unitPrice,
          gstRate: invoiceItemTable.gstRate,
          lineTotal: invoiceItemTable.lineTotal,
          productName: productTable.name,
        })
        .from(invoiceItemTable)
        .innerJoin(productTable, eq(invoiceItemTable.productId, productTable.id))
        .where(eq(invoiceItemTable.invoiceId, invoice.id));
      return {
        ...invoice,
        customer,
        items: createdItemRows.map((row) => ({
          id: row.id,
          invoiceId: row.invoiceId,
          productId: row.productId,
          description: row.description,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          gstRate: row.gstRate,
          lineTotal: row.lineTotal,
          product: { id: row.productId, name: row.productName },
        })),
      };
    }),
});
