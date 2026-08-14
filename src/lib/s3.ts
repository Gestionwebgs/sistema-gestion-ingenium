import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
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

// En una instalación nueva (MinIO local recién levantado, o una cuenta AWS
// nueva) el bucket no existe todavía y nadie lo crea a mano — se comprueba
// una vez por proceso y se crea si hace falta. Si las credenciales no tienen
// permiso para crear buckets (típico en un S3 real de producción con IAM
// restringido), se ignora el error y se deja que la subida real falle con un
// mensaje más claro de S3.
let bucketReady: Promise<void> | null = null;
function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch {
        try {
          await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        } catch {
          // Sin permiso para crear buckets, o error transitorio — seguimos;
          // la subida real dará el error verdadero si el bucket sigue sin existir.
        }
      }
    })();
  }
  return bucketReady;
}

export async function uploadReceiptFile(
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<string> {
  await ensureBucket();
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
