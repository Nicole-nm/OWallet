export function convertScryptParams({ n, r, p, dkLen }: Record<string, unknown>) {
  return { cost: n, blockSize: r, parallel: p, size: dkLen }
}

export function formatScryptParams(scrypt: Record<string, unknown>) {
  return {
    cost: Number(scrypt.n) || 16384,
    blockSize: Number(scrypt.r) || 8,
    parallel: Number(scrypt.p) || 8,
    size: Number(scrypt.dkLen) || 64,
  }
}
