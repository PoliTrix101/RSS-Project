import { reactive } from 'vue'

// An in-app replacement for window.confirm / window.prompt, rendered by
// <ConfirmDialog> in App.vue.
//
//   const { confirmed, note } = await confirm({
//     title: 'Reject attendance',
//     message: 'Reject attendance for Juan on Nov 3?',
//     confirmLabel: 'Reject',
//     tone: 'danger',
//     note: { label: 'Reason', placeholder: '…', required: false }
//   })
const state = reactive({
  open: false,
  title: '',
  message: '',
  details: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'primary',
  note: null,
  noteValue: '',
  resolve: null
})

export function confirm(options = {}) {
  if (state.resolve) state.resolve({ confirmed: false, note: '' })
  Object.assign(state, {
    open: true,
    title: options.title || 'Are you sure?',
    message: options.message || '',
    details: options.details || '',
    confirmLabel: options.confirmLabel || 'Confirm',
    cancelLabel: options.cancelLabel || 'Cancel',
    tone: options.tone || 'primary',
    note: options.note || null,
    noteValue: options.note?.value || ''
  })
  return new Promise(resolve => {
    state.resolve = resolve
  })
}

export function settleConfirm(confirmed) {
  const resolve = state.resolve
  const note = state.noteValue.trim()
  state.open = false
  state.resolve = null
  if (resolve) resolve({ confirmed, note: confirmed ? note : '' })
}

export function useConfirmState() {
  return state
}
