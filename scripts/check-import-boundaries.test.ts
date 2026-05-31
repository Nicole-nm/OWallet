import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkImportBoundaries, extractModuleSpecifiers } from './check-import-boundaries'

const tempRoots: string[] = []

async function createProject(files: Record<string, string>) {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'owallet-boundaries-'))
  tempRoots.push(projectRoot)

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(projectRoot, 'src/renderer/src', relativePath)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content)
  }

  return projectRoot
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))
  )
})

describe('extractModuleSpecifiers', () => {
  it('finds imports, re-exports, require calls, and dynamic imports', () => {
    expect(
      extractModuleSpecifiers(`
        import value from './imported'
        export { named } from './named'
        export * from './star'
        import alias = require('./equals')
        const required = require('./required')
        const lazy = import('./lazy')
      `)
    ).toEqual(['./imported', './named', './star', './equals', './required', './lazy'])
  })

  it('extracts imports from Vue script blocks without scanning the template', () => {
    expect(
      extractModuleSpecifiers(
        `<template><span>localStorage</span></template>
         <script setup lang="ts">import { x } from '../shared/x'</script>`,
        'Example.vue'
      )
    ).toEqual(['../shared/x'])
  })
})

describe('checkImportBoundaries', () => {
  it('allows imports that follow the layer direction', async () => {
    const projectRoot = await createProject({
      'shared/lib/value.ts': 'export const value = 1',
      'domains/wallet/service.ts': "import { value } from '../../shared/lib/value'",
      'workflows/wallet/usePage.ts': "import { value } from '../../shared/lib/value'",
    })

    await expect(checkImportBoundaries({ projectRoot })).resolves.toEqual([])
  })

  it('rejects cross-layer imports and re-exports', async () => {
    const projectRoot = await createProject({
      'domains/wallet/service.ts': 'export const value = 1',
      'shared/lib/importViolation.ts': "import { value } from '../../domains/wallet/service'",
      'shared/lib/exportViolation.ts': "export * from '../../domains/wallet/service'",
    })

    const violations = await checkImportBoundaries({ projectRoot })

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: 'src/renderer/src/shared/lib/importViolation.ts',
          targetLayer: 'domains',
        }),
        expect.objectContaining({
          filePath: 'src/renderer/src/shared/lib/exportViolation.ts',
          targetLayer: 'domains',
        }),
      ])
    )
  })

  it('rejects browser storage outside shared persistence and infrastructure imports in workflows', async () => {
    const projectRoot = await createProject({
      'shared/network/client.ts': 'export const client = 1',
      'shared/persistence/local.ts': 'export const saved = localStorage.getItem("saved")',
      'workflows/wallet/usePage.ts': `
        import { client } from '../../shared/network/client'
        export const saved = sessionStorage.getItem(String(client))
      `,
    })

    const violations = await checkImportBoundaries({ projectRoot })

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetLayer: 'browser-storage' }),
        expect.objectContaining({ targetLayer: 'shared-infrastructure' }),
      ])
    )
    expect(violations).toHaveLength(2)
  })
})
