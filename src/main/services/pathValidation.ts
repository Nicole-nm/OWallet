'use strict'

import { readdir, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function isWindowsPlatform() {
  const platform = os.platform()
  return platform.startsWith('win') && platform !== 'darwin'
}

export async function validateKeystorePath(targetPath: string): Promise<boolean> {
  if (typeof targetPath !== 'string' || !targetPath) {
    return false
  }

  try {
    const targetStats = await stat(targetPath)
    if (!targetStats.isDirectory()) {
      return false
    }

    const windows = isWindowsPlatform()
    const pathTools = windows ? path.win32 : path
    const cwd = pathTools.resolve(process.cwd())
    const resolvedTarget = pathTools.resolve(targetPath)
    if (
      cwd !== pathTools.parse(cwd).root &&
      (resolvedTarget === cwd || resolvedTarget.startsWith(`${cwd}${pathTools.sep}`))
    ) {
      return false
    }

    if (!windows) {
      return true
    }
  } catch {
    return false
  }

  try {
    const files = await readdir(targetPath)
    if (files.includes('resources') && files.includes('OWallet.exe')) {
      return false
    }

    return true
  } catch {
    return false
  }
}
