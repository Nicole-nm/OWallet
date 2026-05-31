import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse as parseVueSfc } from '@vue/compiler-sfc'
import ts from 'typescript'

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

export interface BoundaryViolation {
  filePath: string
  sourceLayer: string
  targetLayer: string
  specifier: string
}

interface CheckImportBoundariesOptions {
  projectRoot?: string
  rendererRoot?: string
}

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

function readVueScripts(source: string, filePath: string): string {
  const { descriptor, errors } = parseVueSfc(source, { filename: filePath })
  if (errors.length > 0) {
    throw new Error(`Unable to parse ${filePath}: ${errors.map(String).join(', ')}`)
  }

  return [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join('\n')
}

function getCodeSource(source: string, filePath: string): string {
  return path.extname(filePath) === '.vue' ? readVueScripts(source, filePath) : source
}

export function extractModuleSpecifiers(source: string, filePath = 'source.ts'): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    getCodeSource(source, filePath),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const specifiers = new Set<string>()

  function addLiteral(node: ts.Expression | undefined): void {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.add(node.text)
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addLiteral(node.moduleSpecifier)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addLiteral(node.moduleReference.expression)
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
      if (isDynamicImport || isRequire) {
        addLiteral(node.arguments[0])
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return [...specifiers]
}

function resolveImportSpecifier(
  importerPath: string,
  specifier: string,
  rendererRoot: string
): string | null {
  if (specifier.startsWith('@/')) {
    return path.normalize(path.join(rendererRoot, specifier.slice(2)))
  }

  if (specifier.startsWith('.')) {
    return path.normalize(path.resolve(path.dirname(importerPath), specifier))
  }

  return null
}

function classifyLayer(filePath: string, rendererRoot: string): Layer | null {
  const relativePath = toPosix(path.relative(rendererRoot, filePath))
  if (relativePath.startsWith('../')) {
    return null
  }

  for (const layer of ['shared', 'domains', 'pages', 'router', 'stores', 'workflows'] as const) {
    if (relativePath.startsWith(`${layer}/`)) {
      return layer
    }
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

function matchesAnyPrefix(value: string, prefixes: string[] = []): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix))
}

export async function checkImportBoundaries({
  projectRoot = process.cwd(),
  rendererRoot = path.join(projectRoot, 'src/renderer/src'),
}: CheckImportBoundariesOptions = {}): Promise<BoundaryViolation[]> {
  const files = await collectFiles(rendererRoot)
  const violations: BoundaryViolation[] = []
  const getRendererPath = (filePath: string) => toPosix(path.relative(rendererRoot, filePath))

  for (const filePath of files) {
    const sourceLayer = classifyLayer(filePath, rendererRoot)
    if (!sourceLayer || !forbiddenImportsByLayer[sourceLayer]) {
      continue
    }

    const fileContent = await fs.readFile(filePath, 'utf8')
    const codeSource = getCodeSource(fileContent, filePath)
    const relativeFilePath = getRendererPath(filePath)

    if (
      !relativeFilePath.startsWith('shared/persistence/') &&
      /(localStorage|sessionStorage)/.test(codeSource)
    ) {
      violations.push({
        filePath: path.relative(projectRoot, filePath),
        sourceLayer,
        targetLayer: 'browser-storage',
        specifier: 'localStorage/sessionStorage',
      })
    }

    for (const specifier of extractModuleSpecifiers(fileContent, filePath)) {
      const resolvedPath = resolveImportSpecifier(filePath, specifier, rendererRoot)
      if (!resolvedPath) {
        continue
      }

      const targetLayer = classifyLayer(resolvedPath, rendererRoot)
      if (!targetLayer) {
        continue
      }

      if (forbiddenImportsByLayer[sourceLayer].has(targetLayer)) {
        violations.push({
          filePath: path.relative(projectRoot, filePath),
          sourceLayer,
          targetLayer,
          specifier,
        })
        continue
      }

      const relativeTargetPath = getRendererPath(resolvedPath)
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
    }
  }

  return violations
}

export async function main(): Promise<void> {
  const violations = await checkImportBoundaries()
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
