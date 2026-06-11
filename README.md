# unplugin-aliyun-oss

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Unit Test][unit-test-src]][unit-test-href]
[![Node.js][node-src]][node-href]
[![License][license-src]][license-href]

Upload generated build assets to Aliyun OSS after bundling. Powered by
[unplugin](https://github.com/unjs/unplugin), with adapters for Vite, Webpack,
Rollup, Rolldown, esbuild, Rspack, and Farm.

## Features

- Runs after the bundler has written build assets.
- Supports dry runs with `test: true`, so OSS credentials are not required while
  checking file discovery and object keys.
- Converts local output paths into OSS object keys with `buildRoot`, `dist`, and
  optional `setOssPath` control.
- Can skip existing objects when `overwrite: false` is enabled.
- Can remove uploaded local files and prune empty directories after upload.
- Can publish version metadata through a user-provided `setVersion` callback.

## Support

| Builder  | Import                         | Notes                                                                                   |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Vite     | `unplugin-aliyun-oss/vite`     | Vite `^4` to `^8`; output root is inferred from `build.outDir`.                         |
| Webpack  | `unplugin-aliyun-oss/webpack`  | Webpack 4 and 5; output root is inferred from `output.path`.                            |
| Rollup   | `unplugin-aliyun-oss/rollup`   | Rollup `^3` and `^4`; output root is inferred from `output.dir` or `output.file`.       |
| Rolldown | `unplugin-aliyun-oss/rolldown` | Rolldown `^1`; uses the Rollup-compatible output options.                               |
| esbuild  | `unplugin-aliyun-oss/esbuild`  | esbuild `>=0.18`; output root is inferred from `outdir` or `outfile`.                   |
| Rspack   | `unplugin-aliyun-oss/rspack`   | Rspack `^1` and `^2`; output root is inferred from `output.path`.                       |
| Farm     | `unplugin-aliyun-oss/farm`     | Uses the unplugin Farm adapter. Set `buildRoot` explicitly for predictable object keys. |

## Installation

```bash
npm i -D unplugin-aliyun-oss
```

```bash
pnpm add -D unplugin-aliyun-oss
```

```bash
yarn add -D unplugin-aliyun-oss
```

```bash
bun add -D unplugin-aliyun-oss
```

## Credentials

Keep OSS credentials outside source control and read them from environment
variables:

```dotenv
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=my-bucket
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
```

`region`, `bucket`, `accessKeyId`, and `accessKeySecret` are required unless
`test: true` is enabled.

## Quick Start

```ts
// vite.config.ts
import { defineConfig } from "vite";
import Oss from "unplugin-aliyun-oss/vite";

export default defineConfig({
  plugins: [
    Oss({
      from: "dist/**/*",
      dist: "/static",
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    }),
  ],
});
```

With the config above, `dist/assets/app.js` is uploaded to
`/static/assets/app.js`.

## Framework Usage

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import { defineConfig } from "vite";
import Oss from "unplugin-aliyun-oss/vite";

export default defineConfig({
  plugins: [
    Oss({
      from: "dist/**/*",
      dist: "/static",
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    }),
  ],
});
```

<br></details>

<details>
<summary>Webpack</summary><br>

```js
// webpack.config.js
import path from "node:path";
import Oss from "unplugin-aliyun-oss/webpack";

export default {
  output: {
    path: path.resolve("dist"),
  },
  plugins: [
    Oss({
      from: "dist/**/*",
      dist: "/static",
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
      quitWpOnError: true,
    }),
  ],
};
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.ts
import Oss from "unplugin-aliyun-oss/rollup";

export default {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "esm",
  },
  plugins: [
    Oss({
      from: "dist/**/*",
      dist: "/static",
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    }),
  ],
};
```

<br></details>

<details>
<summary>Rolldown</summary><br>

```ts
// rolldown.config.ts
import Oss from "unplugin-aliyun-oss/rolldown";

