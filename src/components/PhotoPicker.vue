<template>
  <div class="photo-picker" :class="{ filled: previewUrl, invalid }">
    <div class="photo-picker-head">
      <span class="field-label">{{ label }} <span v-if="!required" class="optional">(optional)</span></span>
      <span v-if="hint" class="field-hint">{{ hint }}</span>
    </div>

    <div v-if="previewUrl" class="photo-preview">
      <img :src="previewUrl" :alt="`${label} preview`">
      <div class="photo-preview-actions">
        <button class="btn btn-secondary btn-sm" type="button" :disabled="disabled || processing" @click="choose">
          <AppIcon name="camera" :size="15" /> Change
        </button>
        <button class="btn btn-ghost btn-sm" type="button" :disabled="disabled || processing" @click="clear">Remove</button>
      </div>
    </div>
    <button v-else class="photo-drop" type="button" :disabled="disabled || processing" @click="choose">
      <span v-if="processing" class="spinner spinner-sm"></span>
      <AppIcon v-else name="camera" :size="22" />
      <span class="photo-drop-title">{{ processing ? 'Preparing photo…' : `Add ${label.toLowerCase()}` }}</span>
      <span class="photo-drop-text">Take a photo or choose one · JPEG, PNG or WebP</span>
    </button>

    <input
      ref="input"
      class="sr-only"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      tabindex="-1"
      @change="onChange"
    >
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { preparePhoto } from '@/utils/photos'

const props = defineProps({
  modelValue: { type: Object, default: null },
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  name: { type: String, default: 'photo' },
  required: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const input = ref(null)
const previewUrl = ref('')
const processing = ref(false)

function choose() {
  input.value?.click()
}

function clear() {
  emit('update:modelValue', null)
}

async function onChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  processing.value = true
  try {
    emit('update:modelValue', await preparePhoto(file, props.name))
  } finally {
    processing.value = false
  }
}

watch(() => props.modelValue, file => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = file ? URL.createObjectURL(file) : ''
}, { immediate: true })

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<style scoped>
.photo-picker { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.photo-picker-head { display: flex; flex-direction: column; gap: 2px; }
.photo-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 150px;
  padding: 18px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  color: var(--text-3);
  cursor: pointer;
  text-align: center;
  transition: border-color .15s ease, background .15s ease;
}
.photo-drop:hover:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-text); }
.photo-drop:disabled { cursor: progress; }
.invalid .photo-drop { border-color: var(--danger); }
.photo-drop-title { color: var(--text); font-size: 14px; font-weight: 600; }
.photo-drop-text { font-size: 12px; }
.photo-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-2);
}
.photo-preview img { display: block; width: 100%; height: 190px; object-fit: cover; }
.photo-preview-actions { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--border); background: var(--surface); }
</style>
