import { z } from "zod";
import { eq } from "drizzle-orm";
import { company as companyTable } from "@billing-system/db";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";

export const companyRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [company] = await ctx.db
      .select()
      .from(companyTable)
      .where(eq(companyTable.id, ctx.user.companyId))
      .limit(1);
    if (!company) throw new Error("Company not found");
    return company;
  }),

  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().optional(),
        gstin: z.string().optional(),
        pan: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        logoUrl: z.string().url().optional(),
        invoiceTitle: z.string().max(100).optional(),
        invoicePrefix: z.string().max(20).optional(),
        invoiceNextNumber: z.number().int().min(1).optional(),
        bankName: z.string().optional(),
        bankBranch: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        bankIfsc: z.string().optional(),
        bankSwift: z.string().optional(),
        bankBeneficiary: z.string().optional(),
        footerDisclaimer: z.string().optional(),
        footerDeclaration: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(companyTable)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(companyTable.id, ctx.user.companyId))
        .returning();
      if (!updated) throw new Error("Company not found");
      return updated;
    }),
});
