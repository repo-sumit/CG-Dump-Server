import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { prisma } from "@cg-dump/db";
import type { UserRole } from "@cg-dump/shared";

const AUTH_BYPASS = String(process.env.AUTH_BYPASS || "").toLowerCase() === "true";

const issuer =
  process.env.COGNITO_ISSUER ||
  (process.env.COGNITO_USER_POOL_ID && process.env.AWS_REGION
    ? `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
    : undefined);

const jwksUrl = process.env.COGNITO_JWKS_URL || (issuer ? `${issuer}/.well-known/jwks.json` : undefined);
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export type AuthContext = {
  role: UserRole;
  cognitoSub: string;
  groups: string[];
  tokenStateId: string | null;
  user: {
    id: string;
    role: UserRole;
    stateId: string;
    cognitoSub: string;
    email: string | null;
  };
};

function getTokenStateClaim(payload: JWTPayload): string | null {
  const candidates = [
    payload["custom:state_id"],
    payload["state_id"],
    payload["stateId"],
    payload["custom:state_code"],
    payload["state_code"]
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }
    const value = String(candidate).trim();
    if (value) {
      return value;
    }
  }

  return null;
}

async function resolveStateIdFromTokenClaim(stateClaim: string): Promise<string | null> {
  const claim = stateClaim.trim();
  if (!claim) {
    return null;
  }

  const byId = await prisma.state.findUnique({
    where: { id: claim },
    select: { id: true }
  });
  if (byId) {
    return byId.id;
  }

  const byCode = await prisma.state.findUnique({
    where: { code: claim.toUpperCase() },
    select: { id: true }
  });
  if (byCode) {
    return byCode.id;
  }

  return null;
}

async function resolveDevStateId(request: Request): Promise<string> {
  const rawCode = request.headers.get("x-dev-state") || "DEV_STATE";
  const code = rawCode.trim().toUpperCase();
  const state = await prisma.state.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name: code
    }
  });
  return state.id;
}

function getGroups(payload: JWTPayload): string[] {
  const groups = payload["cognito:groups"];
  if (!groups) return [];
  if (Array.isArray(groups)) {
    return groups.map((g) => String(g));
  }
  return [String(groups)];
}

function roleFromGroups(groups: string[]): UserRole | null {
  const normalized = groups.map((group) => group.trim().toLowerCase());
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("state_user")) return "state_user";
  return null;
}

function ensureRole(expected: UserRole | UserRole[] | undefined, role: UserRole): boolean {
  if (!expected) return true;
  if (Array.isArray(expected)) return expected.includes(role);
  return expected === role;
}

async function verifyToken(token: string): Promise<JWTPayload> {
  if (!issuer || !jwks) {
    throw new Error("Cognito issuer/JWKS is not configured");
  }

  const verifyOptions: Parameters<typeof jwtVerify>[2] = {
    issuer
  };

  if (process.env.COGNITO_CLIENT_ID) {
    verifyOptions.audience = process.env.COGNITO_CLIENT_ID;
  }

  const verified = await jwtVerify(token, jwks, verifyOptions);
  return verified.payload;
}

export async function requireAuth(
  request: Request,
  expectedRole?: UserRole | UserRole[]
): Promise<{ ok: true; context: AuthContext } | { ok: false; status: number; error: string; details?: unknown }> {
  if (AUTH_BYPASS) {
    const roleHeader = request.headers.get("x-dev-role");
    const role = roleHeader === "admin" ? "admin" : "state_user";
    const sub = request.headers.get("x-dev-sub") || `dev-${role}`;
    const email = request.headers.get("x-dev-email") || `dev-${role}@local.test`;
    const stateId = await resolveDevStateId(request);
    let user = await prisma.user.findUnique({ where: { cognitoSub: sub } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          cognitoSub: sub,
          email,
          role,
          stateId
        }
      });
    } else if (user.stateId !== stateId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { stateId }
      });
    }
    if (!ensureRole(expectedRole, role)) {
      return { ok: false, status: 403, error: "Forbidden", details: { role } };
    }
    const resolvedStateId = user.stateId ?? stateId;
    return {
      ok: true,
      context: {
        role,
        cognitoSub: sub,
        groups: [role],
        tokenStateId: stateId,
        user: {
          id: user.id,
          role: user.role,
          stateId: resolvedStateId,
          cognitoSub: user.cognitoSub,
          email: user.email
        }
      }
    };
  }

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized", details: { message: "Missing bearer token" } };
  }

  const token = authHeader.slice("Bearer ".length);
  let payload: JWTPayload;
  try {
    payload = await verifyToken(token);
  } catch (error) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      details: { message: error instanceof Error ? error.message : "Token verification failed" }
    };
  }

  const groups = getGroups(payload);
  const role = roleFromGroups(groups);
  if (!role) {
    return { ok: false, status: 403, error: "Forbidden", details: { message: "Role is missing in Cognito groups claim" } };
  }

  const tokenStateClaim = getTokenStateClaim(payload);
  const tokenStateId = tokenStateClaim ? await resolveStateIdFromTokenClaim(tokenStateClaim) : null;
  if (role === "state_user" && !tokenStateId) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      details: { message: "state_id claim is missing or invalid in token" }
    };
  }

  if (!ensureRole(expectedRole, role)) {
    return { ok: false, status: 403, error: "Forbidden", details: { role } };
  }

  const cognitoSub = String(payload.sub || "");
  if (!cognitoSub) {
    return { ok: false, status: 401, error: "Unauthorized", details: { message: "Token sub claim is required" } };
  }
  const email = payload.email ? String(payload.email) : null;

  let user = await prisma.user.findUnique({
    where: { cognitoSub }
  });

  if (!user) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      details: { message: "User is not provisioned in platform database" }
    };
  }
  if (!user.stateId) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      details: { message: "User is missing required state assignment" }
    };
  }
  if (user.role !== role) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      details: { message: "User role does not match Cognito token role" }
    };
  }
  if (tokenStateId && user.stateId !== tokenStateId) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      details: { message: "User state assignment does not match token state_id claim" }
    };
  }

  return {
    ok: true,
    context: {
      role,
      cognitoSub,
      groups,
      tokenStateId,
      user: {
        id: user.id,
        role: user.role,
        stateId: user.stateId,
        cognitoSub: user.cognitoSub,
        email: user.email
      }
    }
  };
}
