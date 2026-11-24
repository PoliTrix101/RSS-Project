<template>
  <AppModal
    :open="state.open"
    :title="state.title"
    size="sm"
    @close="settleConfirm(false)"
  >
    <div class="confirm-body">
      <span class="confirm-icon" :class="state.tone === 'danger' ? 'tone-red' : 'tone-blue'">
        <AppIcon :name="state.tone === 'danger' ? 'alert-triangle' : 'info'" :size="20" />
      </span>
      <div class="confirm-copy">
        <p>{{ state.message }}</p>
        <p v-if="state.details" class="confirm-details">{{ state.details }}</p>
      </div>
    </div>

    <label v-if="state.note" class="field confirm-note">
      <span class="field-label">
        {{ state.note.label || 'Note' }}
        <span v-if="!state.note.required" class="optional">(optional)</span>
      </span>
      <textarea
        v-model="state.noteValue"
        rows="3"
        :maxlength="state.note.maxlength || 500"
        :placeholder="state.note.placeholder || ''"
        @keydown.enter.ctrl.prevent="submit"
      ></textarea>
      <span v-if="state.note.hint" class="field-hint">{{ state.note.hint }}</span>
    </label>

    <template #footer>
      <button class="btn btn-secondary" type="button" @click="settleConfirm(false)">
        {{ state.cancelLabel }}
      </button>
      <button
        class="btn"
        :class="state.tone === 'danger' ? 'btn-danger' : 'btn-primary'"
        type="button"
        :disabled="noteMissing"
        @click="submit"
      >
        {{ state.confirmLabel }}
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import AppModal from './AppModal.vue'
import { settleConfirm, useConfirmState } from '@/composables/useConfirm'

const state = useConfirmState()
const noteMissing = computed(() => Boolean(state.note?.required) && !state.noteValue.trim())

function submit() {
  if (!noteMissing.value) settleConfirm(true)
}
</script>

<style scoped>
.confirm-body { display: flex; align-items: flex-start; gap: 14px; }
.confirm-icon { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 auto; border-radius: 12px; }
.confirm-copy { min-width: 0; padding-top: 2px; }
.confirm-copy p { margin: 0; color: var(--text-2); font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
.confirm-copy .confirm-details { margin-top: 6px; color: var(--text-3); font-size: 13px; }
.confirm-note { margin-top: 18px; }
</style>
