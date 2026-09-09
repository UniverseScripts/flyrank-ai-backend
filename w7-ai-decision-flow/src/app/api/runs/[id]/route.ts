import type { NextRequest } from "next/server";
import { getRun } from "@/lib/store/runs";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/runs/[id]">) {
  // Next 16 hands params over as a promise.
  const { id } = await ctx.params;

  const run = getRun(id);
  if (!run) return Response.json({ error: "Run not found." }, { status: 404 });

  return Response.json(run);
}
