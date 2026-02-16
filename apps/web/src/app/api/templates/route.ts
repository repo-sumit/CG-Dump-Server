import { listTemplates } from "@cg-dump/core";

import { withAuth } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const productCode = searchParams.get("productCode");
  if (!productCode) {
    return err(400, "productCode query param is required");
  }

  try {
    const templates = await listTemplates(auth.context, productCode);
    return ok(
      templates.map((template) => ({
        id: template.id,
        code: template.code,
        name: template.name,
        schema: template.schema
      }))
    );
  } catch (error) {
    return handleDomainError(error, "Failed to list templates");
  }
}
