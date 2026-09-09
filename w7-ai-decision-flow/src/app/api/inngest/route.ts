import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// App Router requires the individual verbs to be exported.
// PUT is what the Dev Server calls to register (sync) the functions.
export const { GET, POST, PUT } = serve({ client: inngest, functions });
