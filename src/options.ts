export interface Options {
    /**
     * Rename index.html
     */
    rename?: string

    /**
     * Try inline html used assets, if inlined or not used in JS.
     * @default true
     */
    tryInlineHtmlAssets?: boolean

    /**
     * Remove inlined asset files.
     * @default true
     */
    removeInlinedAssetFiles?: boolean

    /**
     * Try inline html icon, if icon is in public dir.
     * @default true
     */
    tryInlineHtmlPublicIcon?: boolean

    /**
     * Remove inlined html icon files.
     * @default true
     */
    removeInlinedPublicIconFiles?: boolean
}

export interface InnerOptions {
    rename: string | undefined
    tryInlineHtmlAssets: boolean
    removeInlinedAssetFiles: boolean
    tryInlineHtmlPublicIcon: boolean
    removeInlinedPublicIconFiles: boolean
}

export function getInnerOptions(opt?: Options): InnerOptions {
    opt ||= {}
    return {
        rename:
            opt.rename == null
                ? undefined
                : String(opt.rename),

        tryInlineHtmlAssets:
            opt.tryInlineHtmlAssets ?? true,

        removeInlinedAssetFiles:
            opt.removeInlinedAssetFiles ?? true,

        tryInlineHtmlPublicIcon:
            opt.tryInlineHtmlPublicIcon ?? true,

        removeInlinedPublicIconFiles:
            opt.removeInlinedPublicIconFiles ?? true,
    }
}
