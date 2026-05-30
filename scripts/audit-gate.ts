/**
 * CI dependency-audit gate.
 *
 * `yarn audit` exits with a non-zero bitmask whenever ANY advisory is found,
 * which makes it unusable as a plain CI gate while we carry known-but-unfixable
 * transitive advisories. Those advisories all originate from `ontology-ts-sdk`
 * (and its bundled `vm-browserify`/`babel` chain) and cannot be resolved without
 * an upstream SDK release. This gate parses the audit report, ignores advisories
 * whose dependency path roots in an allowlisted package, and fails ONLY on
 * actionable advisories that we can remediate ourselves.
 *
 * Revisit `ALLOWED_VULNERABLE_ROOTS` whenever its entries publish a fixed
 * release — the goal is to shrink this list to empty.
 */
import { spawnSync } from 'node:child_process'

/**
 * Roots whose advisories are knowingly carried because no fixed release exists:
 * - `ontology-ts-sdk`: transitive `vm-browserify`/`babel` chain; needs an SDK bump.
 * - `elliptic`: GHSA-848j-6mx2-7j84 affects all versions `<=6.6.1` (the latest);
 *   `patched_versions` is empty, so there is nothing to upgrade to yet. Required
 *   for wallet key/signature primitives, so removal is not an option today.
 */
const ALLOWED_VULNERABLE_ROOTS = new Set(['ontology-ts-sdk', 'elliptic'])

interface AuditAdvisory {
  type: string
  data: {
    advisory?: {
      id: number
      module_name: string
      severity: string
      title: string
      url?: string
    }
    resolution?: {
      id: number
      path: string
    }
  }
}

function runYarnAudit(): string {
  const result = spawnSync('yarn', ['audit', '--json', '--groups', 'dependencies'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })

  if (result.error) {
    throw result.error
  }

  // yarn audit exits non-zero when advisories exist; that is expected here.
  return result.stdout ?? ''
}

function isAllowlisted(resolutionPath: string): boolean {
  const root = resolutionPath.split('>')[0]?.trim()
  return Boolean(root && ALLOWED_VULNERABLE_ROOTS.has(root))
}

function main(): void {
  const output = runYarnAudit()
  const lines = output.split('\n').filter((line) => line.trim().length > 0)

  const actionable: { id: number; module: string; severity: string; path: string }[] = []
  const ignored = new Set<number>()

  for (const line of lines) {
    let entry: AuditAdvisory
    try {
      entry = JSON.parse(line) as AuditAdvisory
    } catch {
      continue
    }

    if (entry.type !== 'auditAdvisory' || !entry.data.advisory || !entry.data.resolution) {
      continue
    }

    const { advisory, resolution } = entry.data
    if (isAllowlisted(resolution.path)) {
      ignored.add(advisory.id)
      continue
    }

    actionable.push({
      id: advisory.id,
      module: advisory.module_name,
      severity: advisory.severity,
      path: resolution.path,
    })
  }

  if (ignored.size > 0) {
    console.log(
      `audit-gate: ignored ${ignored.size} known advisory id(s) rooted in allowlisted packages ` +
        `(${[...ALLOWED_VULNERABLE_ROOTS].join(', ')}).`
    )
  }

  if (actionable.length === 0) {
    console.log('audit-gate: no actionable advisories. OK')
    return
  }

  console.error(`audit-gate: ${actionable.length} actionable advisory path(s) found:`)
  for (const item of actionable) {
    console.error(`  - [${item.severity}] ${item.module} (advisory ${item.id}) via ${item.path}`)
  }
  console.error(
    'audit-gate: resolve these or, if they are genuinely unfixable transitive deps, add their ' +
      'root package to ALLOWED_VULNERABLE_ROOTS in scripts/audit-gate.ts with justification.'
  )
  process.exitCode = 1
}

main()
