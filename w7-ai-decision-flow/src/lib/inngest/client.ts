import { Inngest } from "inngest";
import { env } from "@/lib/env";

export const inngest = new Inngest({
  id: "ai-decision-flow",
  isDev: env.INNGEST_DEV,
});
