import { createStateUser } from "@cg-dump/core";
import { CreateStateUserSchema } from "@cg-dump/shared";

import { requireAdmin } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const limited = rateLimit(request, "admin:users", 30);
    if (limited) return limited;

    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = CreateStateUserSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const user = await createStateUser(parsed.data);
    return ok(
      {
        id: user.id,
        cognitoSub: user.cognitoSub,
        role: user.role,
        stateId: user.stateId,
        email: user.email
      },
      { status: 201 }
    );
  }, "Failed to create state user");
}