export default {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "esm",
  },
  plugins: [
    Oss({
      from: "dist/**/*",
      dist: "/static",
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    }),
  ],
};
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// build.ts
import { build } from "esbuild";
import Oss from "unplugin-aliyun-oss/esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outdir: "dist",
  plugins: [
    Oss({
      from: "dist/**/*",
      dist: "/static",
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    }),
  ],
});
```

<br></details>

<details>
<summary>Rspack</summary><br>

```js
// rspack.config.js
import path from "node:path";
import Oss from "unplugin-aliyun-oss/rspack";

export default {
  output: {
    path: path.resolve("dist"),
  },
  plugins: [
    Oss({
      from: "dist/**/*",
      dist: "/static",
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
      quitWpOnError: true,
    }),
  ],
};
```

<br></details>

<details>
<summary>Farm</summary><br>

```ts
// farm.config.ts
import Oss from "unplugin-aliyun-oss/farm";

export default {
  plugins: [
    Oss({
      from: "dist/**/*",
      buildRoot: "dist",
      dist: "/static",
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    }),
  ],
};
```

<br></details>

## Common Patterns

### Dry run

Use `test: true` to verify matched files and OSS keys without creating an Aliyun
OSS client:

```ts
Oss({
  from: "dist/**/*",
  dist: "/static",
  test: true,
});
```

### Custom object keys

Use `setOssPath` when the OSS key should not mirror the build output directory:

```ts
import path from "node:path";

