import fs from "node:fs/promises";
import path from "node:path";
import OSS from "ali-oss";
import { glob } from "glob";
import {
  logDryRunFile,
  logDryRunStart,
  logFileHeader,
  logNoFiles,
  logObjectStatus,
  logOssKey,
  logUploadFailure,
  logUploadProgress,
  logUploadSkipped,
  logUploadStart,
  logUploadSuccess,
  logVersionUpdated,
  logVersionUpdateFailure,
  type Logger,
} from "./logger";
import type { OptionsResolved, SupportedFramework } from "./options";
import { normalizeUrl, slash } from "./path";

export interface OssClient {
  get(path: string): Promise<{ res?: { status?: number } }>;
  put(
    path: string,
    file: string,
    options?: {
      timeout?: number;
      headers?: Record<string, string | boolean>;
    },
  ): Promise<{ url?: string }>;
}

export interface UploadRuntime {
  framework: SupportedFramework;
  outputPath?: string;
  clientFactory?: (options: OptionsResolved) => OssClient;
  logger?: Logger;
}

export interface UploadedFile {
  file: string;
  ossPath: string;
  url?: string;
}

export interface IgnoredFile {
  file: string;
  ossPath: string;
  reason: "exists";
}

export interface FailedFile {
  file: string;
  ossPath: string;
  error: {
    code?: string;
    message: string;
    name?: string;
  };
}

export interface UploadResult {
  uploaded: UploadedFile[];
  ignored: IgnoredFile[];
  failed: FailedFile[];
}

const PLUGIN_PREFIX = "[unplugin-aliyun-oss]";

export async function uploadMatchedFiles(
  options: OptionsResolved,
  runtime: UploadRuntime,
): Promise<UploadResult> {
  const logger = runtime.logger ?? console;
  const files = await glob(options.from, { nodir: true });

  if (files.length === 0) {
    if (options.verbose) {
      logNoFiles(logger);
    }

    return { uploaded: [], ignored: [], failed: [] };
  }

  return uploadFiles(files, options, runtime);
}

export async function uploadFiles(
  files: string[],
  options: OptionsResolved,
  runtime: UploadRuntime,
): Promise<UploadResult> {
  const logger = runtime.logger ?? console;
  const result: UploadResult = { uploaded: [], ignored: [], failed: [] };
  const basePath = getBasePath(options, runtime);

  if (options.test && options.verbose) {
    logDryRunStart(logger, files.length);
  } else if (options.verbose) {
    logUploadStart(logger, files.length);
  }

  const client = options.test
    ? undefined
    : (runtime.clientFactory?.(options) ?? createAliOssClient(options));

  for (const [index, file] of files.entries()) {
    const filePath = path.resolve(file);
    const ossPath = getOssPath(filePath, options, basePath);
    const current = index + 1;

    if (options.verbose) {
      logFileHeader(logger, current, files.length, file);
      logOssKey(logger, ossPath);
    }

    if (options.test) {
      if (options.verbose) {
        logDryRunFile(logger);
      }
      continue;
    }

    if (!client) {
      throw new Error(`${PLUGIN_PREFIX} OSS client is unavailable.`);
    }

    try {
      const exists = await fileExists(client, ossPath);

      if (options.verbose) {
        logObjectStatus(logger, exists, options.overwrite);
      }

      if (exists && !options.overwrite) {
        result.ignored.push({ file, ossPath, reason: "exists" });
        if (options.verbose) {
          logUploadSkipped(logger);
        }
        continue;
      }

      if (options.verbose) {
        logUploadProgress(logger);
      }

      const upload = await client.put(ossPath, filePath, {
        timeout: options.timeout,
        headers: options.overwrite
          ? {}
          : {
              "Cache-Control": "max-age=31536000",
              "x-oss-forbid-overwrite": true,
            },
      });
      const uploaded: UploadedFile = {
        file,
        ossPath,
        url: upload.url ? normalizeUrl(upload.url) : undefined,
      };

      result.uploaded.push(uploaded);

      if (options.verbose) {
        logUploadSuccess(logger, uploaded.url);
      }

      if (options.deleteOrigin) {
        await fs.unlink(filePath);

        if (options.deleteEmptyDir) {
          await cleanEmptyParents(filePath, basePath);
        }
      }
    } catch (error) {
      const failed = toFailedFile(file, ossPath, error);
      result.failed.push(failed);
      logUploadFailure(logger, formatError(failed.error));

      if (shouldAbortOnUploadError(options, runtime)) {
        throw new Error(`${PLUGIN_PREFIX} webpack upload failed for ${slash(file)}.`);
      }
    }
  }

  if (options.setVersion && options.version && !options.test) {
    try {
      await options.setVersion({ version: options.version });
      if (options.verbose) {
        logVersionUpdated(logger, options.version);
      }
    } catch (error) {
      logVersionUpdateFailure(logger, getErrorMessage(error));
    }
  }

  return result;
}

