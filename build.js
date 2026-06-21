import path from 'path'
import { execSync } from 'child_process'

import { build as rolldownBuild } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

execSync('tsc', { stdio: 'inherit' });

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
        cleanDir: true,
    },
    external(id) {
        return !id.startsWith('.') && !path.isAbsolute(id);
    },
    platform: 'node',
    plugins: [
        dts()
    ],
})

execSync('node --run build', {
    stdio: 'inherit',
    cwd: path.resolve('./website/'),
})