Oss({
  from: "dist/**/*",
  dist: "/static",
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
  setOssPath(filePath) {
    return `/assets/${path.basename(filePath)}`;
  },
});
```

Use `from` to exclude files from the upload set. In the current version,
`setOssPath` should return a concrete string for every matched file.

### Skip existing objects

Set `overwrite: false` to check whether an object already exists before upload.
Existing objects are skipped, and upload requests include
`x-oss-forbid-overwrite`.

```ts
Oss({
  from: "dist/**/*",
  overwrite: false,
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});
```

### Delete local files after upload

```ts
Oss({
  from: "dist/**/*",
  deleteOrigin: true,
  deleteEmptyDir: true,
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});
```

### Publish version metadata

`setVersion` is called after a non-test upload pass finishes when `version` is
not empty:

```ts
Oss({
  from: "dist/**/*",
  version: process.env.APP_VERSION ?? "",
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
  async setVersion({ version }) {
    await fetch("https://example.com/assets-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
  },
});
```

## Object Key Rules

1. `from` selects local files with glob patterns. Directories are ignored before
   upload.
2. If `setOssPath` is provided, its returned string is used as the per-file
   object path.
3. Otherwise, the object path is relative to `buildRoot` when you provide it.
4. If `buildRoot` is not provided, most adapters infer the bundler output root.
5. `dist` is prefixed to the object path.

Examples:

| Local file           | Config                                                      | OSS key                 |
| -------------------- | ----------------------------------------------------------- | ----------------------- |
| `dist/index.html`    | `from: "dist/**/*"`, `buildRoot: "dist"`, `dist: "/static"` | `/static/index.html`    |
| `dist/assets/app.js` | `from: "dist/**/*"`, `buildRoot: "dist"`, `dist: "/static"` | `/static/assets/app.js` |
| `dist/assets/app.js` | `dist: "/cdn"`, `setOssPath: () => "/app.js"`               | `/cdn/app.js`           |

## Options

```ts
interface Options {
  region?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
  from: string | string[];
  test?: boolean;
  verbose?: boolean;
  dist?: string;
  buildRoot?: string;
  deleteOrigin?: boolean;
  deleteEmptyDir?: boolean;
  timeout?: number;
  setOssPath?: (filePath: string) => string | false | null | undefined;
  overwrite?: boolean;
  quitWpOnError?: boolean;
  version?: string;
  setVersion?: (data: { version: string }) => void | Promise<void>;
}
```

| Option            | Required                 | Default | Description                                                                                                                                             |
| ----------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`            | Yes                      | -       | Files to upload. Supports one glob or an array of globs, such as `dist/**/*`. Directories matched by the glob are ignored.                              |
| `region`          | Yes, unless `test: true` | -       | Aliyun OSS region, for example `oss-cn-hangzhou`.                                                                                                       |
| `accessKeyId`     | Yes, unless `test: true` | -       | Aliyun access key id.                                                                                                                                   |
| `accessKeySecret` | Yes, unless `test: true` | -       | Aliyun access key secret.                                                                                                                               |
| `bucket`          | Yes, unless `test: true` | -       | Aliyun OSS bucket name.                                                                                                                                 |
| `test`            | No                       | `false` | Dry run mode. Files are discovered and target paths are printed without creating an OSS client.                                                         |
| `verbose`         | No                       | `true`  | Prints grouped logs with source file, OSS key, object status, upload action, result URL, and failures.                                                  |
| `dist`            | No                       | `""`    | OSS object key prefix.                                                                                                                                  |
| `buildRoot`       | No                       | `"."`   | Local root used to make object keys relative. Most adapters infer the bundler output path when `buildRoot` is not provided.                             |
| `deleteOrigin`    | No                       | `false` | Deletes local files after successful upload.                                                                                                            |
| `deleteEmptyDir`  | No                       | `false` | Removes empty parent directories after deleting uploaded files.                                                                                         |
| `timeout`         | No                       | `60000` | OSS request timeout in milliseconds.                                                                                                                    |
| `setOssPath`      | No                       | -       | Overrides the generated OSS object key for each matched file. Return a string for every matched file; use `from` to filter files out of the upload set. |
| `overwrite`       | No                       | `true`  | Overwrites existing OSS objects by default. Set `overwrite: false` to skip existing objects and send `x-oss-forbid-overwrite`.                          |
| `quitWpOnError`   | No                       | `false` | Makes Webpack and Rspack builds fail when an upload fails. Other adapters collect the failure and continue the upload pass.                             |
| `version`         | No                       | `""`    | Version value passed to `setVersion`.                                                                                                                   |
| `setVersion`      | No                       | -       | Callback used to publish version metadata after a non-test upload pass finishes and `version` is not empty. Callback errors are logged.                 |

## Troubleshooting

| Symptom                                           | What to check                                                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| No files are uploaded                             | Check that `from` points at files that exist after the build has finished. Use `test: true` to print matched files without OSS writes. |
| OSS keys include too much local path              | Set `buildRoot` to the build output directory, for example `buildRoot: "dist"`.                                                        |
| Farm uploads use unexpected keys                  | Set `buildRoot` explicitly because Farm does not provide an inferred output path here.                                                 |
| Webpack or Rspack succeeds even when upload fails | Set `quitWpOnError: true`.                                                                                                             |
| Existing OSS objects should not be replaced       | Set `overwrite: false`.                                                                                                                |

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run test
```

Focused checks:

```bash
pnpm run test -- tests/uploader.test.ts
pnpm run test -- tests/builders.test.ts
```

## License

[MIT](./LICENSE) License © 2025-PRESENT [Drswith](https://github.com/Drswith)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unplugin-aliyun-oss.svg
[npm-version-href]: https://npmjs.com/package/unplugin-aliyun-oss
[npm-downloads-src]: https://img.shields.io/npm/dm/unplugin-aliyun-oss
[npm-downloads-href]: https://www.npmcharts.com/compare/unplugin-aliyun-oss?interval=30
[unit-test-src]: https://github.com/Drswith/unplugin-aliyun-oss/actions/workflows/unit-test.yml/badge.svg
[unit-test-href]: https://github.com/Drswith/unplugin-aliyun-oss/actions/workflows/unit-test.yml
[node-src]: https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen
[node-href]: https://nodejs.org/
[license-src]: https://img.shields.io/npm/l/unplugin-aliyun-oss.svg
[license-href]: ./LICENSE
