import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import rspack, {
  type Configuration as RspackConfiguration,
  type Stats as RspackStats,
} from "@rspack/core";
import { build as esbuildBuild } from "esbuild";
import { rolldown } from "rolldown";
import { rollup } from "rollup";
import { build as viteBuild } from "vite";
import { afterEach, describe, expect, it } from "vitest";
import webpack, { type Configuration, type Stats } from "webpack";
import EsbuildOss from "../src/esbuild";
import RolldownOss from "../src/rolldown";
import RollupOss from "../src/rollup";
import RspackOss from "../src/rspack";
import Oss from "../src/vite";
import WebpackOss from "../src/webpack";

const require = createRequire(import.meta.url);
const webpack4 = require("webpack4") as typeof webpack;
const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => fs.rm(dir, { force: true, recursive: true })));
});

describe("builder adapters", () => {
  it("runs after a Vite 4 build", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const uploadedFiles: string[] = [];
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(
      path.join(root, "index.html"),
      '<script type="module" src="/src/main.js"></script>',
    );
    await fs.writeFile(path.join(root, "src", "main.js"), "document.body.textContent = 'vite';");

    await viteBuild({
      configFile: false,
      logLevel: "silent",
      plugins: [
        Oss({
          ...createDryRunOptions(outDir, uploadedFiles),
        }),
      ],
      root,
      build: {
        emptyOutDir: true,
        outDir: "dist",
      },
    });

    await expect(fs.stat(path.join(outDir, "index.html"))).resolves.toBeTruthy();
    expect(uploadedFiles).toContain("index.html");
  });

  it("runs after a Rollup build", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const uploadedFiles: string[] = [];
    const entry = path.join(root, "src", "index.js");
    await fs.mkdir(path.dirname(entry), { recursive: true });
    await fs.writeFile(entry, "export const value = 'rollup';");

    const bundle = await rollup({
      input: entry,
      plugins: [RollupOss(createDryRunOptions(outDir, uploadedFiles)) as never],
    });

    try {
      await bundle.write({
        file: path.join(outDir, "bundle.js"),
        format: "esm",
      });
    } finally {
      await bundle.close();
    }

    await expect(fs.stat(path.join(outDir, "bundle.js"))).resolves.toBeTruthy();
    expect(uploadedFiles).toContain("bundle.js");
  });

  it("runs after a Rolldown build", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const uploadedFiles: string[] = [];
    const entry = path.join(root, "src", "index.js");
    await fs.mkdir(path.dirname(entry), { recursive: true });
    await fs.writeFile(entry, "export const value = 'rolldown';");

    const bundle = await rolldown({
      input: entry,
      plugins: [RolldownOss(createDryRunOptions(outDir, uploadedFiles))],
    });

    try {
      await bundle.write({
        file: path.join(outDir, "bundle.js"),
        format: "esm",
      });
    } finally {
      await bundle.close();
    }

    await expect(fs.stat(path.join(outDir, "bundle.js"))).resolves.toBeTruthy();
    expect(uploadedFiles).toContain("bundle.js");
  });

  it("runs after an esbuild build", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const uploadedFiles: string[] = [];
    const entry = path.join(root, "src", "index.js");
    await fs.mkdir(path.dirname(entry), { recursive: true });
    await fs.writeFile(entry, "export const value = 'esbuild';");

    await esbuildBuild({
      bundle: true,
      entryPoints: [entry],
      logLevel: "silent",
      outfile: path.join(outDir, "bundle.js"),
      plugins: [EsbuildOss(createDryRunOptions(outDir, uploadedFiles)) as never],
    });

    await expect(fs.stat(path.join(outDir, "bundle.js"))).resolves.toBeTruthy();
    expect(uploadedFiles).toContain("bundle.js");
  });

  it("runs after a webpack 5 build", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const uploadedFiles: string[] = [];
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "index.js"), "module.exports = 'webpack';");

    await runWebpack({
      context: root,
      entry: "./src/index.js",
      mode: "production",
      output: {
        filename: "bundle.js",
        path: outDir,
      },
      plugins: [
        WebpackOss({
          ...createDryRunOptions(outDir, uploadedFiles),
        }),
      ],
    });

    await expect(fs.stat(path.join(outDir, "bundle.js"))).resolves.toBeTruthy();
    expect(uploadedFiles).toContain("bundle.js");
  });

  it("runs after a webpack 4 build", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const uploadedFiles: string[] = [];
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "index.js"), "module.exports = 'webpack4';");

    await runWebpack(
      {
        context: root,
        devtool: false,
        entry: "./src/index.js",
        mode: "development",
        optimization: {
          minimize: false,
        },
        output: {
          filename: "bundle.js",
          hashFunction: "sha256",
          path: outDir,
        },
        plugins: [
          WebpackOss({
            ...createDryRunOptions(outDir, uploadedFiles),
          }),
        ],
      },
      webpack4,
    );

    await expect(fs.stat(path.join(outDir, "bundle.js"))).resolves.toBeTruthy();
    expect(uploadedFiles).toContain("bundle.js");
  });

  it("runs after a Rspack build", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const uploadedFiles: string[] = [];
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "index.js"), "module.exports = 'rspack';");

    await runRspack({
      context: root,
      entry: "./src/index.js",
      mode: "production",
      output: {
        filename: "bundle.js",
        path: outDir,
      },
      plugins: [RspackOss(createDryRunOptions(outDir, uploadedFiles))],
    });

    await expect(fs.stat(path.join(outDir, "bundle.js"))).resolves.toBeTruthy();
    expect(uploadedFiles).toContain("bundle.js");
  });
});

