import { UserConfig, PluginOption, ResolvedConfig, ConfigPluginContext, ConfigEnv } from "vite"
import { OutputBundle, OutputChunk, OutputAsset, PluginContext } from 'rolldown'
import { JSDOM } from 'jsdom'

import path from 'path'
import fs from 'fs'

import type { RollupOptions } from "@bddjr/types-rollupoptions-4.43.0"
import { bufferToDataURL } from "./dataurl.js"
import { getInnerOptions, type Options, InnerOptions as InnerOptions } from "./options.js"
import { cutPrefix } from "./cutPrefix.js"

export function singleFile(opt?: Options): PluginOption {
    let conf: ResolvedConfig
    const innerOptions = getInnerOptions(opt)
    return {
        name: "@bddjr/vite-plugin-singlefile",
        enforce: "post",
        config(...args) {
            return setConfig.call(this, innerOptions, ...args)
        },
        configResolved(c) {
            conf = c
        },
        generateBundle(outputOptions, bundle, isWrite) {
            return generateBundle.call(this, bundle, conf, innerOptions)
        },
    }
}

export default singleFile

export { Options }

function setConfig(this: ConfigPluginContext, opt: InnerOptions, config: UserConfig, env: ConfigEnv) {
    config.base ??= './'

    const build = (config.build ??= {})

    build.cssCodeSplit ??= false
    build.assetsInlineLimit ??= () => true
    build.modulePreload ?? build.polyfillModulePreload ?? (build.modulePreload = { polyfill: false })

    if (this.meta.rolldownVersion) {
        // Vite 8
        const rolldownOptions = build.rolldownOptions ?? build.rollupOptions ?? (build.rolldownOptions = {})

        for (const output of [rolldownOptions.output ??= {}].flat(1)) {
            output.codeSplitting ?? output.inlineDynamicImports ?? (output.codeSplitting = false)
        }
    } else {
        // Vite oldest
        const rollupOptions = (build.rollupOptions ??= {}) as RollupOptions

        for (const output of [rollupOptions.output ??= {}].flat(1)) {
            output.inlineDynamicImports ??= true
        }
    }
}

