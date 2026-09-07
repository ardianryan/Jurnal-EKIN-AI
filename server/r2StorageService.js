// Service Integrasi Cloudflare R2 / S3 Object Storage dengan Presigned Token
// Didesain ringan: Client langsung mengunggah berkas ke R2 tanpa membebani RAM/CPU server.

import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand 
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import crypto from "crypto";

let cachedClient = null;

/**
 * Memeriksa apakah konfigurasi R2 lengkap di environment
 */
export function isR2Configured() {
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET_NAME;

  return Boolean(
    accessKey && accessKey.trim() &&
    secretKey && secretKey.trim() &&
    endpoint && endpoint.trim() &&
    bucket && bucket.trim()
  );
}

/**
 * Mendapatkan instance S3Client (Singleton)
 */
export function getR2Client() {
  if (!isR2Configured()) return null;
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: (process.env.R2_ACCESS_KEY_ID || "").trim(),
      secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "").trim(),
    },
    forcePathStyle: process.env.R2_USE_PATH_STYLE_ENDPOINT === "true",
  });

  return cachedClient;
}

/**
 * Mendapatkan nama folder root di bucket (default: ekinsmansage)
 */
export function getR2FolderPath() {
  const folder = (process.env.R2_FOLDER_PATH || "ekinsmansage").trim();
  return folder.replace(/^\/+|\/+$/g, "");
}

/**
 * Mendapatkan Public Base URL R2 (misal: https://static-r2-apac.ppti.me)
 */
export function getR2PublicBaseUrl() {
  const publicUrl = (process.env.R2_PUBLIC_URL || "").trim();
  if (publicUrl) {
    return publicUrl.replace(/\/+$/, "");
  }
  // Fallback ke format endpoint S3 jika public domain tidak disetel
  const endpoint = (process.env.R2_ENDPOINT || "").trim().replace(/\/+$/, "");
  const bucket = (process.env.R2_BUCKET_NAME || "").trim();
  return `${endpoint}/${bucket}`;
}

/**
 * Menghasilkan Presigned PUT URL untuk Direct Upload dari browser
 * @param {Object} options
 * @param {string} options.fileName - Nama berkas asli (misal: surat_tugas.pdf)
 * @param {string} options.fileType - MIME type (misal: application/pdf)
 * @param {string} options.tanggal - Tanggal jurnal (YYYY-MM-DD)
 * @param {number} [options.expiresIn=3600] - Masa berlaku token presign dalam detik
 */
export async function generatePresignedUploadUrl({ fileName = "dokumen.pdf", fileType = "application/octet-stream", tanggal = "", expiresIn = 3600 }) {
  if (!isR2Configured()) {
    return {
      success: false,
      mode: "local",
      error: "Cloudflare R2 tidak dikonfigurasi di environment."
    };
  }

  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const folder = getR2FolderPath();
  const publicBase = getR2PublicBaseUrl();

  // Bersihkan dan amankan nama berkas
  const ext = path.extname(fileName).toLowerCase() || (fileType.includes("image") ? ".jpg" : ".pdf");
  const baseName = path.basename(fileName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "berkas";

  // Tanggal periode (YYYY-MM)
  let periodTag = "";
  if (tanggal && typeof tanggal === "string" && tanggal.includes("-")) {
    const parts = tanggal.split("-");
    if (parts.length >= 2) {
      periodTag = `${parts[0]}-${String(parts[1]).padStart(2, "0")}`;
    }
  }
  if (!periodTag) {
    const now = new Date();
    periodTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const uniqueId = `${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const storedName = `${periodTag}_${baseName}_${uniqueId}${ext}`;
  const objectKey = folder ? `${folder}/${storedName}` : storedName;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: fileType,
  });

  const presignedUrl = await getSignedUrl(client, command, { expiresIn });
  const publicUrl = `${publicBase}/${objectKey}`;

  return {
    success: true,
    mode: "r2",
    presignedUrl,
    publicUrl,
    key: objectKey,
    storedName,
    fileName: `${baseName}${ext}`,
    folder,
    bucket
  };
}

/**
 * Mengunggah Buffer secara langsung ke R2 (digunakan oleh Telegram Bot / Server)
 * @param {Buffer} buffer - Buffer data berkas
 * @param {string} fileName - Nama berkas
 * @param {string} contentType - MIME Type berkas
 * @param {string} [tanggal=""] - Tanggal untuk penamaan periode
 */
export async function uploadBufferToR2(buffer, fileName, contentType = "application/octet-stream", tanggal = "") {
  if (!isR2Configured()) {
    throw new Error("R2 tidak dikonfigurasi");
  }

  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const folder = getR2FolderPath();
  const publicBase = getR2PublicBaseUrl();

  const ext = path.extname(fileName).toLowerCase() || ".jpg";
  const baseName = path.basename(fileName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 40) || "berkas";

  let periodTag = "";
  if (tanggal && typeof tanggal === "string" && tanggal.includes("-")) {
    const parts = tanggal.split("-");
    if (parts.length >= 2) {
      periodTag = `${parts[0]}-${String(parts[1]).padStart(2, "0")}`;
    }
  }
  if (!periodTag) {
    const now = new Date();
    periodTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const uniqueId = `${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const storedName = `${periodTag}_${baseName}_${uniqueId}${ext}`;
  const objectKey = folder ? `${folder}/${storedName}` : storedName;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: contentType,
  }));

  const publicUrl = `${publicBase}/${objectKey}`;

  return {
    publicUrl,
    key: objectKey,
    storedName,
    fileName: `${baseName}${ext}`
  };
}

