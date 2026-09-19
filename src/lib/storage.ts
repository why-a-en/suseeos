import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 speaks the S3 API — see docs/TECH_STACK.md.
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  // Without this, every presigned upload below is signed with a checksum of
  // the wrong bytes and R2 rejects the PUT.
  //
  // Since v3.729 the AWS SDK defaults to "WHEN_SUPPORTED", which attaches an
  // integrity checksum to PutObject. For a normal upload the SDK has the body
  // and computes it correctly — but presigning has no body, so it computes
  // CRC32 of *nothing* and bakes the result into the URL as a signed query
  // parameter (`x-amz-checksum-crc32=AAAAAA==`, the empty-input CRC32). The
  // browser then PUTs the real file, R2 checksums what actually arrived,
  // finds it doesn't match what the URL promised, and refuses.
  //
  // The failure is badly disguised: R2's rejection carries no
  // Access-Control-Allow-Origin header, so the browser reports a CORS error
  // rather than the 403 underneath it, which points debugging straight at
  // the bucket's CORS policy — where there is nothing wrong.
  //
  // "WHEN_REQUIRED" keeps checksums for the operations that genuinely
  // mandate them and drops them here. Verify after changing this: the
  // presigned URL must contain no `x-amz-checksum-*` query parameter.
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * A short-lived URL the browser can PUT an image to directly, bypassing our
 * server entirely. Deliberate for mobile: proxying image bytes through a
 * serverless function adds a payload/time-limit ceiling that's a bad fit for
 * the slow/variable mobile networks this app targets (docs/TECH_STACK.md §6)
 * — direct-to-R2 upload with client-side retry is more resilient.
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
  return { uploadUrl, publicUrl: getPublicUrl(key) };
}

export function getPublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/** Namespaced, collision-resistant object key for an uploaded image. */
export function buildImageKey(
  organizationId: string,
  kind: "product" | "order",
  filename: string,
): string {
  const ext = filename.split(".").pop() ?? "jpg";
  const random = crypto.randomUUID();
  return `${organizationId}/${kind}/${random}.${ext}`;
}
