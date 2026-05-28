import FileHelper from '../../../shared/persistence/fileHelper'

export function readImportedWalletFile(file: Blob) {
  return FileHelper.readWalletFile(file)
}
