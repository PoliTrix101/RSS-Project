const path = require('path')

const documentDirectory = path.resolve(__dirname, '../private_documents')
const documentPattern = /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/i
const documentMimeTypes = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

function resolveDocumentPath(fileName) {
  if (
    typeof fileName !== 'string' ||
    path.basename(fileName) !== fileName ||
    !documentPattern.test(fileName)
  ) {
    return null
  }

  const resolvedPath = path.resolve(documentDirectory, fileName)
  return resolvedPath.startsWith(`${documentDirectory}${path.sep}`)
    ? resolvedPath
    : null
}

function getDocumentMimeType(fileName) {
  const extension = path.extname(fileName).toLowerCase()
  return documentMimeTypes[extension] || null
}

module.exports = {
  documentDirectory,
  resolveDocumentPath,
  getDocumentMimeType
}
