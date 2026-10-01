import { initTRPC } from "@trpc/server";

import { healthSnapshotSchema } from "./health";

type Context = Record<string, never>;

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  health: t.procedure.output(healthSnapshotSchema).query(() => ({
    status: "ready" as const,
    service: "atia" as const,
  })),
});

export type AppRouter = typeof appRouter;
