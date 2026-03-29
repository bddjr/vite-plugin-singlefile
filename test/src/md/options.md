# Options

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
