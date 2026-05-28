import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const isDevelopment = process.env.NODE_ENV !== 'production'

const ONTOLOGY_VENDOR_PACKAGES = new Set([
  'ontology-ts-sdk',
  'elliptic',
  'aes-js',
  'asn1.js',
  'bn.js',
  'browserify-aes',
  'browserify-cipher',
  'browserify-des',
  'browserify-rsa',
  'browserify-sign',
  'create-ecdh',
  'create-hash',
  'create-hmac',
  'crypto-browserify',
  'diffie-hellman',
  'evp_bytestokey',
  'hash-base',
  'hash.js',
  'hmac-drbg',
  'https-browserify',
  'inherits',
  'miller-rabin',
  'minimalistic-assert',
  'minimalistic-crypto-utils',
  'parse-asn1',
  'pbkdf2',
  'public-encrypt',
  'randombytes',
  'randomfill',
  'ripemd160',
  'safe-buffer',
  'sha.js',
  'sm.js',
  'stream-browserify',
  'stream-http',
  'to-buffer',
  'typed-array-buffer',
  'util',
  'vm-browserify',
])
const PRODUCTION_CONNECT_SOURCES = [
  "'self'",
  'https://api.github.com',
  'https://service.onto.app',
  'https://service-test.onto.app',
  'https://explorer.ont.io',
  'https://polarisexplorer.ont.io',
  'https://polaris1.ont.io:10334',
  'https://polaris2.ont.io:10334',
  'https://polaris3.ont.io:10334',
  'https://polaris4.ont.io:10334',
  'https://dappnode1.ont.io:10334',
  'https://dappnode2.ont.io:10334',
  'https://dappnode3.ont.io:10334',
  'https://dappnode4.ont.io:10334',
]
const DEVELOPMENT_CONNECT_SOURCES = [
  "'self'",
  'https:',
  'wss:',
  'http://localhost:*',
  'ws://localhost:*',
  'http://127.0.0.1:*',
  'ws://127.0.0.1:*',
]

function createRendererContentSecurityPolicy() {
  const connectSources = isDevelopment ? DEVELOPMENT_CONNECT_SOURCES : PRODUCTION_CONNECT_SOURCES
  // ontology-ts-sdk currently bundles a vm-browserify runtime that evaluates generated
  // code at execution time. Packaged identity and ledger routes crash under a strict
  // production CSP unless unsafe-eval stays enabled for local renderer scripts.
  const scriptSources = ["'self'", "'unsafe-eval'"]

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSources.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')
}

function createRendererHtmlPlugin() {
  const csp = createRendererContentSecurityPolicy()

  return {
    name: 'owallet-renderer-html',
    transformIndexHtml(html: string) {
      return html.replace('%OWALLET_CSP%', csp)
    },
  }
}

function getPackageName(id: string): string | null {
  const marker = `${resolve('node_modules')}/`
  const index = id.lastIndexOf(marker)
  if (index === -1) {
    return null
  }

  const modulePath = id.slice(index + marker.length)
  const parts = modulePath.split('/')
  const scopeOrName = parts[0] ?? ''
  const maybeName = parts[1]
  return scopeOrName.startsWith('@') ? `${scopeOrName}/${maybeName}` : scopeOrName
}

function createRendererManualChunk(id: string): string | null {
  if (!id.includes('/node_modules/')) {
    return null
  }

  const packageName = getPackageName(id)
  if (!packageName) {
    return 'vendor'
  }

  if (['vue', 'vue-router', 'vue-i18n', 'pinia'].includes(packageName)) {
    return 'vue-core'
  }

  if (packageName === 'ant-design-vue') {
    return 'ant-design'
  }

  if (packageName.startsWith('@ant-design/')) {
    return 'ant-design-icons'
  }

  if (ONTOLOGY_VENDOR_PACKAGES.has(packageName)) {
    return 'ontology-vendor'
  }

  if (['lodash', 'qrcode.vue', 'sortablejs'].includes(packageName)) {
    return 'ui-vendor'
  }

  return null
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        'axios/lib/core/settle': resolve('node_modules/axios/lib/core/settle.js'),
        'axios/lib/helpers/buildURL': resolve('node_modules/axios/lib/helpers/buildURL.js'),
        'axios/lib/core/buildFullPath': resolve('node_modules/axios/lib/core/buildFullPath.js'),
        'axios/lib/utils': resolve('build/axios-utils-compat.mjs'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    plugins: [
      createRendererHtmlPlugin(),
      vue(),
      nodePolyfills({
        include: ['buffer', 'crypto', 'process', 'stream', 'util', 'vm'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: createRendererManualChunk,
        },
      },
    },
  },
})
