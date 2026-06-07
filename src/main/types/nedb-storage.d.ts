declare module '@seald-io/nedb/lib/storage' {
  interface NedbStorageModes {
    fileMode: number
    dirMode: number
  }

  interface NedbStorage {
    crashSafeWriteFileLinesAsync(
      filename: string,
      lines: string[],
      modes?: NedbStorageModes
    ): Promise<void>
    ensureParentDirectoryExistsAsync(filename: string, mode: number): Promise<void>
    writeFileLinesAsync(filename: string, lines: string[], mode?: number): Promise<void>
  }

  const storage: NedbStorage
  export default storage
}
