import { z } from "zod";

import { withAuth } from "@/server/auth";
import { err, ok } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createPresignedDownloadUrl } from "@/server/s3";

export const runtime = "nodejs";

const bodySchema = z.object({
  key: z.string().min(1)
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "storage:presign-download", 120);
  if (limited) return limited;

  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const presigned = await createPresignedDownloadUrl(parsed.data.key);
    return ok({
      bucket: presigned.bucket,
      key: presigned.key,
      downloadUrl: presigned.url,
      expiresInSeconds: 600
    });
  } catch (error) {
    return err(500, "Failed to create download URL", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
