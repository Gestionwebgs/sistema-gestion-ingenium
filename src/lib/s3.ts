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

// En local (MinIO) usamos access key/secret fijos por variable de entorno.
// En el servidor de producción (EC2) NO seteamos S3_ACCESS_KEY_ID/SECRET —
// dejamos que el SDK de AWS tome las credenciales automáticamente del rol
// IAM de la instancia (más seguro: nada de claves de larga duración
// guardadas en el .env del servidor, y AWS las rota solo). Por eso las
// credenciales explícitas son opcionales: si no están seteadas, el
// S3Client cae solo al "default credential provider chain".
const explicitCredentials =
  process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      }
    : undefined;

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  ...(explicitCredentials ? { credentials: explicitCredentials } : {}),
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

// Extensión de archivo a partir del content-type, para nombrar el objeto en
// S3/MinIO. Usado tanto en la captura por OCR como en la carga manual de
// comprobantes al registrar/editar un gasto.
export function extensionForContentType(contentType: string): string {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

// Descarga un archivo completo (no una URL firmada) para poder incluirlo en
// el .zip mensual de comprobantes para los contadores.
export async function downloadFileBuffer(fileKey: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: fileKey });
  const response = await s3.send(command);
  const byteArray = await response.Body!.transformToByteArray();
  return Buffer.from(byteArray);
}