function createDryRunOptions(outDir: string, uploadedFiles: string[]) {
  return {
    from: `${outDir}/**/*`,
    test: true,
    verbose: false,
    setOssPath(filePath: string) {
      uploadedFiles.push(path.basename(filePath));
      return `/assets/${path.basename(filePath)}`;
    },
  };
}

async function createTmpDir(): Promise<string> {
  const baseDir = path.join(process.cwd(), "node_modules", ".tmp");
  await fs.mkdir(baseDir, { recursive: true });
  const dir = await fs.mkdtemp(path.join(baseDir, "unplugin-aliyun-oss-builder-"));
  tmpDirs.push(dir);
  return dir;
}

async function runRspack(config: RspackConfiguration): Promise<RspackStats> {
  const compiler = rspack(config);

  return new Promise<RspackStats>((resolve, reject) => {
    compiler.run((error, stats) => {
      closeCompiler(compiler, (closeError) => {
        const finalError = error ?? closeError;

        if (finalError) {
          reject(finalError);
          return;
        }

        if (!stats) {
          reject(new Error("rspack did not return stats."));
          return;
        }

        if (stats.hasErrors()) {
          reject(new Error(stats.toString("errors-only")));
          return;
        }

        resolve(stats);
      });
    });
  });
}

async function runWebpack(config: Configuration, webpackFactory = webpack): Promise<Stats> {
  const compiler = webpackFactory(config);

  return new Promise<Stats>((resolve, reject) => {
    compiler.run((error, stats) => {
      closeCompiler(compiler, (closeError) => {
        const finalError = error ?? closeError;

        if (finalError) {
          reject(finalError);
          return;
        }

        if (!stats) {
          reject(new Error("webpack did not return stats."));
          return;
        }

        if (stats.hasErrors()) {
          reject(new Error(stats.toString("errors-only")));
          return;
        }

        resolve(stats);
      });
    });
  });
}

function closeCompiler(
  compiler: { close?: (callback: (error?: Error | null) => void) => void },
  callback: (error?: Error | null) => void,
): void {
  if ("close" in compiler && typeof compiler.close === "function") {
    compiler.close(callback);
    return;
  }

  callback();
}
