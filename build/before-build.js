// The app code is bundled into out/**/* by electron-vite. Returning false tells
// electron-builder not to rebuild or copy production node_modules.
exports.default = async function beforeBuild() {
  return false
}
