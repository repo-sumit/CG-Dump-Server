import { createOrUpdateTemplate } from "@cg-dump/core";
import { CreateTemplateSchema } from "@cg-dump/shared";

import { withAuth } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request, "admin:templates", 40);
  if (limited) return limited;

  const auth = await withAuth(request, "admin");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = CreateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const template = await createOrUpdateTemplate(parsed.data);
    return ok(
      {
        id: template.id,
        code: template.code,
        name: template.name
      },
      { status: 201 }
    );
  } catch (error) {
    return handleDomainError(error, "Failed to create template");
  }
}
