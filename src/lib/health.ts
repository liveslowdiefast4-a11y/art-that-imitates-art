import { z } from "zod";

export const healthSnapshotSchema = z
  .object({
    status: z.literal("ready"),
    service: z.literal("atia"),
  })
  .strict();

export type HealthSnapshot = z.infer<typeof healthSnapshotSchema>;

export function parseHealthSnapshot(input: unknown): HealthSnapshot {
  return healthSnapshotSchema.parse(input);
}
