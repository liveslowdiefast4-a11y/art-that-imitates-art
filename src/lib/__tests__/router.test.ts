import { describe, expect, it } from "vitest";
import { appRouter } from "../trpc";

describe("tRPC substrate", () => {
  it("returns a validated health snapshot through a typed caller", async () => {
    const caller = appRouter.createCaller({});

    await expect(caller.health()).resolves.toEqual({
      status: "ready",
      service: "atia",
    });
  });
});
