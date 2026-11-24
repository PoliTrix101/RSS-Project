const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const multer = require('multer')

// Before and after photos attached to an attendance record. They live outside any
// public folder and are only sent through the authenticated student and admin routes.

const photoDirectory = path.resolve(__dirname, '../private_attendance_photos')
const photoPattern = /^[0-9a-f-]{36}\.(jpg|png|webp)$/i
const extensionForType = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
])
const typeForExtension = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}
const PHOTO_KINDS = ['before', 'after']
const MAX_PHOTO_MB = 10

fs.mkdirSync(photoDirectory, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: photoDirectory,
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${extensionForType.get(file.mimetype)}`)
    }
  }),
  limits: {
    fileSize: MAX_PHOTO_MB * 1024 * 1024,
    files: PHOTO_KINDS.length,
    fields: 10
  },
  fileFilter: (req, file, callback) => {
    if (!extensionForType.has(file.mimetype)) {
      return callback(new Error('Photos must be JPEG, PNG, or WebP images.'))
    }
    return callback(null, true)
  }
}).fields(PHOTO_KINDS.map(kind => ({ name: `${kind}_photo`, maxCount: 1 })))

function photoFile(req, kind) {
  return req.files?.[`${kind}_photo`]?.[0] || null
}

async function removePhoto(filePath) {
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to remove attendance photo:', error)
  }
}

// Accepts multipart uploads of before_photo / after_photo. Stored files are deleted
// again unless the route answers 201, so a rejected submission leaves nothing behind.
function handleAttendancePhotos(req, res, next) {
  upload(req, res, error => {
    if (error) {
      let message = error.message || 'Photo upload failed.'
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') message = `Each photo must be ${MAX_PHOTO_MB} MB or smaller.`
        else if (['LIMIT_UNEXPECTED_FILE', 'LIMIT_FILE_COUNT'].includes(error.code)) {
          message = 'Only a before photo and an after photo can be uploaded.'
        }
      }
      return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message })
    }

    const stored = PHOTO_KINDS.map(kind => photoFile(req, kind)).filter(Boolean)
    if (stored.length) {
      res.once('close', () => {
        if (res.statusCode !== 201 || !res.writableFinished) {
          stored.forEach(file => removePhoto(file.path))
        }
      })
    }
    return next()
  })
}

// Checks the file's first bytes, since the browser-reported type can be anything.
async function hasImageSignature(file) {
  const handle = await fs.promises.open(file.path, 'r')
  try {
    const head = Buffer.alloc(12)
    const { bytesRead } = await handle.read(head, 0, head.length, 0)
    if (file.mimetype === 'image/jpeg') {
      return bytesRead >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
    }
    if (file.mimetype === 'image/png') {
      return bytesRead >= 8 && head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    }
    if (file.mimetype === 'image/webp') {
      return bytesRead >= 12 && head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP'
    }
    return false
  } finally {
    await handle.close()
  }
}

function resolvePhotoPath(fileName) {
  if (typeof fileName !== 'string' || path.basename(fileName) !== fileName || !photoPattern.test(fileName)) {
    return null
  }
  const resolved = path.resolve(photoDirectory, fileName)
  return resolved.startsWith(`${photoDirectory}${path.sep}`) ? resolved : null
}

// Sends one stored photo, or a JSON error. `record` is an attendance row with the photo columns.
async function sendAttendancePhoto(res, record, kind) {
  const fileName = record ? record[`${kind}_photo_path`] : null
  if (!fileName) {
    return res.status(404).json({ success: false, message: `No ${kind} photo was uploaded for this attendance.` })
  }

  const filePath = resolvePhotoPath(String(fileName))
  const mimeType = filePath ? typeForExtension[path.extname(filePath).toLowerCase()] : null
  if (!filePath || !mimeType) {
    console.error('Invalid stored attendance photo name:', fileName)
    return res.status(500).json({ success: false, message: 'The stored photo cannot be accessed.' })
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK)
  } catch {
    return res.status(404).json({ success: false, message: 'The photo file was not found.' })
  }

  res.setHeader('Content-Type', mimeType)
  res.setHeader('Content-Disposition', `inline; filename="${kind}-photo${path.extname(filePath)}"`)
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
  return res.sendFile(filePath, error => {
    if (error && !res.headersSent) {
      console.error('Attendance photo response error:', error)
      res.status(500).json({ success: false, message: 'Failed to send the photo.' })
    }
  })
}

module.exports = {
  PHOTO_KINDS,
  handleAttendancePhotos,
  hasImageSignature,
  photoFile,
  sendAttendancePhoto
}
