export interface OssOptions {
  /** Aliyun OSS region, for example `oss-cn-hangzhou`. */
  region: string;
  /** Aliyun access key id. */
  accessKeyId: string;
  /** Aliyun access key secret. */
  accessKeySecret: string;
  /** Aliyun OSS bucket name. */
  bucket: string;
}

export interface VersionPayload {
  version: string;
}

export interface OptionalOptions {
  /** Files to upload. Supports glob patterns such as `dist/**`. */
  from: string | string[];
  /** Dry run mode. Files are discovered and upload targets are logged, but OSS is not touched. */
  test?: boolean;
  /** Print upload progress. */
  verbose?: boolean;
  /** OSS object key prefix. */
  dist?: string;
  /** Build output root. Most adapters can infer this from their output config. */
  buildRoot?: string;
  /** Delete local files after successful upload. */
  deleteOrigin?: boolean;
  /** Remove empty parent directories after deleting uploaded files. */
  deleteEmptyDir?: boolean;
  /** OSS request timeout in milliseconds. */
  timeout?: number;
  /** Override the OSS object path for each local file. */
  setOssPath?: (filePath: string) => string | false | null | undefined;
  /** Overwrite existing OSS objects. */
  overwrite?: boolean;
  /** Make webpack-like builds fail on upload errors. */
  quitWpOnError?: boolean;
  /** Version value passed to `setVersion` after successful uploads. */
  version?: string;
  /** Callback used to publish version metadata after successful uploads. */
  setVersion?: (data: VersionPayload) => void | Promise<void>;
}

export type Options = Partial<OssOptions> & OptionalOptions;

export type SupportedFramework =
  | "vite"
  | "rollup"
  | "rolldown"
  | "esbuild"
  | "webpack"
  | "rspack"
  | "farm";

export interface OptionsResolved extends OssOptions {
  from: string | string[];
  test: boolean;
  verbose: boolean;
  dist: string;
  buildRoot: string;
  buildRootProvided: boolean;
  deleteOrigin: boolean;
  deleteEmptyDir: boolean;
  timeout: number;
  setOssPath?: (filePath: string) => string | false | null | undefined;
  overwrite: boolean;
  quitWpOnError: boolean;
  version: string;
  setVersion?: (data: VersionPayload) => void | Promise<void>;
}

const defaults = {
  test: false,
  verbose: true,
  dist: "",
  buildRoot: ".",
  deleteOrigin: false,
  deleteEmptyDir: false,
  timeout: 60 * 1000,
  overwrite: true,
  quitWpOnError: false,
  version: "",
} satisfies Omit<
  OptionsResolved,
  keyof OssOptions | "from" | "buildRootProvided" | "setOssPath" | "setVersion"
>;

export function resolveOptions(options: Options): OptionsResolved {
  if (!options || !options.from || (Array.isArray(options.from) && options.from.length === 0)) {
    throw new Error("[unplugin-aliyun-oss] option `from` is required.");
  }

  if (!options.test) {
    for (const key of ["region", "accessKeyId", "accessKeySecret", "bucket"] as const) {
      if (!options[key]) {
        throw new Error(
          `[unplugin-aliyun-oss] option \`${key}\` is required unless \`test\` is enabled.`,
        );
      }
    }
  }

  return {
    ...defaults,
    ...options,
    region: options.region ?? "",
    accessKeyId: options.accessKeyId ?? "",
    accessKeySecret: options.accessKeySecret ?? "",
    bucket: options.bucket ?? "",
    buildRootProvided: "buildRoot" in options,
  };
}
