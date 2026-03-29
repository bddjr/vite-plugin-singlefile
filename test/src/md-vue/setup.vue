<!--
  Generate by build-md.mjs
  Do not manually modify!
-->
<template>
<h1>Setup</h1>
<pre><code class="hljs">npm i @bddjr/vite-plugin-singlefile@latest -D
</code></pre>
<p>Then modify <code>vite.config.ts</code>, like <a target="_blank" href="test/vite.config.ts">test/vite.config.ts</a></p>
<pre><code class="hljs language-diff"><span class="hljs-addition">+ import singleFile from &#x27;@bddjr/vite-plugin-singlefile&#x27;</span>

  export default defineConfig({
    plugins: [
      vue(),
      vueDevTools(),
<span class="hljs-addition">+     singleFile(),</span>
    ],
</code></pre>
<p>Then use hash history, like <a target="_blank" href="test/src/router/index.ts">test/src/router/index.ts</a></p>
<pre><code class="hljs language-diff">  const router = createRouter({
<span class="hljs-deletion">-   history: createWebHistory(),</span>
<span class="hljs-addition">+   history: createWebHashHistory(),</span>
</code></pre>

</template>