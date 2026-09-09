import { ping } from "@/lib/inngest/functions/ping";
import { runFlow } from "@/lib/inngest/functions/runFlow";

export const functions = [ping, runFlow];
