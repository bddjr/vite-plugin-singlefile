# vite plugin singlefile

Embed all assets into `dist/index.html`

Preview: https://bddjr.github.io/vite-plugin-singlefile/#/

> [!TIP]  
> You may need: [vite-plugin-singlefile-compression](https://github.com/bddjr/vite-plugin-singlefile-compression)  

## Setup

```
npm i -D @bddjr/vite-plugin-singlefile@latest
```

Then modify `vite.config.ts`, like [website/vite.config.ts](website/vite.config.ts)

```diff
+ import singleFile from '@bddjr/vite-plugin-singlefile'

  export default defineConfig({
    plugins: [
      vue(),
      vueDevTools(),
+     singleFile(),
    ],
```

Then use hash history, like [website/src/router/index.ts](website/src/router/index.ts)

```diff
  const router = createRouter({
-   history: createWebHistory(),
+   history: createWebHashHistory(),
```

## Options

Example:

```ts
singleFileCompression({
  rename: 'example.html'
}),
```

### rename

Rename index.html

type: `string`

### tryInlineHtmlAssets

Try inline html used assets, if inlined or not used in JS.

default: `true`

type: `boolean`

### removeInlinedAssetFiles

Remove inlined asset files.

default: `true`

type: `boolean`

### tryInlineHtmlPublicIcon

Try inline html icon, if icon is in public dir.

default: `true`

type: `boolean`

### removeInlinedPublicIconFiles

Remove inlined html icon files.

default: `true`

type: `boolean`


## Effect

Preview: https://bddjr.github.io/vite-plugin-singlefile/#/

```
vite v8.2.1 building client environment for production...
✓ 44 modules transformed.
computing gzip size...
dist/index.html  123.40 kB │ gzip: 43.40 kB

✓ built in 365ms
```

## Clone

```
git clone https://github.com/bddjr/vite-plugin-singlefile
cd vite-plugin-singlefile
pnpm i
pnpm build
```
