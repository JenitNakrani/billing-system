import { appRouter } from "./root";
import { createTRPCContext, createCallerFactory } from "./trpc";

export { appRouter } from "./root";
export { createTRPCContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);
export { createCaller };

export type { AppRouter, AppRouterInput, AppRouterOutput } from "./root";
export type { SessionUser } from "./trpc";
