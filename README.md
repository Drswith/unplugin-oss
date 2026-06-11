# unplugin-aliyun-oss

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Unit Test][unit-test-src]][unit-test-href]

Upload build assets to Aliyun OSS after bundling. Powered by [unplugin](https://github.com/unjs/unplugin).

## Support

- Vite 4+ is implemented and tested with Vite 4.5.
- Webpack 4+ is implemented and tested with Webpack 4.47 and Webpack 5.
- Rollup, Rolldown, esbuild, and Rspack are implemented and covered by builder tests.
- Farm is implemented through the unplugin Farm adapter. Set `buildRoot` to control object keys relative to Farm's output root.

## Installation

```bash
npm i -D unplugin-aliyun-oss
```

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
      region: "oss-cn-hangzhou",
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: "my-bucket",
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
      region: "oss-cn-hangzhou",
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: "my-bucket",
      quitWpOnError: true,
    }),
  ],
};
```

<br></details>

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

| Option            | Required                 | Default | Description                                                                                                                                                                                                                 |
| ----------------- | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`            | Yes                      | -       | Files to upload. Supports glob patterns such as `dist/**` and `dist/**/*`. Directories matched by the glob are ignored before uploading, so only files are sent to OSS.                                                     |
| `region`          | Yes, unless `test: true` | -       | Aliyun OSS region, for example `oss-cn-hangzhou`.                                                                                                                                                                           |
| `accessKeyId`     | Yes, unless `test: true` | -       | Aliyun access key id.                                                                                                                                                                                                       |
| `accessKeySecret` | Yes, unless `test: true` | -       | Aliyun access key secret.                                                                                                                                                                                                   |
| `bucket`          | Yes, unless `test: true` | -       | Aliyun OSS bucket name.                                                                                                                                                                                                     |
| `test`            | No                       | `false` | Dry run mode. Files are discovered and target paths are printed without creating an OSS client.                                                                                                                             |
| `verbose`         | No                       | `true`  | Prints colored grouped logs with source file, OSS key, object status, action, result URL, and failures. Existing objects are logged as `skipped` when `overwrite: false`, so skipped files are not reported as `uploading`. |
| `dist`            | No                       | `""`    | OSS object key prefix.                                                                                                                                                                                                      |
| `buildRoot`       | No                       | `"."`   | Controls how local paths are converted to OSS object keys. Most adapters infer this from their output config when `buildRoot` is not provided.                                                                              |
| `deleteOrigin`    | No                       | `false` | Deletes local files after successful upload.                                                                                                                                                                                |
| `deleteEmptyDir`  | No                       | `false` | Removes empty parent directories after deleting uploaded files.                                                                                                                                                             |
| `timeout`         | No                       | `60000` | OSS request timeout in milliseconds.                                                                                                                                                                                        |
| `setOssPath`      | No                       | -       | Overrides the generated OSS object key for each file. Return `false`, `null`, or `undefined` to skip that file.                                                                                                             |
| `overwrite`       | No                       | `true`  | Overwrites existing OSS objects by default. Set `overwrite: false` to skip existing objects and send `x-oss-forbid-overwrite`.                                                                                              |
| `quitWpOnError`   | No                       | `false` | Makes Webpack and Rspack builds fail when an upload fails.                                                                                                                                                                  |
| `version`         | No                       | `""`    | Version value passed to `setVersion` after successful uploads.                                                                                                                                                              |
| `setVersion`      | No                       | -       | Callback used to publish version metadata after successful uploads.                                                                                                                                                         |

## License

[MIT](./LICENSE) License © 2025-PRESENT [Drswith](https://github.com/Drswith)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unplugin-aliyun-oss.svg
[npm-version-href]: https://npmjs.com/package/unplugin-aliyun-oss
[npm-downloads-src]: https://img.shields.io/npm/dm/unplugin-aliyun-oss
[npm-downloads-href]: https://www.npmcharts.com/compare/unplugin-aliyun-oss?interval=30
[unit-test-src]: https://github.com/Drswith/unplugin-aliyun-oss/actions/workflows/unit-test.yml/badge.svg
[unit-test-href]: https://github.com/Drswith/unplugin-aliyun-oss/actions/workflows/unit-test.yml
