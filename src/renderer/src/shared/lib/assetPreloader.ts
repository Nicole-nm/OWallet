const preloadedAssets = new Set()

export function preloadImageAssets(assetUrls: string[] = []) {
  if (typeof Image === 'undefined') {
    return
  }

  for (const assetUrl of assetUrls) {
    if (!assetUrl || preloadedAssets.has(assetUrl)) {
      continue
    }

    const image = new Image()
    image.decoding = 'async'
    image.src = assetUrl
    preloadedAssets.add(assetUrl)
  }
}
