// Verifies R2 credentials, presigned PUT/GET, Range support, and CORS for the
// app origin. Never prints secret values. Usage: npm run r2:check
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

const env = process.env;
const missing = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
].filter((k) => !env[k]);
if (missing.length) {
  console.error(`✗ Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

// Origin headers never have a trailing slash; test local dev + the configured app URL.
const normalize = (url) => new URL(url).origin;
const origins = [
  ...new Set([
    "http://localhost:3000",
    normalize(env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  ]),
];
const origin = origins[0];
const Bucket = env.R2_BUCKET_NAME;
const client = new S3Client({
  region: "auto",
  endpoint:
    env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

let failed = 0;
const step = async (name, fn) => {
  try {
    const note = await fn();
    console.log(`✓ ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    failed++;
    console.log(
      `✗ ${name} — ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const Key = `_healthcheck/${Date.now()}.txt`;
const body = "%PDF-healthcheck";

console.log(`Bucket "${Bucket}", origins: ${origins.join(", ")}\n`);

await step("Bucket reachable with these credentials", async () => {
  await client.send(new HeadBucketCommand({ Bucket }));
});

let putUrl;
putUrl = await getSignedUrl(
  client,
  new PutObjectCommand({
    Bucket,
    Key,
    ContentType: "text/plain",
    ContentLength: body.length,
  }),
  {
    expiresIn: 60,
    signableHeaders: new Set(["content-type", "content-length"]),
  },
);
for (const o of origins) {
  await step(`CORS preflight for PUT from ${o}`, async () => {
    const res = await fetch(putUrl, {
      method: "OPTIONS",
      headers: {
        Origin: o,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    const allow = res.headers.get("access-control-allow-origin");
    if (!allow || (allow !== "*" && allow !== o)) {
      throw new Error(
        `origin not allowed (status ${res.status}). Add ${o} to the bucket CORS AllowedOrigins.`,
      );
    }
  });
}

await step("Presigned PUT upload", async () => {
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/plain", Origin: origin },
    body,
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
});

await step("Presigned PUT rejects a different size", async () => {
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: body + "extra",
  });
  if (res.ok)
    throw new Error(
      "upload with wrong size was accepted (Content-Length is not enforced)",
    );
  return `HTTP ${res.status}`;
});

let getUrl;
getUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket, Key }), {
  expiresIn: 60,
});
for (const o of origins) {
  await step(`CORS preflight for ranged GET from ${o}`, async () => {
    const res = await fetch(getUrl, {
      method: "OPTIONS",
      headers: {
        Origin: o,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "range",
      },
    });
    const allow = res.headers.get("access-control-allow-origin");
    const headers = (
      res.headers.get("access-control-allow-headers") || ""
    ).toLowerCase();
    if (!allow) throw new Error(`origin not allowed (status ${res.status})`);
    if (headers && headers !== "*" && !headers.includes("range"))
      throw new Error("'range' missing from AllowedHeaders");
  });
}

await step("Presigned ranged GET returns 206", async () => {
  const res = await fetch(getUrl, {
    headers: { Range: "bytes=0-4", Origin: origin },
  });
  const text = await res.text();
  if (res.status !== 206) throw new Error(`expected 206, got ${res.status}`);
  if (text !== "%PDF-")
    throw new Error(`unexpected bytes: ${JSON.stringify(text)}`);
  const exposed = (
    res.headers.get("access-control-expose-headers") || ""
  ).toLowerCase();
  if (!exposed.includes("content-range"))
    return "warning: Content-Range not in ExposeHeaders";
});

await step("Cleanup test object", async () => {
  await client.send(new DeleteObjectCommand({ Bucket, Key }));
});

console.log(
  failed ? `\n${failed} check(s) failed.` : "\nAll R2 checks passed.",
);
process.exit(failed ? 1 : 0);
