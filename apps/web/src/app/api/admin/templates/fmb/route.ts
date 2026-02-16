import { seedFmbTemplate } from "@cg-dump/core";

import { requireAdmin } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { ok } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request, "admin:templates:fmb", 20);
  if (limited) return limited;

  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const template = await seedFmbTemplate();
    return ok({
      id: template.id,
      code: template.code,
      name: template.name
    });
  } catch (error) {
    return handleDomainError(error, "Failed to seed FMB template");
  }
}