/**
 * Menghapus objek dari Cloudflare R2 / S3
 * @param {string} keyOrUrl - URL lengkap atau Key objek R2
 */
export async function deleteR2Object(keyOrUrl) {
  if (!isR2Configured() || !keyOrUrl) return false;

  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = getR2PublicBaseUrl();
  const folder = getR2FolderPath();

  let objectKey = keyOrUrl;

  // Jika input berupa public URL, ekstrak object key-nya
  if (objectKey.startsWith(publicBase)) {
    objectKey = objectKey.slice(publicBase.length).replace(/^\/+/, "");
  } else if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
    try {
      const u = new URL(objectKey);
      objectKey = u.pathname.replace(/^\/+/, "");
      // Jika path diawali nama bucket, hapus
      if (objectKey.startsWith(bucket + "/")) {
        objectKey = objectKey.slice((bucket + "/").length);
      }
    } catch (e) {}
  }

  // Jika key belum diawali folder root dan folder diatur, sesuaikan
  if (folder && !objectKey.startsWith(folder + "/")) {
    // Cek apakah key hanya nama berkas
    if (!objectKey.includes("/")) {
      objectKey = `${folder}/${objectKey}`;
    }
  }

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey
    }));
    return true;
  } catch (err) {
    console.warn("Gagal menghapus objek R2:", objectKey, err.message);
    return false;
  }
}

/**
 * Mendapatkan metadata status R2 untuk diekspos ke frontend (tanpa membocorkan secret)
 */
export function getR2Status() {
  const configured = isR2Configured();
  return {
    enabled: configured,
    mode: configured ? "r2" : "local",
    folderPath: configured ? getR2FolderPath() : null,
    publicUrl: configured ? getR2PublicBaseUrl() : null,
    bucket: configured ? process.env.R2_BUCKET_NAME : null
  };
}

/**
 * Mengekstrak tahun dari nama berkas atau Key objek R2
 * Format berkas yang didukung:
 * - "ekinsmansage/2024-05_surat_tugas.pdf" -> 2024
 * - "ekinsmansage/Januari_2025_foto.jpg" -> 2025
 * - Menggunakan metadata LastModified jika nama tidak memuat tahun
 * @param {string} key
 * @param {Date|string} lastModified
 * @returns {number|null}
 */
export function extractYearFromKeyOrDate(key, lastModified) {
  if (key) {
    const base = path.basename(key);
    // 1. Pola ISO YYYY-MM diawal nama: 2024-05_...
    const mIso = base.match(/^(\d{4})[-_]/);
    if (mIso) {
      const yr = parseInt(mIso[1], 10);
      if (yr >= 2000 && yr <= 2100) return yr;
    }
    // 2. Pola tahun 4 digit umum di nama berkas (misal _2024_)
    const mAny = base.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/);
    if (mAny) {
      const yr = parseInt(mAny[1], 10);
      if (yr >= 2000 && yr <= 2100) return yr;
    }
  }

  if (lastModified) {
    const d = new Date(lastModified);
    if (!isNaN(d.getTime())) {
      return d.getFullYear();
    }
  }

  return null;
}

/**
 * Memindai berkas di Cloudflare R2 / S3 berdasarkan filter tahun
 * @param {Object} options
 * @param {number|string} options.targetYear - Tahun yang dipilih (misal: 2024)
 * @param {string} [options.mode="before_or_equal"] - "exact" (hanya tahun itu) atau "before_or_equal" (tahun itu & sebelumnya)
 * @param {number} [options.limit=1000] - Batas maksimal berkas preview yang dikembalikan
 */
