/**
 * Renderer bundle-size budget.
 *
 * Guards against accidental bundle bloat in the packaged renderer (the code that
 * ships to every user). It sums the byte size of all emitted `.js` and `.css`
 * assets under `out/renderer` and fails if the total exceeds the budget below.
 *
 * The current baseline (~6.7 MB uncompressed) is dominated by unavoidable crypto
 * and UI deps (`ontology-ts-sdk`, `elliptic`, Vue, Ant Design Vue). The budget is
 * intentionally set a little above that so genuine regressions fail while routine
 * changes pass. Tighten `BUDGET_KB` whenever the baseline drops.
 *
 * Run `yarn build` (or `electron-vite build`) first; if no build output exists,
 * this check is a no-op so it never blocks environments that have not built yet.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const RENDERER_OUT = path.join(process.cwd(), 'out/renderer')
const BUDGET_KB = 7680 // 7.5 MB ceiling for emitted JS + CSS.
const COUNTED_EXTENSIONS = new Set(['.js', '.css'])

function collectAssetBytes(dir: string): number {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      total += collectAssetBytes(fullPath)
    } else if (COUNTED_EXTENSIONS.has(path.extname(entry.name))) {
      total += statSync(fullPath).size
    }
  }
  return total
}

function main(): void {
  if (!existsSync(RENDERER_OUT)) {
    console.log('bundle-size: out/renderer not found; skipping (run `yarn build` first).')
    return
  }

  const totalKb = Math.round(collectAssetBytes(RENDERER_OUT) / 1024)
  const label = `bundle-size: renderer JS+CSS = ${totalKb} KB (budget ${BUDGET_KB} KB)`

  if (totalKb > BUDGET_KB) {
    console.error(`${label} — OVER BUDGET by ${totalKb - BUDGET_KB} KB.`)
    console.error(
      'bundle-size: investigate the regression or, if it is justified, raise BUDGET_KB in ' +
        'scripts/check-bundle-size.ts with a note explaining why.'
    )
    process.exitCode = 1
    return
  }

  console.log(`${label} — OK (${BUDGET_KB - totalKb} KB headroom).`)
}

main()
