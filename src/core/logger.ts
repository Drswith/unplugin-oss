import pc from "picocolors";
import { slash } from "./path";

export type Logger = Pick<Console, "error" | "log" | "warn">;

const PREFIX = pc.cyan("[unplugin-aliyun-oss]");

export function logNoFiles(logger: Logger): void {
  logger.warn(`${PREFIX} ${pc.yellow("No files matched, upload skipped.")}`);
}

export function logDryRunStart(logger: Logger, total: number): void {
  logger.log(`${PREFIX} ${pc.yellow("Dry run")} ${pc.dim(`(${total} file${plural(total)})`)}`);
}

export function logUploadStart(logger: Logger, total: number): void {
  logger.log(
    `${PREFIX} ${pc.green("Uploading to Aliyun OSS")} ${pc.dim(`(${total} file${plural(total)})`)}`,
  );
}

export function logFileHeader(logger: Logger, index: number, total: number, file: string): void {
  logger.log(`\n${pc.dim(`[${index}/${total}]`)} ${pc.blue(pc.underline(slash(file)))}`);
}

export function logOssKey(logger: Logger, ossPath: string): void {
  logger.log(`  ${pc.dim("oss:")} ${pc.yellow(pc.underline(ossPath))}`);
}

export function logDryRunFile(logger: Logger): void {
  logger.log(`  ${pc.dim("action:")} ${pc.yellow("dry-run, not uploaded")}`);
}

export function logObjectStatus(logger: Logger, exists: boolean, overwrite: boolean): void {
  const status = exists ? pc.yellow("exists") : pc.green("missing");
  const detail = exists
    ? overwrite
      ? pc.dim("overwrite enabled")
      : pc.dim("overwrite disabled")
    : pc.dim("will create");

  logger.log(`  ${pc.dim("status:")} ${status} ${detail}`);
}

export function logUploadSkipped(logger: Logger): void {
  logger.log(`  ${pc.dim("action:")} ${pc.yellow("skipped")} ${pc.dim("object already exists")}`);
}

export function logUploadProgress(logger: Logger): void {
  logger.log(`  ${pc.dim("action:")} ${pc.white("uploading...")}`);
}

export function logUploadSuccess(logger: Logger, url?: string): void {
  logger.log(`  ${pc.dim("result:")} ${pc.green("uploaded")}`);

  if (url) {
    logger.log(`  ${pc.dim("url:")} ${pc.green(pc.underline(url))}`);
  }
}

export function logUploadFailure(logger: Logger, error: string): void {
  logger.error(`  ${pc.dim("result:")} ${pc.red(`failed ${error}`)}`);
}

export function logVersionUpdated(logger: Logger, version: string): void {
  logger.log(`${PREFIX} ${pc.green("Version updated")} ${pc.dim(version)}`);
}

export function logVersionUpdateFailure(logger: Logger, error: string): void {
  logger.error(`${PREFIX} ${pc.red(`Version update failed: ${error}`)}`);
}

function plural(total: number): string {
  return total === 1 ? "" : "s";
}