export async function scanR2ObjectsByYear({ targetYear, mode = "before_or_equal", limit = 1000 }) {
  if (!isR2Configured()) {
    return {
      success: false,
      error: "Cloudflare R2 belum dikonfigurasi di environment.",
      totalScanned: 0,
      matchedCount: 0,
      matchedBytes: 0,
      availableYears: [],
      files: []
    };
  }

  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const folder = getR2FolderPath();
  const publicBase = getR2PublicBaseUrl();

  const numTargetYear = parseInt(targetYear, 10);
  if (isNaN(numTargetYear) || numTargetYear < 2000 || numTargetYear > 2100) {
    return {
      success: false,
      error: "Tahun target tidak valid (harus angka tahun yang wajar).",
      totalScanned: 0,
      matchedCount: 0,
      matchedBytes: 0,
      availableYears: [],
      files: []
    };
  }

  let continuationToken = undefined;
  let totalScanned = 0;
  let matchedCount = 0;
  let matchedBytes = 0;
  const matchedFiles = [];
  const detectedYearsSet = new Set();

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: folder ? `${folder}/` : "",
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });

      const response = await client.send(command);
      const contents = response.Contents || [];
      totalScanned += contents.length;

      for (const item of contents) {
        // Abaikan direktori dummy / prefix itu sendiri
        if (folder && item.Key === `${folder}/`) continue;

        const fileYear = extractYearFromKeyOrDate(item.Key, item.LastModified);
        if (fileYear) {
          detectedYearsSet.add(fileYear);
        }

        let isMatch = false;
        if (fileYear) {
          if (mode === "exact") {
            isMatch = fileYear === numTargetYear;
          } else {
            // "before_or_equal"
            isMatch = fileYear <= numTargetYear;
          }
        }

        if (isMatch) {
          matchedCount++;
          matchedBytes += item.Size || 0;

          if (matchedFiles.length < limit) {
            matchedFiles.push({
              key: item.Key,
              fileName: path.basename(item.Key),
              fileYear,
              sizeBytes: item.Size || 0,
              sizeFormatted: item.Size ? `${(item.Size / 1024).toFixed(1)} KB` : "0 KB",
              lastModified: item.LastModified,
              publicUrl: `${publicBase}/${item.Key}`
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    const availableYears = Array.from(detectedYearsSet).sort((a, b) => b - a);

    return {
      success: true,
      mode,
      targetYear: numTargetYear,
      totalScanned,
      matchedCount,
      matchedBytes,
      matchedSizeFormatted: matchedBytes > 1024 * 1024 * 1024
        ? `${(matchedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : matchedBytes > 1024 * 1024
        ? `${(matchedBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(matchedBytes / 1024).toFixed(1)} KB`,
      availableYears,
      files: matchedFiles
    };
  } catch (err) {
    console.error("Gagal memindai berkas R2 berdasarkan tahun:", err);
    return {
      success: false,
      error: "Gagal memindai bucket R2: " + err.message,
      totalScanned,
      matchedCount: 0,
      matchedBytes: 0,
      availableYears: [],
      files: []
    };
  }
}

/**
 * Menghapus berkas di Cloudflare R2 / S3 secara batch berdasarkan filter tahun
 * @param {Object} options
 * @param {number|string} options.targetYear - Tahun yang dipilih (misal: 2024)
 * @param {string} [options.mode="before_or_equal"] - "exact" atau "before_or_equal"
 */
export async function cleanupR2ObjectsByYear({ targetYear, mode = "before_or_equal" }) {
  if (!isR2Configured()) {
    return {
      success: false,
      error: "Cloudflare R2 belum dikonfigurasi di environment.",
      deletedCount: 0,
      deletedBytes: 0,
      deletedKeys: []
    };
  }

  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const folder = getR2FolderPath();

  const numTargetYear = parseInt(targetYear, 10);
  if (isNaN(numTargetYear) || numTargetYear < 2000 || numTargetYear > 2100) {
    return {
      success: false,
      error: "Tahun target tidak valid.",
      deletedCount: 0,
      deletedBytes: 0,
      deletedKeys: []
    };
  }

  // 1. Ambil seluruh key yang cocok untuk dihapus
  const scanResult = await scanR2ObjectsByYear({ targetYear: numTargetYear, mode, limit: 100000 });
  if (!scanResult.success) {
    return {
      success: false,
      error: scanResult.error,
      deletedCount: 0,
      deletedBytes: 0,
      deletedKeys: []
    };
  }

  if (scanResult.matchedCount === 0) {
    return {
      success: true,
      message: "Tidak ada berkas yang memenuhi kriteria tahun untuk dibersihkan.",
      deletedCount: 0,
      deletedBytes: 0,
      deletedKeys: []
    };
  }

  const keysToDelete = scanResult.files.map(f => f.key);
  let totalDeletedCount = 0;
  let totalDeletedBytes = 0;
  const deletedKeysList = [];

  // Batch delete S3 maksimal 1000 objek per pemanggilan
  const BATCH_SIZE = 1000;
  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const chunk = keysToDelete.slice(i, i + BATCH_SIZE);
    try {
      const delCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map(k => ({ Key: k })),
          Quiet: false
        }
      });

      const delRes = await client.send(delCommand);
      const deletedItems = delRes.Deleted || [];
      totalDeletedCount += deletedItems.length;
      deletedItems.forEach(item => deletedKeysList.push(item.Key));

      if (delRes.Errors && delRes.Errors.length > 0) {
        console.warn("Sebagian berkas R2 gagal dihapus:", delRes.Errors);
      }
    } catch (chunkErr) {
      console.error("Gagal menghapus batch berkas R2:", chunkErr);
    }
  }

  totalDeletedBytes = scanResult.matchedBytes;

  return {
    success: true,
    targetYear: numTargetYear,
    mode,
    deletedCount: totalDeletedCount,
    deletedBytes: totalDeletedBytes,
    deletedSizeFormatted: totalDeletedBytes > 1024 * 1024 * 1024
      ? `${(totalDeletedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : totalDeletedBytes > 1024 * 1024
      ? `${(totalDeletedBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalDeletedBytes / 1024).toFixed(1)} KB`,
    deletedKeys: deletedKeysList
  };
}

