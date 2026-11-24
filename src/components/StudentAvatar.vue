<template>
  <span class="avatar">
    <img v-if="objectUrl" :src="objectUrl" alt="">
    <template v-else>{{ initialsOf(name, fallback) }}</template>
  </span>
</template>

<script>
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// Shared by every StudentAvatar on the page, so one picture is fetched once even when the
// same student appears in several lists. Keys are versioned paths (?v=), so a new upload
// is a new key; each entry resolves to an object URL, or '' when there is no picture.
const cache = new Map()

function loadPhoto(path, token) {
  if (!cache.has(path)) {
    const pending = fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        const isImage = response.status === 200 && (response.headers.get('content-type') || '').startsWith('image/')
        return isImage ? URL.createObjectURL(await response.blob()) : ''
      })
      .catch(() => {
        cache.delete(path) // a network error may be temporary, so try again next time
        return ''
      })
    cache.set(path, pending)
  }
  return cache.get(path)
}
</script>

<script setup>
import { ref, watch } from 'vue'
import { initialsOf, readSession } from '@/utils/session'

// A student's profile picture for the admin pages, with their initials as the fallback.
// `photoUrl` is the profile_photo_url the admin API returns with each student (null when
// the student has no picture). Size classes such as avatar-sm can be added by the parent.
const props = defineProps({
  name: { type: String, default: '' },
  photoUrl: { type: String, default: null },
  fallback: { type: String, default: '?' }
})

const objectUrl = ref('')

watch(() => props.photoUrl, async path => {
  objectUrl.value = ''
  const token = readSession()?.token
  if (!path || !token) return
  const url = await loadPhoto(path, token)
  if (path === props.photoUrl) objectUrl.value = url
}, { immediate: true })
</script>
