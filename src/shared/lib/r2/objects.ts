import "server-only";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2Bucket, getR2Client } from "./client";

/**
 * Presigned PUT with Content-Type and Content-Length baked into the
 * signature, so the browser can only upload exactly the declared file.
 */
export function presignPut(params: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}): Promise<string> {
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    }),
    {
      expiresIn: params.expiresInSeconds ?? 15 * 60,
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
}

/** Short-lived presigned GET. Callers must check ownership first. */
export function presignGet(params: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: getR2Bucket(), Key: params.key }),
    { expiresIn: params.expiresInSeconds ?? 5 * 60 },
  );
}

export async function headObject(
  key: string,
): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const res = await getR2Client().send(
      new HeadObjectCommand({ Bucket: getR2Bucket(), Key: key }),
    );
    return { size: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch (error) {
    if (error instanceof NotFound) return null;
    if (
      error instanceof Error &&
      "$metadata" in error &&
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

/** Reads the first `length` bytes of an object (Range request). */
export async function readObjectPrefix(
  key: string,
  length: number,
): Promise<Uint8Array> {
  const res = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Range: `bytes=0-${length - 1}`,
    }),
  );
  if (!res.Body) return new Uint8Array();
  return res.Body.transformToByteArray();
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const res = await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: getR2Bucket(),
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  );
  if (res.Errors && res.Errors.length > 0) {
    throw new Error(
      `R2 delete failed for: ${res.Errors.map((e) => e.Key).join(", ")}`,
    );
  }
}