export function createAliOssClient(options: OptionsResolved): OssClient {
  const AliOSS = OSS as unknown as new (options: {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    region: string;
  }) => OssClient;

  return new AliOSS({
    region: options.region,
    accessKeyId: options.accessKeyId,
    accessKeySecret: options.accessKeySecret,
    bucket: options.bucket,
  });
}

export function getBasePath(options: OptionsResolved, runtime: UploadRuntime): string {
  if (options.setOssPath) {
    return "";
  }

  const root = options.buildRootProvided
    ? options.buildRoot
    : runtime.outputPath || options.buildRoot;
  const absoluteRoot = path.isAbsolute(root) ? root : path.resolve(root);

  return stripTrailingSlash(slash(absoluteRoot));
}

export function getOssPath(filePath: string, options: OptionsResolved, basePath: string): string {
  const customPath = options.setOssPath?.(filePath);
  const fileObjectPath = customPath || (basePath ? getRelativeObjectPath(filePath, basePath) : "");

  return slash(path.posix.join(options.dist, fileObjectPath));
}

async function fileExists(client: OssClient, ossPath: string): Promise<boolean> {
  try {
    const result = await client.get(ossPath);
    return result.res?.status === 200;
  } catch (error) {
    if (isNoSuchKeyError(error)) {
      return false;
    }

    throw error;
  }
}

async function cleanEmptyParents(filePath: string, basePath: string): Promise<void> {
  const stopAt = basePath ? path.resolve(basePath) : process.cwd();
  let current = path.dirname(filePath);

  while (current.startsWith(stopAt) && current !== stopAt) {
    const files = await fs.readdir(current);

    if (files.length > 0) {
      return;
    }

    await fs.rmdir(current);
    current = path.dirname(current);
  }
}

function getRelativeObjectPath(filePath: string, basePath: string): string {
  const normalizedFile = slash(path.resolve(filePath));
  const normalizedBase = stripTrailingSlash(slash(path.resolve(basePath)));
  const prefix = `${normalizedBase}/`;

  if (normalizedFile.startsWith(prefix)) {
    return `/${normalizedFile.slice(prefix.length)}`;
  }

  return "";
}

function shouldAbortOnUploadError(options: OptionsResolved, runtime: UploadRuntime): boolean {
  return (
    (runtime.framework === "webpack" || runtime.framework === "rspack") && options.quitWpOnError
  );
}

function toFailedFile(file: string, ossPath: string, error: unknown): FailedFile {
  const maybeError = error as Partial<Error> & { code?: string };

  return {
    file,
    ossPath,
    error: {
      code: maybeError.code,
      message: maybeError.message ?? String(error),
      name: maybeError.name,
    },
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatError(error: FailedFile["error"]): string {
  return `${error.name ?? "Error"}${error.code ? `-${error.code}` : ""}: ${error.message}`;
}

function isNoSuchKeyError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "NoSuchKey"
  );
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
