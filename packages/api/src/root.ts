import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "./trpc";
import { authRouter } from "./router/auth";
import { companyRouter } from "./router/company";
import { customersRouter } from "./router/customers";
import { productsRouter } from "./router/products";
import { invoicesRouter } from "./router/invoices";
import { paymentsRouter } from "./router/payments";
import { dashboardRouter } from "./router/dashboard";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  company: companyRouter,
  customers: customersRouter,
  products: productsRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
export type AppRouterInput = inferRouterInputs<AppRouter>;
export type AppRouterOutput = inferRouterOutputs<AppRouter>;
