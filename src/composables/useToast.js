import { reactive } from 'vue'

// One app-wide toast stack, rendered by <ToastHost> in App.vue.
const toasts = reactive([])
let nextId = 1

function push(type, message, timeout) {
  if (!message) return
  const id = nextId++
  toasts.push({ id, type, message })
  if (timeout > 0) setTimeout(() => dismiss(id), timeout)
}

export function dismiss(id) {
  const index = toasts.findIndex(toast => toast.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

export function useToast() {
  return {
    toasts,
    dismiss,
    success: message => push('success', message, 4000),
    error: message => push('error', message, 7000),
    info: message => push('info', message, 4000)
  }
}
