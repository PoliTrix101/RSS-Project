<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @mousedown.self="onBackdrop">
        <section
          ref="panel"
          class="modal"
          :class="size !== 'md' ? `modal-${size}` : ''"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown.esc.stop="requestClose"
        >
          <header class="modal-header">
            <div>
              <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
              <h2 :id="titleId">{{ title }}</h2>
              <p v-if="subtitle" class="modal-subtitle">{{ subtitle }}</p>
            </div>
            <button
              v-if="closable"
              class="btn btn-ghost btn-icon btn-sm"
              type="button"
              aria-label="Close"
              @click="requestClose"
            >
              <AppIcon name="x" />
            </button>
          </header>
          <div class="modal-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  size: { type: String, default: 'md' },
  closable: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true }
})
const emit = defineEmits(['close'])

const panel = ref(null)
const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`
let previouslyFocused = null

function requestClose() {
  if (props.closable) emit('close')
}

function onBackdrop() {
  if (props.closeOnBackdrop) requestClose()
}

watch(() => props.open, async open => {
  if (open) {
    previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'
    await nextTick()
    const target = panel.value?.querySelector('[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
    ;(target || panel.value)?.focus()
  } else {
    document.body.style.overflow = ''
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>
