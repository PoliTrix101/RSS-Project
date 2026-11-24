// Phone photos are often 3–8 MB. Before upload they are scaled so the longest side is
// at most MAX_EDGE pixels and re-encoded as JPEG, which keeps them sharp enough to review
// while making uploads fast on mobile data. If the browser can't decode the file, the
// original is returned and the server decides whether to accept it.
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82
const SERVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// Slow phones can take a few seconds on a large photo; past this, upload the original.
const TIMEOUT_MS = 15000

// `maxEdge` lets callers that show small images (like profile pictures) shrink further.
export async function preparePhoto(file, baseName = 'photo', { maxEdge = MAX_EDGE } = {}) {
  if (!file) return null
  const fallback = new Promise(resolve => setTimeout(() => resolve(file), TIMEOUT_MS))
  return Promise.race([shrink(file, baseName, maxEdge), fallback])
}

async function shrink(file, baseName, maxEdge) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) return file
    // Keep an already-small, server-ready original instead of a larger re-encode.
    if (SERVER_TYPES.includes(file.type) && blob.size >= file.size) return file
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
