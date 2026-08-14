import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const bucket = process.env.S3_BUCKET!;

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function uploadReceiptFile(
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<string> {
  const key = `comprobantes/${randomUUID()}.${extension}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getFileSignedUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: fileKey });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
