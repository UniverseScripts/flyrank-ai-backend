import { env } from "@/lib/env";

export async function GET() {
  // `stub` lets the smoke suite refuse to run against a server wired to a real
  // provider: the tests script their branches with [stub:…] markers, which a
  // live model would ignore.
  return Response.json({ status: "ok", stub: env.LLM_STUB });
}
