import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Coverage is scoped to testable units. Declarative/config-only modules
      // (i18n string tables, route tables, type definitions, app entry wiring)
      // carry no branching logic and are validated by typecheck + e2e instead.
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/*.stories.{ts,js}',
        'scripts/**',
        'src/**/types.ts',
        'src/shared-types/**',
        'src/main/index.ts',
        'src/renderer/src/main.ts',
        'src/renderer/src/router/**',
        // i18n string tables: declarative key/value maps with no logic.
        // Key parity is enforced by src/renderer/src/lang/i18nKeys.test.ts.
        'src/renderer/src/lang/en.ts',
        'src/renderer/src/lang/zh.ts',
        'src/renderer/src/**/locales.ts',
        'src/renderer/src/**/locales/**',
        'src/renderer/src/**/i18n/**',
      ],
      // Minimum enforced floors. Current actuals sit a little above these
      // (statements/lines ~90%, functions ~87%, branches ~80%); the floors are
      // set at the agreed targets so accidental regressions fail CI while leaving
      // headroom for unrelated edits. Residual uncovered branches are Vue page
      // orchestration and Ledger/SDK adapters, which are exercised by Playwright e2e.
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 70,
        lines: 80,
      },
    },
  },
})
