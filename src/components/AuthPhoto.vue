<template>
  <button
    class="auth-photo"
    type="button"
    :disabled="!objectUrl"
    :title="objectUrl ? `View ${label.toLowerCase()}` : label"
    :aria-label="`View ${label.toLowerCase()}`"
    @click="open = true"
  >
    <img v-if="objectUrl" :src="objectUrl" :alt="label">
    <span v-else class="auth-photo-state">
      <AppIcon v-if="failed" name="image" :size="16" />
      <span v-else class="spinner spinner-sm"></span>
    </span>
    <span class="auth-photo-caption">{{ caption || label }}</span>
  </button>

  <AppModal :open="open" :title="label" :subtitle="subtitle" size="lg" @close="open = false">
    <img v-if="objectUrl" class="auth-photo-full" :src="objectUrl" :alt="label">
  </AppModal>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import AppModal from './AppModal.vue'

// Photos are served only to signed-in users, so an <img src> can't load them directly:
// this fetches the file with the session token and shows it from a local object URL.
const props = defineProps({
  src: { type: String, required: true },
  token: { type: String, required: true },
  label: { type: String, required: true },
  caption: { type: String, default: '' },
  subtitle: { type: String, default: '' }
})

const objectUrl = ref('')
const failed = ref(false)
const open = ref(false)
let controller = null

async function load() {
  controller?.abort()
  controller = new AbortController()
  failed.value = false
  release()
  try {
    const response = await fetch(props.src, {
      headers: { Authorization: `Bearer ${props.token}` },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    objectUrl.value = URL.createObjectURL(await response.blob())
  } catch (error) {
    if (error.name !== 'AbortError') failed.value = true
  }
}

function release() {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}

watch(() => [props.src, props.token], load, { immediate: true })

onBeforeUnmount(() => {
  controller?.abort()
  release()
})
</script>

<style scoped>
.auth-photo {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}
.auth-photo:disabled { cursor: default; }
.auth-photo img,
.auth-photo-state {
  width: 52px;
  height: 52px;
  border-radius: 8px;
}
.auth-photo img { display: block; object-fit: cover; border: 1px solid var(--border); }
.auth-photo:hover:not(:disabled) img { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-soft); }
.auth-photo-state { display: grid; place-items: center; border: 1px dashed var(--border-strong); color: var(--text-4); }
.auth-photo-caption { color: var(--text-3); font-size: 11px; font-weight: 500; }
.auth-photo-full { display: block; max-width: 100%; max-height: 70vh; margin: 0 auto; border-radius: 10px; }
</style>
