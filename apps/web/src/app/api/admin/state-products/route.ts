import { setStateProductEnablement } from "@cg-dump/core";
import { SetStateProductSchema } from "@cg-dump/shared";

import { requireAdmin } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  return withErrorBoundary(async () => {
    const limited = rateLimit(request, "admin:state-products", 40);
    if (limited) return limited;

    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = SetStateProductSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const record = await setStateProductEnablement(parsed.data);
    return ok({
      state: {
        id: record.state.id,
        code: record.state.code,
        name: record.state.name
      },
      product: {
        id: record.product.id,
        code: record.product.code,
        name: record.product.name
      },
      enabled: record.enabled
    });
  }, "Failed to update state product enablement");
}
