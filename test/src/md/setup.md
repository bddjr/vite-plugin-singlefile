# Setup

```
npm i @bddjr/vite-plugin-singlefile@latest -D
```

Then modify `vite.config.ts`, like [test/vite.config.ts](test/vite.config.ts)

```diff
+ import singleFile from '@bddjr/vite-plugin-singlefile'

  export default defineConfig({
    plugins: [
      vue(),
      vueDevTools(),
+     singleFile(),
    ],
```

Then use hash history, like [test/src/router/index.ts](test/src/router/index.ts)

```diff
  const router = createRouter({
-   history: createWebHistory(),
+   history: createWebHashHistory(),
```
