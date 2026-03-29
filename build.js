import path from 'path'

import { build as rolldownBuild } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

await rolldownBuild({
    input: [
        './src/index.ts',
    ],
    transform: {
        target: 'es2021'
    },
    output: {
        format: 'esm',
        dir: 'dist',
    },
    external(id) {
        return !id.startsWith('.') && !path.isAbsolute(id);
    },
    platform: 'node',
    plugins: [
        dts()
    ],
})
