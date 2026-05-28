export default {
  downloadFile(json: unknown, fileName?: string) {
    const content = new Blob([JSON.stringify(json)], { type: 'text/plain;charset=utf-8' })
    const urlObject = window.URL || window.webkitURL || window
    const url = urlObject.createObjectURL(content)
    const el = document.createElement('a')
    el.href = url
    el.download = fileName ? `${fileName}.dat` : 'wallet.dat'
    document.body.appendChild(el)
    el.click()
    urlObject.revokeObjectURL(url)
  },
  readWalletFile(file: Blob) {
    return new Promise<string | ArrayBuffer | null>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = function () {
        resolve(reader.result)
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  },
}
