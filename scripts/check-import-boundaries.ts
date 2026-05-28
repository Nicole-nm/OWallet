import { promises as fs } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const rendererRoot = path.join(projectRoot, 'src/renderer/src')
const codeExtensions = new Set(['.js', '.mjs', '.ts', '.vue'])

type Layer =
  | 'shared'
  | 'domains'
  | 'pages'
  | 'router'
  | 'stores'
  | 'workflows'
  | 'module-application'
  | 'module-composable'
  | 'module-domain'
  | 'module-store'
  | 'module-ui'

const forbiddenImportsByLayer: Partial<Record<Layer, Set<string>>> = {
  shared: new Set([
    'domains',
    'pages',
    'router',
    'stores',
    'workflows',
    'module-application',
    'module-composable',
    'module-domain',
    'module-store',
    'module-ui',
  ]),
  domains: new Set([
    'pages',
    'router',
    'stores',
    'workflows',
    'module-application',
    'module-composable',
    'module-domain',
    'module-store',
    'module-ui',
  ]),
  pages: new Set([
    'domains',
    'router',
    'stores',
    'module-application',
    'module-composable',
    'module-domain',
    'module-store',
  ]),
  workflows: new Set(['domains', 'pages', 'module-domain']),
  stores: new Set([
    'domains',
    'pages',
    'router',
    'workflows',
    'module-application',
    'module-composable',
    'module-domain',
    'module-store',
    'module-ui',
  ]),
  'module-ui': new Set([
    'domains',
    'pages',
    'router',
    'stores',
    'workflows',
    'module-application',
    'module-composable',
    'module-domain',
    'module-store',
  ]),
  'module-application': new Set([
    'pages',
    'router',
    'stores',
    'workflows',
    'module-composable',
    'module-store',
    'module-ui',
  ]),
  'module-store': new Set([
    'domains',
    'pages',
    'router',
    'stores',
    'workflows',
    'module-application',
    'module-composable',
    'module-ui',
  ]),
  'module-domain': new Set([
    'pages',
    'router',
    'stores',
    'workflows',
    'module-application',
    'module-composable',
    'module-store',
    'module-ui',
  ]),
  'module-composable': new Set([
    'domains',
    'pages',
    'router',
    'workflows',
    'module-domain',
    'module-ui',
  ]),
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

async function collectFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)))
      continue
    }

    if (codeExtensions.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

function extractImports(source: string): string[] {
  const matches = source.matchAll(
    /(?:import\s+(?:[^'"`]+?\s+from\s+)?|import\s*\()\s*['"]([^'"]+)['"]/g
  )
  return [...matches].map((match) => match[1]).filter((s): s is string => s !== undefined)
}

function resolveImportSpecifier(importerPath: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return path.normalize(path.join(rendererRoot, specifier.slice(2)))
  }

  if (specifier.startsWith('.')) {
    return path.normalize(path.resolve(path.dirname(importerPath), specifier))
  }

  return null
}

function classifyLayer(filePath: string): Layer | null {
  const relativePath = toPosix(path.relative(rendererRoot, filePath))
  if (relativePath.startsWith('../')) {
    return null
  }

  if (relativePath.startsWith('shared/')) {
    return 'shared'
  }

  if (relativePath.startsWith('domains/')) {
    return 'domains'
  }

  if (relativePath.startsWith('pages/')) {
    return 'pages'
  }

  if (relativePath.startsWith('workflows/')) {
    return 'workflows'
  }

  if (relativePath.startsWith('stores/')) {
    return 'stores'
  }

  if (relativePath.startsWith('router/')) {
    return 'router'
  }

  const parts = relativePath.split('/')
  if (parts[0] !== 'modules' || parts.length < 3) {
    return null
  }

  switch (parts[2]) {
    case 'application':
      return 'module-application'
    case 'ui':
      return 'module-ui'
    case 'store':
      return 'module-store'
    case 'domain':
      return 'module-domain'
    case 'composables':
      return 'module-composable'
    default:
      return null
  }
}

function getRelativeRendererPath(filePath: string): string {
  return toPosix(path.relative(rendererRoot, filePath))
}

function matchesAnyPrefix(value: string, prefixes: string[] = []): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix))
}

async function main() {
  const files = await collectFiles(rendererRoot)
  const violations: {
    filePath: string
    sourceLayer: string
    targetLayer: string
    specifier: string
  }[] = []

  for (const filePath of files) {
    const sourceLayer = classifyLayer(filePath)
    if (!sourceLayer || !forbiddenImportsByLayer[sourceLayer]) {
      continue
    }

    const fileContent = await fs.readFile(filePath, 'utf8')
    const relativeFilePath = getRelativeRendererPath(filePath)

    if (
      !relativeFilePath.startsWith('shared/persistence/') &&
      /(localStorage|sessionStorage)/.test(fileContent)
    ) {
      violations.push({
        filePath: path.relative(projectRoot, filePath),
        sourceLayer,
        targetLayer: 'browser-storage',
        specifier: 'localStorage/sessionStorage',
      })
    }

    const imports = extractImports(fileContent)

    for (const specifier of imports) {
      const resolvedPath = resolveImportSpecifier(filePath, specifier)
      if (!resolvedPath) {
        continue
      }

      const targetLayer = classifyLayer(resolvedPath)
      if (!targetLayer) {
        continue
      }

      if (!forbiddenImportsByLayer[sourceLayer].has(targetLayer)) {
        const relativeTargetPath = getRelativeRendererPath(resolvedPath)

        if (
          sourceLayer === 'workflows' &&
          matchesAnyPrefix(relativeTargetPath, [
            'shared/platform/',
            'shared/persistence/',
            'shared/network/',
            'shared/chain/',
          ])
        ) {
          violations.push({
            filePath: path.relative(projectRoot, filePath),
            sourceLayer,
            targetLayer: 'shared-infrastructure',
            specifier,
          })
        }

        if (
          matchesAnyPrefix(relativeFilePath, ['shared/network/', 'shared/chain/']) &&
          relativeTargetPath.startsWith('shared/ui/')
        ) {
          violations.push({
            filePath: path.relative(projectRoot, filePath),
            sourceLayer,
            targetLayer: 'shared-ui',
            specifier,
          })
        }

        continue
      }

      violations.push({
        filePath: path.relative(projectRoot, filePath),
        sourceLayer,
        targetLayer,
        specifier,
      })
    }
  }

  if (violations.length > 0) {
    console.error('Import boundary violations found:')
    for (const violation of violations) {
      console.error(
        `- ${violation.filePath}: ${violation.sourceLayer} cannot import ${violation.targetLayer} (${violation.specifier})`
      )
    }
    process.exitCode = 1
    return
  }

  console.log('Import boundaries passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
