import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "OLD_SUPABASE_URL",
  "OLD_SUPABASE_ANON_KEY",
  "NEW_SUPABASE_URL",
  "NEW_SUPABASE_SERVICE_ROLE_KEY",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const BUCKETS = (process.env.MIGRATE_BUCKETS || "photos,avatars,verification")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const DOWNLOAD_DIR = path.resolve(
  process.env.MIGRATION_DOWNLOAD_DIR || "./tmp/storage-migration",
);

const oldClient = createClient(
  process.env.OLD_SUPABASE_URL,
  process.env.OLD_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

const newClient = createClient(
  process.env.NEW_SUPABASE_URL,
  process.env.NEW_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function listAllFiles(bucket, prefix = "") {
  const found = [];
  const queue = [prefix];

  while (queue.length > 0) {
    const currentPrefix = queue.shift() ?? "";
    const { data, error } = await oldClient.storage.from(bucket).list(currentPrefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Failed to list ${bucket}/${currentPrefix}: ${error.message}`);
    }

    for (const entry of data ?? []) {
      const entryPath = currentPrefix ? `${currentPrefix}/${entry.name}` : entry.name;
      const isFolder =
        entry.id === null ||
        entry.metadata === null ||
        entry.metadata === undefined;

      if (isFolder) {
        queue.push(entryPath);
      } else {
        found.push(entryPath);
      }
    }
  }

  return found;
}

async function downloadFile(bucket, filePath) {
  const { data, error } = await oldClient.storage.from(bucket).download(filePath);
  if (error) {
    throw new Error(`Failed to download ${bucket}/${filePath}: ${error.message}`);
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  const localPath = path.join(DOWNLOAD_DIR, bucket, filePath);
  await ensureDir(path.dirname(localPath));
  await fs.writeFile(localPath, bytes);
  return { bytes, localPath };
}

async function uploadFile(bucket, filePath, bytes) {
  const { error } = await newClient.storage.from(bucket).upload(filePath, bytes, {
    upsert: true,
    contentType: guessContentType(filePath),
  });

  if (error) {
    throw new Error(`Failed to upload ${bucket}/${filePath}: ${error.message}`);
  }
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".avif":
      return "image/avif";
    case ".mp4":
      return "video/mp4";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

async function migrateBucket(bucket) {
  console.log(`\n==> Scanning bucket: ${bucket}`);
  const files = await listAllFiles(bucket);
  console.log(`Found ${files.length} files in ${bucket}`);

  for (const [index, filePath] of files.entries()) {
    const progress = `[${index + 1}/${files.length}]`;
    console.log(`${progress} ${bucket}/${filePath}`);
    const { bytes } = await downloadFile(bucket, filePath);
    await uploadFile(bucket, filePath, bytes);
  }
}

async function main() {
  await ensureDir(DOWNLOAD_DIR);
  console.log(`Download cache: ${DOWNLOAD_DIR}`);
  console.log(`Buckets: ${BUCKETS.join(", ")}`);

  for (const bucket of BUCKETS) {
    await migrateBucket(bucket);
  }

  console.log("\nStorage migration completed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
