import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

import { getOptionalServerEnv, getServerEnv } from "@/shared/config/env";

let client: S3Client | undefined;

export function getR2Client(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint:
      getOptionalServerEnv("R2_ENDPOINT") ??
      `https://${getServerEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getServerEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getServerEnv("R2_SECRET_ACCESS_KEY"),
    },
    // Newer SDK versions add CRC32 checksum params to every request by
    // default. Browsers can't compute them for presigned PUTs and R2 would
    // reject the upload, so only send checksums when an operation requires it.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

export const getR2Bucket = (): string => getServerEnv("R2_BUCKET_NAME");
