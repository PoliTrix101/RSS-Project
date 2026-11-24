<template>
  <section class="auth-view login-view">
    <header class="auth-head">
      <span class="auth-kicker auth-rise" style="--i: 0">
        <AppIcon name="sparkles" :size="14" />
        Welcome back
      </span>
      <h2 class="auth-rise" style="--i: 1">Sign in to your account</h2>
      <p class="auth-rise" style="--i: 2">
        Use your school email to pick up right where you left off.
      </p>
    </header>

    <form ref="formEl" class="login-form" novalidate @submit.prevent="login">
      <AuthField
        id="login-email"
        label="School email"
        icon="mail"
        :error="errors.email"
        class="auth-rise"
        style="--i: 3"
      >
        <template #default="{ attrs }">
          <input
            ref="emailInput"
            v-bind="attrs"
            v-model="email"
            type="email"
            inputmode="email"
            placeholder="name@school.edu.ph"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            @input="clearError('email')"
          />
        </template>
      </AuthField>

      <AuthField
        id="login-password"
        label="Password"
        icon="lock"
        :error="errors.password"
        :hint="capsLockOn ? 'Caps Lock is on' : ''"
        hint-tone="warning"
        hint-icon="alert-triangle"
        class="auth-rise"
        style="--i: 4"
      >
        <template #aside>
          <router-link to="/forgot-password" class="auth-link forgot-link">
            Forgot password?
          </router-link>
        </template>

        <template #default="{ attrs }">
          <input
            v-bind="attrs"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter your password"
            autocomplete="current-password"
            @input="clearError('password')"
            @keydown="detectCapsLock"
            @keyup="detectCapsLock"
            @blur="capsLockOn = false"
          />
        </template>

        <template #suffix>
          <button
            type="button"
            class="auth-reveal"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <Transition name="icon-swap" mode="out-in">
              <AppIcon :key="String(showPassword)" :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
            </Transition>
          </button>
        </template>
      </AuthField>

      <div class="auth-rise" style="--i: 5">
        <label class="auth-check">
          <input v-model="rememberMe" type="checkbox" />
          <span class="auth-check-box" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path pathLength="24" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <span>Keep me signed in on this device</span>
        </label>
      </div>

      <Transition name="auth-alert">
        <div
          v-if="message"
          class="auth-alert"
          :class="`is-${messageType}`"
          :role="messageType === 'error' ? 'alert' : 'status'"
        >
          <AppIcon :name="messageType === 'warning' ? 'hourglass' : 'alert-circle'" :size="17" />
          <span>{{ message }}</span>
        </div>
      </Transition>

      <div class="auth-rise" style="--i: 6">
        <button
          type="submit"
          class="auth-btn auth-btn-primary auth-btn-block"
          :class="{ 'is-success': status === 'success' }"
          :disabled="status !== 'idle'"
        >
          <Transition name="btn-swap" mode="out-in">
            <span v-if="status === 'loading'" key="loading" class="auth-btn-content">
              <span class="auth-spinner" aria-hidden="true" />
              Signing in…
            </span>
            <span v-else-if="status === 'success'" key="success" class="auth-btn-content">
              <AppIcon name="check" :size="18" :stroke-width="2.6" />
              Signed in
            </span>
            <span v-else key="idle" class="auth-btn-content">
              Sign in
              <AppIcon name="arrow-right" :size="18" class="auth-btn-arrow" />
            </span>
          </Transition>
        </button>
      </div>

      <p class="sr-only" role="status">{{ status === 'success' ? 'Signed in. Redirecting…' : '' }}</p>
    </form>

    <p class="auth-alt auth-rise" style="--i: 7">
      Don't have an account?
      <router-link to="/register" class="auth-link">Create one</router-link>
    </p>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AuthField from '@/components/AuthField.vue'
import { hasFinePointer, prefersReducedMotion, shake, wait } from '@/utils/motion'

const router = useRouter()

// Backend API URL
const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Form values
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const capsLockOn = ref(false)

// Form state
const errors = reactive({ email: '', password: '' })
const message = ref('')
const messageType = ref('error') // error | warning
const status = ref('idle') // idle | loading | success

const formEl = ref(null)
const emailInput = ref(null)

onMounted(() => {
  // Only auto-focus with a mouse; on phones it would pop the keyboard open.
  if (hasFinePointer()) emailInput.value?.focus({ preventScroll: true })
})

function detectCapsLock(event) {
  if (typeof event.getModifierState === 'function') {
    capsLockOn.value = event.getModifierState('CapsLock')
  }
}

function clearError(field) {
  errors[field] = ''
}

function validate() {
  const value = email.value.trim()

  errors.email = !value
    ? 'Enter your school email.'
    : !EMAIL_PATTERN.test(value)
      ? 'That doesn’t look like a valid email address.'
      : ''
  errors.password = password.value ? '' : 'Enter your password.'

  return !errors.email && !errors.password
}

function rejectForm() {
  shake(formEl.value)
  const firstInvalid = errors.email ? 'login-email' : errors.password ? 'login-password' : null
  if (firstInvalid) document.getElementById(firstInvalid)?.focus()
}

async function login() {
  if (status.value !== 'idle') return

  message.value = ''

  if (!validate()) {
    rejectForm()
    return
  }

  status.value = 'loading'

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(data.message || 'Login failed.')
      error.status = response.status
      throw error
    }

    // Validate the response before saving the session
    if (!data.token || !data.user || !data.user.role) {
      throw new Error('Invalid login response from server.')
    }

    // Only allow recognized account roles
    if (!['admin', 'student'].includes(data.user.role)) {
      throw new Error('Unknown account role.')
    }

    // Clear previous login sessions
    localStorage.removeItem('rss_token')
    localStorage.removeItem('rss_user')
    sessionStorage.removeItem('rss_token')
    sessionStorage.removeItem('rss_user')

    // Remember me = localStorage
    // Otherwise = sessionStorage
    const storage = rememberMe.value
      ? localStorage
      : sessionStorage

    storage.setItem('rss_token', data.token)
    storage.setItem('rss_user', JSON.stringify(data.user))

    // Let the button's success state show for a moment before leaving.
    status.value = 'success'
    if (!prefersReducedMotion()) await wait(550)

    // Redirect based on account role
    if (data.user.role === 'admin') {
      await router.push('/admin/dashboard')
    } else {
      await router.push('/student/dashboard')
    }

  } catch (error) {
    status.value = 'idle'

    // 403 = the account exists but is pending or not allowed yet.
    messageType.value = error.status === 403 ? 'warning' : 'error'

    if (error instanceof TypeError) {
      message.value = 'Cannot connect to the server. Make sure your backend is running.'
    } else {
      message.value = error.message
    }

    shake(formEl.value)
  }
}
</script>

<style scoped>
.login-view { max-width: 420px; }

.login-form {
  display: grid;
  gap: 20px;
}

.forgot-link { font-size: 13px; }
</style>
