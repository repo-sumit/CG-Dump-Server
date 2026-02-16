import { createState } from "@cg-dump/core";
import { CreateStateSchema } from "@cg-dump/shared";

import { requireAdmin } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const limited = rateLimit(request, "admin:states", 30);
    if (limited) return limited;

    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = CreateStateSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const state = await createState(parsed.data);
    return ok(
      {
        id: state.id,
        code: state.code,
        name: state.name
      },
      { status: 201 }
    );
  }, "Failed to create state");
}
