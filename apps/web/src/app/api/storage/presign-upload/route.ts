import { z } from "zod";

import { withAuth } from "@/server/auth";
import { config } from "@/server/config";
import { err, ok } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createPresignedUploadUrl } from "@/server/s3";

export const runtime = "nodejs";

const bodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(3),
  datasetId: z.string().optional()
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "storage:presign-upload", 80);
  if (limited) return limited;

  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const prefix = parsed.data.datasetId
      ? `${config.S3_UPLOAD_PREFIX}/${parsed.data.datasetId}`
      : `${config.S3_UPLOAD_PREFIX}/common`;
    const key = `${prefix}/${Date.now()}-${safeName}`;
    const presigned = await createPresignedUploadUrl(key, parsed.data.contentType);

    return ok({
      bucket: presigned.bucket,
      key: presigned.key,
      uploadUrl: presigned.url,
      expiresInSeconds: 600
    });
  } catch (error) {
    return err(500, "Failed to create upload URL", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
