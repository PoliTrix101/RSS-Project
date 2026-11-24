const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const multer = require('multer')

// A student's profile picture. users.profile_photo_path holds a file name inside
// private_profile_photos; the files are only sent through the authenticated student route.

const profilePhotoDirectory = path.resolve(__dirname, '../private_profile_photos')
const profilePhotoPattern = /^[0-9a-f-]{36}\.(jpg|png|webp)$/i
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
const MAX_PROFILE_PHOTO_MB = 5

fs.mkdirSync(profilePhotoDirectory, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: profilePhotoDirectory,
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${extensionForType.get(file.mimetype)}`)
    }
  }),
  limits: {
    fileSize: MAX_PROFILE_PHOTO_MB * 1024 * 1024,
    files: 1,
    fields: 5
  },
  fileFilter: (req, file, callback) => {
    if (!extensionForType.has(file.mimetype)) {
      return callback(new Error('Profile pictures must be JPEG, PNG, or WebP images.'))
    }
    return callback(null, true)
  }
}).single('photo')

function resolveProfilePhotoPath(fileName) {
  if (typeof fileName !== 'string' || path.basename(fileName) !== fileName || !profilePhotoPattern.test(fileName)) {
    return null
  }
  const resolved = path.resolve(profilePhotoDirectory, fileName)
  return resolved.startsWith(`${profilePhotoDirectory}${path.sep}`) ? resolved : null
}

async function removeFile(filePath) {
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to remove profile photo:', error)
  }
}

// Deletes a stored picture by the file name kept in users.profile_photo_path.
async function removeStoredProfilePhoto(fileName) {
  const filePath = fileName ? resolveProfilePhotoPath(String(fileName)) : null
  if (filePath) await removeFile(filePath)
}

// Accepts one multipart image in the "photo" field. The stored file is deleted again
// unless the route calls keepUploadedProfilePhoto(res) after saving it.
function handleProfilePhotoUpload(req, res, next) {
  upload(req, res, error => {
    if (error) {
      let message = error.message || 'Picture upload failed.'
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') message = `The picture must be ${MAX_PROFILE_PHOTO_MB} MB or smaller.`
        else if (['LIMIT_UNEXPECTED_FILE', 'LIMIT_FILE_COUNT'].includes(error.code)) {
          message = 'Upload one picture at a time.'
        }
      }
      return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message })
    }

    if (req.file) {
      const stored = req.file.path
      res.once('close', () => {
        if (!res.locals.keepProfilePhoto) removeFile(stored)
      })
    }
    return next()
  })
}

function keepUploadedProfilePhoto(res) {
  res.locals.keepProfilePhoto = true
}

// True when migration 006 has not added users.profile_photo_path to this database yet.
function isMissingProfilePhotoColumn(error) {
  return /no such column/i.test(error?.message || '') && /profile_photo_path/i.test(error?.message || '')
}

// Sends the stored picture, or a JSON error. Pass `maxAgeSeconds` only when the URL
// changes with every upload (the admin URLs carry ?v=); otherwise browsers revalidate.
async function sendProfilePhoto(res, fileName, { maxAgeSeconds = 0 } = {}) {
  const filePath = resolveProfilePhotoPath(String(fileName))
  const mimeType = filePath ? typeForExtension[path.extname(filePath).toLowerCase()] : null
  if (!filePath || !mimeType) {
    console.error('Invalid stored profile photo name:', fileName)
    return res.status(500).json({ success: false, message: 'The stored picture cannot be accessed.' })
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK)
  } catch {
    return res.status(404).json({ success: false, message: 'The picture file was not found.' })
  }

  res.setHeader('Content-Type', mimeType)
  res.setHeader('Content-Disposition', `inline; filename="profile-photo${path.extname(filePath)}"`)
  res.setHeader('Cache-Control', maxAgeSeconds > 0 ? `private, max-age=${maxAgeSeconds}` : 'private, no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
  return res.sendFile(filePath, error => {
    if (error && !res.headersSent) {
      console.error('Profile photo response error:', error)
      res.status(500).json({ success: false, message: 'Failed to send the picture.' })
    }
  })
}

module.exports = {
  MAX_PROFILE_PHOTO_MB,
  handleProfilePhotoUpload,
  isMissingProfilePhotoColumn,
  keepUploadedProfilePhoto,
  removeStoredProfilePhoto,
  sendProfilePhoto
}