async function generateBundle(this: PluginContext, bundle: OutputBundle, config: ResolvedConfig, options: InnerOptions) {
    // rename
    if (options.rename
        && options.rename != "index.html"
        && Object.prototype.hasOwnProperty.call(bundle, "index.html")
        && !Object.prototype.hasOwnProperty.call(bundle, options.rename)
    ) {
        bundle[options.rename] = bundle["index.html"]
        bundle[options.rename].fileName = options.rename
        delete bundle["index.html"]
    }

    /** "assets/" */
    const assetsDir = path.posix.join(config.build.assetsDir, '/')
        /** "./assets/" */
        , assetsDirWithBase = config.base + assetsDir
        /** '[href^="./assets/"]' */
        , assetsHrefSelector = `[href^="${assetsDirWithBase}"]`
        /** '[src^="./assets/"]' */
        , assetsSrcSelector = `[src^="${assetsDirWithBase}"]`

        , globalDelete = new Set<string>()
        , globalDoNotDelete = new Set<string>()
        , globalRemoveDistFileNames = new Set<string>()

        , globalAssetsDataURL = {} as { [key: string]: string }
        , globalPublicFilesCache = {} as {
            [key: string]: {
                buffer: Buffer,
                dataURL: string,
                size: number,
            }
        }

        /** format: ["assets/index-XXXXXXXX.js"] */
        , bundleAssetsNames = [] as string[]
        /** format: ["index.html"] */
        , bundleHTMLNames = [] as string[]

    for (const name in bundle) {
        if (name.startsWith(assetsDir))
            bundleAssetsNames.push(name)
        else if (/\.html$/i.test(name))
            bundleHTMLNames.push(name)
    }

    for (const htmlFileName of bundleHTMLNames) {
        // init
        const htmlChunk = bundle[htmlFileName] as OutputAsset
            , oldHTML = htmlChunk.source as string
            , dom = new JSDOM(oldHTML)
            , document = dom.window.document
            , scriptElement = document.querySelector<HTMLScriptElement>(`script[type=module]${assetsSrcSelector}`)

        if (!scriptElement) continue;

        const scriptName = scriptElement ? cutPrefix(scriptElement.src, config.base) : ''
            , thisDel = new Set<string>()

        scriptElement.remove()
        scriptElement.removeAttribute('src')
        scriptElement.removeAttribute('crossorigin')
        document.body.appendChild(scriptElement)

        // get css tag
        let allCSS = ''
        const linkStylesheet = document.querySelectorAll<HTMLLinkElement>(`link[rel=stylesheet]${assetsHrefSelector}`)
        for (const element of linkStylesheet) {
            const name = cutPrefix(element.href, config.base)
            thisDel.add(name)
            const css = bundle[name] as OutputAsset
            const cssSource = css.source as string
            if (cssSource) {
                // do not delete not inlined asset
                for (const name of bundleAssetsNames) {
                    if (cssSource.includes(name.slice(assetsDir.length)))
                        globalDoNotDelete.add(name)
                }
                // add script for load css
                allCSS += cssSource.replace(/\s*(\/\*[^*]*\*\/)?\s*$/, '')
            }
        }
        if (allCSS) {
            const e = document.createElement('style')
            e.innerHTML = allCSS
            linkStylesheet[0].before(e)
            for (const e of linkStylesheet) {
                e.remove()
            }
        }

        // inline html assets
        if (options.tryInlineHtmlAssets) {
            for (const element of document.querySelectorAll<HTMLImageElement>(assetsSrcSelector)) {
                const name = cutPrefix(element.src, assetsDirWithBase)
                if (/\.js$/i.test(name))
                    continue
                const bundleName = assetsDir + name
                const a = bundle[bundleName] as OutputAsset
                if (!a)
                    continue
                thisDel.add(bundleName)
                let dataURL: string
                if (Object.prototype.hasOwnProperty.call(globalAssetsDataURL, name)) {
                    dataURL = globalAssetsDataURL[name]
                } else {
                    globalAssetsDataURL[name] = dataURL = bufferToDataURL(name, Buffer.from(a.source))
                }
                element.src = dataURL
            }
        }

        // inline html favicon
        const createIconElement = (href?: string | null) => {
            const e = document.createElement('link')
            e.rel = 'icon'
            if (href != null) e.href = href
            return e
        }

        const getPublicIcon = (faviconName: string) => {
            if (!Object.prototype.hasOwnProperty.call(globalPublicFilesCache, faviconName)) {
                // dist/favicon.ico
                let _path = path.join(config.build.outDir, faviconName)
                if (fs.existsSync(_path)) {
                    globalRemoveDistFileNames.add(faviconName)
                } else {
                    // public/favicon.ico
                    _path = path.join(config.publicDir, faviconName)
                    if (!fs.existsSync(_path)) return null
                }
                // read
                const b = fs.readFileSync(_path)
                globalPublicFilesCache[faviconName] = {
                    buffer: b,
                    dataURL: bufferToDataURL(faviconName, b),
                    size: b.length
                }
            }
            return globalPublicFilesCache[faviconName]
        }

        const linkFaviconAll = document.querySelectorAll<HTMLLinkElement>(`link[rel=icon][href]:not([href=""]),link[rel="shortcut icon"][href]:not([href=""])`)

        if (linkFaviconAll.length == 0) {
            if (options.tryInlineHtmlPublicIcon) {
                const fileCache = getPublicIcon('favicon.ico')
                if (fileCache) {
                    const e = createIconElement(fileCache.dataURL)
                    document.head.appendChild(e)
                }
            }
        } else for (const linkFavicon of linkFaviconAll) {
            let faviconName = linkFavicon.href
            const faviconIsDataURL = /^data:/i.test(faviconName)
            if (!faviconIsDataURL)
                faviconName = cutPrefix(faviconName, config.base)

            const setFaviconDataURL = (dataURL: string) => {
                if (linkFavicon) {
                    linkFavicon.href = dataURL
                } else {
                    document.head.appendChild(createIconElement(dataURL))
                }
            }

            if (faviconIsDataURL) {
                //
            } else if (bundleAssetsNames.includes(faviconName)) {
                const asset = bundle[faviconName] as OutputAsset
                if (asset) {
                    setFaviconDataURL(bufferToDataURL(faviconName, Buffer.from(asset.source)))
                    thisDel.add(faviconName)
                }
            } else if (options.tryInlineHtmlPublicIcon) {
                const fileCache = getPublicIcon(faviconName)
                if (fileCache) {
                    setFaviconDataURL(fileCache.dataURL)
                }
            }
        }

        // fill script
        thisDel.add(scriptName)
        let { code } = bundle[scriptName] as OutputChunk
        code = code.replace(/;?\s*$/, '')
        // do not delete not inlined asset
        for (const name of bundleAssetsNames) {
            const assetName = name.slice(assetsDir.length)
            if (code.includes(assetName)) {
                globalDoNotDelete.add(name)
            }
        }

        let outputScript = code.replaceAll('</script', '<\\/script')

        // 此 polyfill 仅在以下选项的值为 false 时需要。
        // config.build.rolldownOptions.output.codeSplitting
        if (/\b__VITE_PRELOAD__\b/.test(code))
            outputScript = "var __VITE_PRELOAD__;" + outputScript

        scriptElement.innerHTML = outputScript

        // generate html
        htmlChunk.source = dom.serialize()

        // delete assets
        for (const name of thisDel) {
            globalDelete.add(name)
        }
    }

    if (options.removeInlinedAssetFiles) {
        // delete inlined assets
        for (const name of globalDelete) {
            // do not delete not inlined asset
            if (!globalDoNotDelete.has(name))
                delete bundle[name]
        }
    }
    if (options.removeInlinedPublicIconFiles) {
        // delete inlined public files
        const { outDir } = config.build
        const mustStartsWith = path.resolve(outDir) + path.sep
        for (const name of globalRemoveDistFileNames) {
            try {
                const _path = path.resolve(outDir, name)
                if (_path.startsWith(mustStartsWith)) {
                    fs.rmSync(_path, { force: true })
                }
            } catch (e) {
                console.error(e)
            }
        }
    }
}
