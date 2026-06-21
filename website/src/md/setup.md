# Setup

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
