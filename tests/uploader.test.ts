import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveOptions } from "../src/core/options";
import { uploadFiles, uploadMatchedFiles, type OssClient } from "../src/core/uploader";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => fs.rm(dir, { force: true, recursive: true })));
});

describe("uploader", () => {
  it("filters directories from glob matches before uploading", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const assetFile = path.join(outDir, "assets", "app.js");
    const entryFile = path.join(outDir, "index.html");
    await fs.mkdir(path.dirname(assetFile), { recursive: true });
    await fs.writeFile(assetFile, "export const app = true;");
    await fs.writeFile(entryFile, '<div id="app"></div>');

    const put = vi.fn(async (ossPath: string, _file: string) => ({
      url: `https://example.com//${ossPath}`,
    }));
    const client: OssClient = {
      get: vi.fn(async () => {
        const error = new Error("not found") as Error & { code: string };
        error.code = "NoSuchKey";
        throw error;
      }),
      put,
    };

    await uploadMatchedFiles(
      resolveOptions({
        from: `${outDir}/**`,
        region: "oss-cn-hangzhou",
        accessKeyId: "id",
        accessKeySecret: "secret",
        bucket: "bucket",
        buildRoot: outDir,
        dist: "/cdn",
        verbose: false,
      }),
      {
        framework: "vite",
        clientFactory: () => client,
        logger: silentLogger(),
      },
    );

    const uploadedOssPaths = put.mock.calls.map(([ossPath]) => ossPath).sort();
    const uploadedLocalPaths = put.mock.calls.map(([, filePath]) => filePath).sort();
    expect(uploadedOssPaths).toEqual(["/cdn/assets/app.js", "/cdn/index.html"]);
    expect(uploadedLocalPaths).toEqual([assetFile, entryFile].sort());
  });

  it("uploads files with dist prefix and relative build path", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const file = path.join(outDir, "assets", "app.js");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "export const app = true;");

    const put = vi.fn(async (ossPath: string, _file: string) => ({
      url: `https://example.com//${ossPath}`,
    }));
    const client: OssClient = {
      get: vi.fn(async () => {
        const error = new Error("not found") as Error & { code: string };
        error.code = "NoSuchKey";
        throw error;
      }),
      put,
    };

    const result = await uploadFiles(
      [file],
      resolveOptions({
        from: `${outDir}/**/*`,
        region: "oss-cn-hangzhou",
        accessKeyId: "id",
        accessKeySecret: "secret",
        bucket: "bucket",
        buildRoot: outDir,
        dist: "/cdn",
        overwrite: false,
        verbose: false,
      }),
      {
        framework: "webpack",
        clientFactory: () => client,
        logger: silentLogger(),
      },
    );

    expect(result.uploaded).toEqual([
      {
        file,
        ossPath: "/cdn/assets/app.js",
        url: "https://example.com/cdn/assets/app.js",
      },
    ]);
    expect(put).toHaveBeenCalledWith(
      "/cdn/assets/app.js",
      file,
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-oss-forbid-overwrite": true,
        }),
      }),
    );
  });

  it("prints upload lifecycle logs", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const file = path.join(outDir, "assets", "app.js");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "export const app = true;");

    const logger = memoryLogger();
    const client: OssClient = {
      get: vi.fn(async () => {
        const error = new Error("not found") as Error & { code: string };
        error.code = "NoSuchKey";
        throw error;
      }),
      put: vi.fn(async (ossPath: string) => ({ url: `https://example.com//${ossPath}` })),
    };

    await uploadFiles(
      [file],
      resolveOptions({
        from: `${outDir}/**/*`,
        region: "oss-cn-hangzhou",
        accessKeyId: "id",
        accessKeySecret: "secret",
        bucket: "bucket",
        buildRoot: outDir,
        dist: "/cdn",
        overwrite: true,
        verbose: true,
      }),
      {
        framework: "vite",
        clientFactory: () => client,
        logger,
      },
    );

    const output = stripAnsi(logger.logs.join("\n"));
    expect(output).toContain("[unplugin-aliyun-oss] Uploading to Aliyun OSS (1 file)");
    expect(output).toContain("[1/1]");
    expect(output).toContain(file.replace(/\\/g, "/"));
    expect(output).toContain("oss: /cdn/assets/app.js");
    expect(output).toContain("status: missing will create");
    expect(output).toContain("action: uploading...");
    expect(output).toContain("result: uploaded url: https://example.com/cdn/assets/app.js");
  });

  it("prints overwrite intent when an existing object will be replaced", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const file = path.join(outDir, "assets", "app.js");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "export const app = true;");

    const logger = memoryLogger();
    const client: OssClient = {
      get: vi.fn(async () => ({ res: { status: 200 } })),
      put: vi.fn(async (ossPath: string) => ({ url: `https://example.com//${ossPath}` })),
    };

    await uploadFiles(
      [file],
      resolveOptions({
        from: `${outDir}/**/*`,
        region: "oss-cn-hangzhou",
        accessKeyId: "id",
        accessKeySecret: "secret",
        bucket: "bucket",
        buildRoot: outDir,
        dist: "/cdn",
        overwrite: true,
        verbose: true,
      }),
      {
        framework: "vite",
        clientFactory: () => client,
        logger,
      },
    );

    const output = stripAnsi(logger.logs.join("\n"));
    expect(output).toContain("status: exists overwrite enabled");
    expect(output).toContain("1/1");
    expect(output).toContain("action: uploading...");
    expect(output).toContain("result: uploaded url: https://example.com/cdn/assets/app.js");
  });

  it("prints existing object logs and skips uploads when overwrite is disabled", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const file = path.join(outDir, "assets", "app.js");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "export const app = true;");

    const logger = memoryLogger();
    const put = vi.fn(async () => ({ url: "" }));
    const client: OssClient = {
      get: vi.fn(async () => ({ res: { status: 200 } })),
      put,
    };

    const result = await uploadFiles(
      [file],
      resolveOptions({
        from: `${outDir}/**/*`,
        region: "oss-cn-hangzhou",
        accessKeyId: "id",
        accessKeySecret: "secret",
        bucket: "bucket",
        buildRoot: outDir,
        dist: "/cdn",
        overwrite: false,
        verbose: true,
      }),
      {
        framework: "webpack",
        clientFactory: () => client,
        logger,
      },
    );

    expect(result.ignored).toEqual([{ file, ossPath: "/cdn/assets/app.js", reason: "exists" }]);
    expect(put).not.toHaveBeenCalled();
    const output = stripAnsi(logger.logs.join("\n"));
    expect(output).toContain("status: exists overwrite disabled");
    expect(output).toContain("action: skipped object already exists");
    expect(output).not.toContain("action: uploading...");
  });

  it("does not create an OSS client in test mode", async () => {
    const root = await createTmpDir();
    const file = path.join(root, "dist", "app.js");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "console.log('dry run');");

    await expect(
      uploadFiles(
        [file],
        resolveOptions({
          from: `${root}/dist/**/*`,
          test: true,
          buildRoot: path.join(root, "dist"),
          verbose: false,
        }),
        {
          framework: "vite",
          clientFactory: () => {
            throw new Error("client should not be created");
          },
          logger: silentLogger(),
        },
      ),
    ).resolves.toEqual({ failed: [], ignored: [], uploaded: [] });
  });

  it("fails webpack builds when quitWpOnError is enabled", async () => {
    const root = await createTmpDir();
    const outDir = path.join(root, "dist");
    const file = path.join(outDir, "app.js");
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(file, "console.log('boom');");

    const client: OssClient = {
      get: vi.fn(async () => {
        const error = new Error("not found") as Error & { code: string };
        error.code = "NoSuchKey";
        throw error;
      }),
      put: vi.fn(async () => {
        throw new Error("network down");
      }),
    };

    await expect(
      uploadFiles(
        [file],
        resolveOptions({
          from: `${outDir}/**/*`,
          region: "oss-cn-hangzhou",
          accessKeyId: "id",
          accessKeySecret: "secret",
          bucket: "bucket",
          buildRoot: outDir,
          quitWpOnError: true,
          verbose: false,
        }),
        {
          framework: "webpack",
          clientFactory: () => client,
          logger: silentLogger(),
        },
      ),
    ).rejects.toThrow("webpack upload failed");
  });
});

async function createTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "unplugin-aliyun-oss-"));
  tmpDirs.push(dir);
  return dir;
}

function silentLogger(): Pick<Console, "error" | "log" | "warn"> {
  return {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  };
}

function memoryLogger(): Pick<Console, "error" | "log" | "warn"> & { logs: string[] } {
  const logs: string[] = [];

  return {
    error: (message) => logs.push(String(message)),
    log: (message) => logs.push(String(message)),
    logs,
    warn: (message) => logs.push(String(message)),
  };
}

function stripAnsi(value: string): string {
  const escape = String.fromCharCode(27);
  return value.replace(new RegExp(`${escape}\\[[0-?]*[ -/]*[@-~]`, "g"), "");
}
