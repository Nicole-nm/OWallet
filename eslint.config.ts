// @ts-expect-error - @eslint/js lacks type declarations
import js from '@eslint/js'
import globals from 'globals'
import prettier from 'eslint-config-prettier'
import storybook from 'eslint-plugin-storybook'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

const legacyTypeGlobals = {
  LooseArray: 'readonly',
  LooseFunction: 'readonly',
  LooseRecord: 'readonly',
  LooseValue: 'readonly',
} as const

const sharedRules: Record<string, unknown> = {
  'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  'no-empty': 'warn',
  'no-empty-pattern': 'warn',
  'no-mixed-spaces-and-tabs': 'off',
}

const tsRules: Record<string, unknown> = {
  '@typescript-eslint/no-unused-vars': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
}

export default tseslint.config(
  {
    ignores: [
      'dist_electron/**',
      'node_modules/**',
      'out/**',
      'coverage/**',
      'storybook-static/**',
      'build/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  ...storybook.configs['flat/recommended'],
  {
    files: ['src/renderer/src/**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...legacyTypeGlobals,
      },
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      ...sharedRules,
      ...tsRules,
      'no-unused-vars': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': 'warn',
      'vue/no-deprecated-v-on-native-modifier': 'warn',
      'vue/require-explicit-emits': 'warn',
    },
  },
  {
    files: ['src/preload/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...sharedRules,
      ...tsRules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/main/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...legacyTypeGlobals,
      },
    },
    rules: {
      ...sharedRules,
      ...tsRules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['electron.vite.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: globals.node,
    },
    rules: {
      ...sharedRules,
      ...tsRules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: globals.node,
    },
    rules: {
      ...sharedRules,
      ...tsRules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...sharedRules,
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['.storybook/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...sharedRules,
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['.storybook/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...sharedRules,
      ...tsRules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...sharedRules,
      ...tsRules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier
)
