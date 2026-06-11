import path from "node:path";
import { createUnplugin, type UnpluginInstance, type UnpluginOptions } from "unplugin";
import { resolveOptions, type Options, type SupportedFramework } from "./core/options";
import { uploadMatchedFiles } from "./core/uploader";

export const Oss: UnpluginInstance<Options, false> = createUnplugin((rawOptions, meta) => {
  const name = "unplugin-aliyun-oss";

  switch (meta.framework) {
    case "vite":
      return {
        name,
        ...createViteHooks(rawOptions),
      };
    case "rollup":
      return {
        name,
        ...createRollupHooks(rawOptions),
      };
    case "rolldown":
      return {
        name,
        ...createRolldownHooks(rawOptions),
      };
    case "esbuild":
      return {
        name,
        ...createEsbuildHooks(rawOptions),
      };
    case "webpack":
      return {
        name,
        ...createOutputPathHooks(rawOptions, "webpack", meta.webpack.compiler.options.output.path),
      };
    case "rspack":
      return {
        name,
        ...createOutputPathHooks(rawOptions, "rspack", meta.rspack.compiler.options.output.path),
      };
    case "farm":
      return {
        name,
        ...createOutputPathHooks(rawOptions, "farm"),
      };
    default:
      return {
        name,
      };
  }
});

export type { Options, OssOptions, OptionalOptions, VersionPayload } from "./core/options";

type ViteHooks = Pick<UnpluginOptions, "vite" | "writeBundle">;
type RollupHooks = Pick<UnpluginOptions, "rollup" | "writeBundle">;
type RolldownHooks = Pick<UnpluginOptions, "rolldown" | "writeBundle">;
type EsbuildHooks = Pick<UnpluginOptions, "esbuild" | "writeBundle">;
type UploadHooks = Pick<UnpluginOptions, "writeBundle">;

interface RollupOutputOptions {
  dir?: string;
  file?: string;
}

interface EsbuildBuildOptions {
  absWorkingDir?: string;
  outdir?: string;
  outfile?: string;
}

function createViteHooks(rawOptions: Options): ViteHooks {
  let outputPath: string | undefined;

  return {
    vite: {
      configResolved(config) {
        outputPath = path.isAbsolute(config.build.outDir)
          ? config.build.outDir
          : path.resolve(config.root, config.build.outDir);
      },
    },
    ...createOutputPathHooks(rawOptions, "vite", () => outputPath),
  };
}

function createRollupHooks(rawOptions: Options): RollupHooks {
  let outputPath: string | undefined;

  return {
    rollup: {
      outputOptions(options) {
        outputPath = resolveRollupOutputPath(options);
        return null;
      },
    },
    ...createOutputPathHooks(rawOptions, "rollup", () => outputPath),
  };
}

function createRolldownHooks(rawOptions: Options): RolldownHooks {
  let outputPath: string | undefined;

  return {
    rolldown: {
      outputOptions(options) {
        outputPath = resolveRollupOutputPath(options);
        return null;
      },
    },
    ...createOutputPathHooks(rawOptions, "rolldown", () => outputPath),
  };
}

function createEsbuildHooks(rawOptions: Options): EsbuildHooks {
  let outputPath: string | undefined;

  return {
    esbuild: {
      config(options) {
        outputPath = resolveEsbuildOutputPath(options);
      },
    },
    ...createOutputPathHooks(rawOptions, "esbuild", () => outputPath),
  };
}

function createOutputPathHooks(
  rawOptions: Options,
  framework: SupportedFramework,
  outputPath?: string | (() => string | undefined),
): UploadHooks {
  return {
    async writeBundle() {
      const options = resolveOptions(rawOptions);
      await uploadMatchedFiles(options, {
        framework,
        outputPath: typeof outputPath === "function" ? outputPath() : outputPath,
      });
    },
  };
}

function resolveRollupOutputPath(options: RollupOutputOptions): string | undefined {
  if (options.dir) {
    return path.resolve(options.dir);
  }

  if (options.file) {
    return path.dirname(path.resolve(options.file));
  }
}

function resolveEsbuildOutputPath(options: EsbuildBuildOptions): string | undefined {
  const root = options.absWorkingDir ?? process.cwd();

  if (options.outdir) {
    return path.isAbsolute(options.outdir) ? options.outdir : path.resolve(root, options.outdir);
  }

  if (options.outfile) {
    const outfile = path.isAbsolute(options.outfile)
      ? options.outfile
      : path.resolve(root, options.outfile);

    return path.dirname(outfile);
  }
}
