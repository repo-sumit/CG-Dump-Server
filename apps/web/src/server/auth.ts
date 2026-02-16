import type { UserRole } from "@cg-dump/shared";
import { requireAuth, type AuthContext } from "@cg-dump/core";

export async function withAuth(
  request: Request,
  role?: UserRole | UserRole[]
): Promise<{ ok: true; context: AuthContext } | { ok: false; response: Response }> {
  const auth = await requireAuth(request, role);
  if (!auth.ok) {
    return {
      ok: false,
      response: Response.json(
        {
          error: auth.error,
          details: auth.details
        },
        { status: auth.status }
      )
    };
  }
  return { ok: true, context: auth.context };
}

export async function requireAdmin(request: Request) {
  return withAuth(request, "admin");
}

export async function requireStateUser(request: Request) {
  return withAuth(request, "state_user");
}
