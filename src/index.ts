import { UserConfig, PluginOption } from "vite"
import { OutputChunk, OutputAsset, OutputOptions } from "rollup"
import micromatch from "micromatch"

export type Config = {
	// Modifies the Vite build config to make this plugin work well. See `_useRecommendedBuildConfig`
	// in the plugin implementation for more details on how this works.
	//
	// @default true
	useRecommendedBuildConfig?: boolean
	// Optionally, only inline assets that match one or more glob patterns.
	//
	// @default []
	inlinePattern?: string[]
	// Optionally, delete inlined assets preventing them from being output.
	//
	// @default true
	deleteInlinedFiles?: boolean
}

const defaultConfig = { useRecommendedBuildConfig: true, deleteInlinedFiles: true }

export function replaceScript(html: string, scriptFilename: string, scriptCode: string): string {
	// Prevent accidental closure
	scriptCode = scriptCode.replaceAll('</script>', '\\x3c/script>')
	return html.replace(
		// Vite always uses this format to build script tags
		`<script type="module" crossorigin src="${scriptFilename}"></script>`,
		`<script type="module">${scriptCode}</script>`
	)
}

export function replaceCss(html: string, scriptFilename: string, scriptCode: string): string {
	scriptCode = scriptCode.replace(/^@charset "UTF-8";/, '')
	return html.replace(
		// Vite always uses this format to build link tags
		`<link rel="stylesheet" crossorigin href="${scriptFilename}">`,
		`<style>${scriptCode}</style>`
	)
}

const isJsFile = /\.[mc]?js$/
const isCssFile = /\.css$/
const isHtmlFile = /\.html?$/

export function viteSingleFile({
	useRecommendedBuildConfig = true,
	inlinePattern = [],
	deleteInlinedFiles = true,
}: Config = defaultConfig): PluginOption {

	function warnNotInlined(filename: string) {
		console.debug(`NOTE: asset not inlined: ${filename}`)
	}

	return {
		name: "vite:singlefile",
		config: useRecommendedBuildConfig ? _useRecommendedBuildConfig : undefined,
		enforce: "post",
		generateBundle: (_, bundle) => {
			console.debug("\n")
			const files = {
				html: [] as string[],
				css: [] as string[],
				js: [] as string[],
				other: [] as string[]
			}
			for (const i of Object.keys(bundle)) {
				if (isHtmlFile.test(i)) {
					files.html.push(i)
				} else if (isCssFile.test(i)) {
					files.css.push(i)
				} else if (isJsFile.test(i)) {
					files.js.push(i)
				} else {
					files.other.push(i)
				}
			}
			const bundlesToDelete = [] as string[]
			for (const name of files.html) {
				const htmlChunk = bundle[name] as OutputAsset
				let replacedHtml = htmlChunk.source as string
				for (const filename of files.js) {
					if (inlinePattern.length && !micromatch.isMatch(filename, inlinePattern)) {
						warnNotInlined(filename)
						continue
					}
					const jsChunk = bundle[filename] as OutputChunk
					if (jsChunk.code != null) {
						console.debug(`Inlining: ${filename}`)
						bundlesToDelete.push(filename)
						replacedHtml = replaceScript(replacedHtml, jsChunk.fileName, jsChunk.code)
					}
				}
				for (const filename of files.css) {
					if (inlinePattern.length && !micromatch.isMatch(filename, inlinePattern)) {
						warnNotInlined(filename)
						continue
					}
					const cssChunk = bundle[filename] as OutputAsset
					console.debug(`Inlining: ${filename}`)
					bundlesToDelete.push(filename)
					replacedHtml = replaceCss(replacedHtml, cssChunk.fileName, cssChunk.source as string)
					if (replacedHtml == htmlChunk.source) {
						warnNotInlined(filename)
						continue
					}
				}
				htmlChunk.source = replacedHtml
			}
			if (deleteInlinedFiles) {
				for (const name of bundlesToDelete) {
					delete bundle[name]
				}
			}
			for (const name of files.other) {
				warnNotInlined(name)
			}
		},
	}
}

// Modifies the Vite build config to make this plugin work well.
const _useRecommendedBuildConfig = (config: UserConfig) => {
	if (!config.build) config.build = {}
	// Ensures that even very large assets are inlined in your JavaScript.
	config.build.assetsInlineLimit = () => true
	// Avoid warnings about large chunks.
	config.build.chunkSizeWarningLimit = Infinity
	// Emit all CSS as a single file, which `vite-plugin-singlefile` can then inline.
	config.build.cssCodeSplit = false
	// We need relative path to support any static files in public folder,
	// which are copied to ${build.outDir} by vite.
	config.base = './'
	// Make generated files in ${build.outDir}'s root, instead of default ${build.outDir}/assets.
	// Then the embedded resources can be loaded by relative path.
	config.build.assetsDir = ''
	// https://github.com/richardtallent/vite-plugin-singlefile/issues/57#issuecomment-2390579177
	config.build.modulePreload = { polyfill: false }

	if (!config.build.rollupOptions) config.build.rollupOptions = {}
	if (!config.build.rollupOptions.output) config.build.rollupOptions.output = {}

	const updateOutputOptions = (out: OutputOptions) => {
		// Ensure that as many resources as possible are inlined.
		out.inlineDynamicImports = true
		out.assetFileNames =
			out.entryFileNames =
			out.chunkFileNames = undefined
	}

	if (Array.isArray(config.build.rollupOptions.output)) {
		for (const o of config.build.rollupOptions.output) updateOutputOptions(o as OutputOptions)
	} else {
		updateOutputOptions(config.build.rollupOptions.output as OutputOptions)
	}
}
