<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
        :role="toast.type === 'error' ? 'alert' : 'status'"
      >
        <span class="toast-icon">
          <AppIcon :name="iconFor(toast.type)" :size="18" />
        </span>
        <p>{{ toast.message }}</p>
        <button type="button" class="toast-close" aria-label="Dismiss" @click="dismiss(toast.id)">
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

function iconFor(type) {
  return { success: 'check-circle', error: 'alert-circle' }[type] || 'info'
}
</script>

<style scoped>
.toast-host {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 12px 12px 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}
.toast p { flex: 1; min-width: 0; margin: 0; color: var(--text); font-size: 14px; line-height: 1.45; }
.toast-icon { display: grid; place-items: center; margin-top: 1px; }
.toast-success .toast-icon { color: var(--success-solid); }
.toast-error { border-color: #f3c6c1; }
.toast-error .toast-icon { color: var(--danger-solid); }
.toast-info .toast-icon { color: var(--primary); }
.toast-close { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--text-4); cursor: pointer; }
.toast-close:hover { background: var(--surface-3); color: var(--text-2); }

.toast-enter-active, .toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.toast-enter-from { opacity: 0; transform: translateY(8px); }
.toast-leave-to { opacity: 0; transform: translateX(16px); }

@media (max-width: 560px) {
  .toast-host { right: 16px; bottom: 16px; left: 16px; width: auto; }
}
</style>
