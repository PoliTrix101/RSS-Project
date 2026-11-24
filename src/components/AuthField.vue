<template>
  <div class="auth-field" :class="{ 'has-error': !!error }">
    <div class="auth-field-top">
      <label :for="id" class="auth-label">
        {{ label }}<span v-if="optional" class="auth-optional">Optional</span>
      </label>
      <slot name="aside" />
    </div>

    <div class="auth-control">
      <AppIcon v-if="icon" :name="icon" :size="18" class="auth-control-icon" />
      <!-- The input itself; bind `attrs` to it for the id and ARIA wiring. -->
      <slot :attrs="inputAttrs" />
      <slot name="suffix" />
    </div>

    <slot name="below" />

    <Transition name="auth-msg" mode="out-in">
      <p v-if="error" :id="messageId" key="error" class="auth-field-msg is-error">
        <AppIcon name="alert-circle" :size="14" />
        <span>{{ error }}</span>
      </p>
      <p v-else-if="hint" :id="messageId" :key="`hint-${hintTone}`" class="auth-field-msg" :class="`is-${hintTone}`">
        <AppIcon v-if="hintIcon" :name="hintIcon" :size="14" />
        <span>{{ hint }}</span>
      </p>
    </Transition>
  </div>
</template>

<script setup>
// A labelled input shell for the auth pages: icon, focus glow, and an
// animated error/hint line underneath. Styles live in AuthLayout.vue.
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  hintTone: { type: String, default: 'hint' }, // hint | success | warning
  hintIcon: { type: String, default: '' },
  optional: { type: Boolean, default: false }
})

const messageId = computed(() => `${props.id}-message`)

const inputAttrs = computed(() => ({
  id: props.id,
  'aria-invalid': props.error ? 'true' : undefined,
  'aria-describedby': props.error || props.hint ? messageId.value : undefined
}))
</script>
