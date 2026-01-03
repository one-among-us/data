import fs from "fs-extra";
import path from "path";
import crypto from "crypto";

const CACHE_DIR = ".build-cache";
const CACHE_FILE = "cache-metadata.json";

interface CacheMetadata {
  scriptHash: string;
  files: Record<
    string,
    {
      hash: string;
      mtime: number;
    }
  >;
  results: Record<string, any>;
}

let cacheData: CacheMetadata = { scriptHash: "", files: {}, results: {} };
let cacheDir: string;
let cacheFilePath: string;
let currentScriptHash: string = "";

/**
 * Calculate hash of build scripts to detect changes
 *
 * @param projectRoot Project root directory
 * @returns Hash of all build scripts
 */
function calculateScriptsHash(projectRoot: string): string {
  const scriptFiles = [
    "scripts/blurhash.js",
    "scripts/build.ts",
    "scripts/cache.ts",
    "scripts/data.ts",
    "scripts/feature.js",
    "scripts/mdx.js",
  ].map((f) => path.join(projectRoot, f));

  const hash = crypto.createHash("md5");
  for (const file of scriptFiles) {
    if (fs.existsSync(file)) {
      hash.update(fs.readFileSync(file));
    }
  }
  return hash.digest("hex");
}

/**
 * Initialize cache system
 *
 * @param projectRoot Project root directory
 */
export function initCache(projectRoot: string) {
  cacheDir = path.join(projectRoot, CACHE_DIR);
  cacheFilePath = path.join(cacheDir, CACHE_FILE);

  currentScriptHash = calculateScriptsHash(projectRoot);

  fs.ensureDirSync(cacheDir);

  if (fs.existsSync(cacheFilePath)) {
    try {
      const loadedCache = JSON.parse(fs.readFileSync(cacheFilePath, "utf-8"));
      if (loadedCache.scriptHash !== currentScriptHash) {
        console.log("[Cache] Build scripts changed, invalidating cache");
        cacheData = { scriptHash: currentScriptHash, files: {}, results: {} };
      } else {
        cacheData = loadedCache;
      }
    } catch (e) {
      console.log("[Cache] Failed to load cache, starting fresh:", e);
      cacheData = { scriptHash: currentScriptHash, files: {}, results: {} };
    }
  } else {
    cacheData.scriptHash = currentScriptHash;
  }
}

/**
 * Calculate file hash using MD5
 *
 * @param filePath Path to the file
 * @returns MD5 hash of the file content
 */
function getFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Check if a file has changed since last build
 *
 * @param filePath Path to the file
 * @returns true if file has changed or is new
 */
export function hasFileChanged(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true;

  const stats = fs.statSync(filePath);
  const cached = cacheData.files[filePath];

  // File is new
  if (!cached) return true;

  // Quick check: mtime changed
  if (cached.mtime !== stats.mtimeMs) {
    // Verify with hash (mtime could change without content change)
    const currentHash = getFileHash(filePath);
    if (currentHash !== cached.hash) {
      return true;
    }
    // Update mtime but keep hash
    cacheData.files[filePath].mtime = stats.mtimeMs;
  }

  return false;
}

/**
 * Check if any of the files have changed
 *
 * @param filePaths Array of file paths to check
 * @returns true if any file has changed
 */
export function haveFilesChanged(filePaths: string[]): boolean {
  return filePaths.some((fp) => hasFileChanged(fp));
}

/**
 * Update cache for a file
 *
 * @param filePath Path to the file
 */
export function updateFileCache(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const stats = fs.statSync(filePath);
  const hash = getFileHash(filePath);

  cacheData.files[filePath] = {
    hash,
    mtime: stats.mtimeMs,
  };
}

/**
 * Get cached result for a key
 *
 * @param key Cache key
 * @returns Cached result or undefined
 */
export function getCachedResult<T = unknown>(key: string): T | undefined {
  return cacheData.results[key];
}

/**
 * Set cached result for a key
 *
 * @param key Cache key
 * @param result Result to cache
 */
export function setCachedResult<T = unknown>(key: string, result: T): void {
  cacheData.results[key] = result;
}

/**
 * Save cache to disk
 */
export function saveCache() {
  cacheData.scriptHash = currentScriptHash;
  fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));
}

/**
 * Clear all cache
 */
export function clearCache() {
  cacheData = { scriptHash: "", files: {}, results: {} };
  if (fs.existsSync(cacheDir)) {
    fs.removeSync(cacheDir);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    totalFiles: Object.keys(cacheData.files).length,
    totalResults: Object.keys(cacheData.results).length,
    cacheSize: fs.existsSync(cacheFilePath)
      ? fs.statSync(cacheFilePath).size
      : 0,
  };
}
