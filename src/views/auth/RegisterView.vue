<template>
  <section class="auth-view register-view">
    <Transition name="register-swap" mode="out-in">
      <!-- REGISTRATION WIZARD -->
      <div v-if="!done" key="form">
        <header class="auth-head">
          <span class="auth-kicker auth-rise" style="--i: 0">
            <AppIcon name="user-plus" :size="14" />
            Student registration
          </span>
          <h2 class="auth-rise" style="--i: 1">Create your account</h2>
          <p class="auth-rise" style="--i: 2">Three quick steps — it takes about a minute.</p>
        </header>

        <ol class="stepper auth-rise" style="--i: 3" aria-label="Registration progress">
          <template v-for="(item, i) in STEPS" :key="item.title">
            <li class="stepper-item" :class="{ 'is-active': i === step, 'is-complete': i < step }">
              <button
                type="button"
                class="stepper-btn"
                :disabled="i >= step"
                :aria-current="i === step ? 'step' : undefined"
                :aria-label="`Step ${i + 1}: ${item.title}${i < step ? ' (completed, go back)' : ''}`"
                @click="goTo(i)"
              >
                <span class="stepper-dot">
                  <Transition name="icon-swap" mode="out-in">
                    <AppIcon
                      :key="i < step ? 'done' : item.icon"
                      :name="i < step ? 'check' : item.icon"
                      :size="16"
                      :stroke-width="i < step ? 2.6 : 2"
                    />
                  </Transition>
                </span>
                <span class="stepper-text">
                  <small>Step {{ i + 1 }}</small>
                  <strong>{{ item.title }}</strong>
                </span>
              </button>
            </li>
            <li
              v-if="i < STEPS.length - 1"
              class="stepper-line"
              :class="{ 'is-filled': i < step }"
              aria-hidden="true"
            />
          </template>
        </ol>

        <form ref="formEl" class="auth-rise" style="--i: 4" novalidate @submit.prevent="onSubmit">
          <div class="step-viewport">
            <Transition :name="`step-${stepDirection}`" mode="out-in" @after-enter="focusStep">
              <div :key="step" class="step-panel" role="group" aria-labelledby="reg-step-title">
                <div class="step-intro">
                  <h3 id="reg-step-title" ref="stepTitle" tabindex="-1">{{ currentStep.heading }}</h3>
                  <p>{{ currentStep.description }}</p>
                </div>

                <!-- STEP 1: PERSONAL INFORMATION -->
                <div v-if="step === 0" class="field-grid">
                  <AuthField id="reg-first-name" label="First name" icon="user" :error="errors.firstName">
                    <template #default="{ attrs }">
                      <input v-bind="attrs" v-model.trim="form.firstName" type="text" placeholder="Juan" autocomplete="given-name" />
                    </template>
                  </AuthField>

                  <AuthField id="reg-last-name" label="Last name" icon="user" :error="errors.lastName">
                    <template #default="{ attrs }">
                      <input v-bind="attrs" v-model.trim="form.lastName" type="text" placeholder="Dela Cruz" autocomplete="family-name" />
                    </template>
                  </AuthField>

                  <AuthField id="reg-middle-name" label="Middle name" icon="user" optional>
                    <template #default="{ attrs }">
                      <input v-bind="attrs" v-model.trim="form.middleName" type="text" placeholder="Santos" autocomplete="additional-name" />
                    </template>
                  </AuthField>

                  <AuthField id="reg-student-id" label="Student ID" icon="id-card" :error="errors.studentId">
                    <template #default="{ attrs }">
                      <input v-bind="attrs" v-model.trim="form.studentId" type="text" placeholder="e.g. 2024-00123" autocomplete="off" spellcheck="false" />
                    </template>
                  </AuthField>

                  <AuthField id="reg-email" label="School email" icon="mail" :error="errors.email" class="span-2">
                    <template #default="{ attrs }">
                      <input
                        v-bind="attrs"
                        v-model.trim="form.email"
                        type="email"
                        inputmode="email"
                        placeholder="name@school.edu.ph"
                        autocomplete="email"
                        autocapitalize="none"
                        spellcheck="false"
                      />
                    </template>
                  </AuthField>
                </div>

                <!-- STEP 2: ACADEMIC INFORMATION -->
                <div v-else-if="step === 1" class="field-grid">
                  <AuthField id="reg-course" label="Course" icon="layers" :error="errors.course" class="span-2">
                    <template #default="{ attrs }">
                      <select v-bind="attrs" v-model="form.course" :class="{ 'is-placeholder': !form.course }">
                        <option value="" disabled>Select your course</option>
                        <option v-for="course in COURSES" :key="course.value" :value="course.value">
                          {{ course.label }}
                        </option>
                      </select>
                    </template>
                    <template #suffix>
                      <AppIcon name="chevron-down" :size="16" class="auth-select-chevron" />
                    </template>
                  </AuthField>

                  <fieldset
                    class="auth-field span-2"
                    :class="{ 'has-error': !!errors.yearLevel }"
                    :aria-describedby="errors.yearLevel ? 'reg-year-message' : undefined"
                  >
                    <legend class="auth-label year-legend">Year level</legend>
                    <div class="year-pills">
                      <label
                        v-for="year in YEAR_LEVELS"
                        :key="year.value"
                        class="year-pill"
                        :class="{ 'is-selected': form.yearLevel === year.value }"
                      >
                        <input
                          :id="`reg-year-${year.value}`"
                          v-model="form.yearLevel"
                          type="radio"
                          name="year-level"
                          :value="year.value"
                        />
                        <span>{{ year.label }}</span>
                      </label>
                    </div>
                    <Transition name="auth-msg">
                      <p v-if="errors.yearLevel" id="reg-year-message" class="auth-field-msg is-error">
                        <AppIcon name="alert-circle" :size="14" />
                        <span>{{ errors.yearLevel }}</span>
                      </p>
                    </Transition>
                  </fieldset>

                  <AuthField id="reg-section" label="Section" icon="users" :error="errors.section" class="span-2">
                    <template #default="{ attrs }">
                      <input v-bind="attrs" v-model.trim="form.section" type="text" placeholder="e.g. BIT-2B" autocomplete="off" />
                    </template>
                  </AuthField>
                </div>

                <!-- STEP 3: ACCOUNT SECURITY -->
                <div v-else class="field-stack">
                  <AuthField
                    id="reg-password"
                    label="Password"
                    icon="lock"
                    :error="errors.password"
                    hint="At least 8 characters. Mix in numbers and symbols to make it stronger."
                  >
                    <template #default="{ attrs }">
                      <input
                        v-bind="attrs"
                        v-model="form.password"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Create a password"
                        autocomplete="new-password"
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
                    <template #below>
                      <Transition name="auth-msg">
                        <div v-if="form.password" class="strength" :data-level="strength.level">
                          <div class="strength-bars" aria-hidden="true">
                            <span v-for="n in 4" :key="n" :class="{ 'is-on': n <= strength.level }" />
                          </div>
                          <span class="strength-label">{{ strength.label }}</span>
                        </div>
                      </Transition>
                    </template>
                  </AuthField>

                  <AuthField
                    id="reg-confirm-password"
                    label="Confirm password"
                    icon="lock"
                    :error="errors.confirmPassword"
                    :hint="passwordsMatch ? 'Passwords match' : ''"
                    hint-tone="success"
                    hint-icon="check-circle"
                  >
                    <template #default="{ attrs }">
                      <input
                        v-bind="attrs"
                        v-model="form.confirmPassword"
                        :type="showConfirmPassword ? 'text' : 'password'"
                        placeholder="Type it once more"
                        autocomplete="new-password"
                      />
                    </template>
                    <template #suffix>
                      <button
                        type="button"
                        class="auth-reveal"
                        :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
                        @click="showConfirmPassword = !showConfirmPassword"
                      >
                        <Transition name="icon-swap" mode="out-in">
                          <AppIcon :key="String(showConfirmPassword)" :name="showConfirmPassword ? 'eye-off' : 'eye'" :size="18" />
                        </Transition>
                      </button>
                    </template>
                  </AuthField>

                  <div class="terms">
                    <label class="auth-check" :class="{ 'has-error': !!errors.agree }">
                      <input
                        id="reg-agree"
                        v-model="form.agree"
                        type="checkbox"
                        :aria-invalid="errors.agree ? 'true' : undefined"
                        :aria-describedby="errors.agree ? 'reg-agree-message' : undefined"
                      />
                      <span class="auth-check-box" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path pathLength="24" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      </span>
                      <span>I confirm that the information I provided is accurate and correct.</span>
                    </label>
                    <Transition name="auth-msg">
                      <p v-if="errors.agree" id="reg-agree-message" class="auth-field-msg is-error">
                        <AppIcon name="alert-circle" :size="14" />
                        <span>{{ errors.agree }}</span>
                      </p>
                    </Transition>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <Transition name="auth-alert">
            <div v-if="message" class="auth-alert is-error register-alert" role="alert">
              <AppIcon name="alert-circle" :size="17" />
              <span>{{ message }}</span>
            </div>
          </Transition>

          <div class="wizard-actions">
            <Transition name="back-slide">
              <button
                v-if="step > 0"
                type="button"
                class="auth-btn auth-btn-ghost wizard-back"
                :disabled="isSubmitting"
                @click="goTo(step - 1)"
              >
                <AppIcon name="arrow-left" :size="17" />
                Back
              </button>
            </Transition>

            <button type="submit" class="auth-btn auth-btn-primary wizard-next" :disabled="isSubmitting">
              <Transition name="btn-swap" mode="out-in">
                <span v-if="isSubmitting" key="loading" class="auth-btn-content">
                  <span class="auth-spinner" aria-hidden="true" />
                  Creating account…
                </span>
                <span v-else-if="isLastStep" key="create" class="auth-btn-content">
                  Create account
                  <AppIcon name="check" :size="18" :stroke-width="2.4" />
                </span>
                <span v-else key="next" class="auth-btn-content">
                  Continue
                  <AppIcon name="arrow-right" :size="18" class="auth-btn-arrow" />
                </span>
              </Transition>
            </button>
          </div>
        </form>

        <p class="auth-alt auth-rise" style="--i: 5">
          Already have an account?
          <router-link to="/login" class="auth-link">Sign in</router-link>
        </p>
      </div>

      <!-- SUCCESS -->
      <div v-else key="done" class="register-success" role="status">
        <div class="success-badge" aria-hidden="true">
          <svg viewBox="0 0 52 52" class="success-check">
            <circle cx="26" cy="26" r="24" pathLength="100" />
            <path d="M15 27l7 7 15-15" pathLength="100" />
          </svg>
          <span
            v-for="n in 8"
            :key="n"
            class="success-spark"
            :style="{ '--a': `${n * 45}deg`, '--c': SPARK_COLORS[n % SPARK_COLORS.length] }"
          />
        </div>

        <span class="auth-kicker auth-rise" style="--i: 2">Registration received</span>
        <h2 class="auth-rise" style="--i: 3">You're all set, {{ form.firstName }}!</h2>
        <p class="success-message auth-rise" style="--i: 4">{{ successMessage }}</p>

        <ol class="next-steps">
          <li class="is-done auth-rise" style="--i: 5">
            <span class="next-icon"><AppIcon name="check" :size="15" :stroke-width="2.6" /></span>
            <div>
              <strong>Account created</strong>
              <small>{{ form.email }}</small>
            </div>
          </li>
          <li class="is-current auth-rise" style="--i: 6">
            <span class="next-icon"><AppIcon name="hourglass" :size="15" /></span>
            <div>
              <strong>Admin review</strong>
              <small>An administrator checks your details.</small>
            </div>
          </li>
          <li class="auth-rise" style="--i: 7">
            <span class="next-icon"><AppIcon name="log-in" :size="15" /></span>
            <div>
              <strong>Sign in</strong>
              <small>Use your school email and password once approved.</small>
            </div>
          </li>
        </ol>

        <div class="auth-rise" style="--i: 8">
          <router-link to="/login" class="auth-btn auth-btn-primary auth-btn-block">
            Go to sign in
            <AppIcon name="arrow-right" :size="18" class="auth-btn-arrow" />
          </router-link>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AuthField from '@/components/AuthField.vue'
import { hasFinePointer, shake } from '@/utils/motion'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STEPS = [
  {
    title: 'Personal',
    icon: 'user',
    heading: 'Tell us about you',
    description: 'Use your name and student ID exactly as they appear in school records.',
    fields: ['firstName', 'lastName', 'studentId', 'email']
  },
  {
    title: 'Academic',
    icon: 'graduation-cap',
    heading: 'Your program',
    description: 'This places you in the right course and section.',
    fields: ['course', 'yearLevel', 'section']
  },
  {
    title: 'Security',
    icon: 'lock',
    heading: 'Secure your account',
    description: 'Pick a password you don’t use anywhere else.',
    fields: ['password', 'confirmPassword', 'agree']
  }
]

const COURSES = [
  { value: 'BIT', label: 'Bachelor of Industrial Technology (BIT)' },
  { value: 'BSIT', label: 'Bachelor of Science in Information Technology' },
  { value: 'BSHM', label: 'Bachelor of Science in Hospitality Management' },
  { value: 'BSED', label: 'Bachelor of Secondary Education' },
  { value: 'BEED', label: 'Bachelor of Elementary Education' }
]

const YEAR_LEVELS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' }
]

// Element to focus when a field fails validation.
const FIELD_IDS = {
  firstName: 'reg-first-name',
  lastName: 'reg-last-name',
  studentId: 'reg-student-id',
  email: 'reg-email',
  course: 'reg-course',
  yearLevel: 'reg-year-1',
  section: 'reg-section',
  password: 'reg-password',
  confirmPassword: 'reg-confirm-password',
  agree: 'reg-agree'
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const SPARK_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']

const form = reactive({
  firstName: '',
  lastName: '',
  middleName: '',
  studentId: '',
  email: '',
  course: '',
  yearLevel: '',
  section: '',
  password: '',
  confirmPassword: '',
  agree: false
})

// Each returns an error message, or '' when the value is fine.
const VALIDATORS = {
  firstName: () => (form.firstName ? '' : 'Enter your first name.'),
  lastName: () => (form.lastName ? '' : 'Enter your last name.'),
  studentId: () => (form.studentId ? '' : 'Enter your student ID.'),
  email: () => {
    if (!form.email) return 'Enter your school email.'
    return EMAIL_PATTERN.test(form.email) ? '' : 'That doesn’t look like a valid email address.'
  },
  course: () => (form.course ? '' : 'Select your course.'),
  yearLevel: () => (form.yearLevel ? '' : 'Choose your year level.'),
  section: () => (form.section ? '' : 'Enter your section.'),
  password: () => {
    if (!form.password) return 'Create a password.'
    return form.password.length >= 8 ? '' : 'Password must contain at least 8 characters.'
  },
  confirmPassword: () => {
    if (!form.confirmPassword) return 'Confirm your password.'
    return form.confirmPassword === form.password ? '' : 'Passwords do not match.'
  },
  agree: () => (form.agree ? '' : 'Please confirm your information before registering.')
}

const errors = reactive(Object.fromEntries(Object.keys(VALIDATORS).map(key => [key, ''])))

const step = ref(0)
const stepDirection = ref('next')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const message = ref('')
const done = ref(false)
const successMessage = ref('')

const formEl = ref(null)
const stepTitle = ref(null)

const currentStep = computed(() => STEPS[step.value])
const isLastStep = computed(() => step.value === STEPS.length - 1)

const strength = computed(() => {
  const value = form.password
  if (value.length < 8) return { level: 1, label: 'Too short' }

  const extras = [
    value.length >= 12,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value)
  ].filter(Boolean).length

  const level = 1 + Math.min(3, extras)
  return { level, label: STRENGTH_LABELS[level] }
})

const passwordsMatch = computed(() =>
  form.confirmPassword.length > 0 && form.confirmPassword === form.password
)

// Once a field shows an error, re-check it as the student types so the
// message disappears the moment it's fixed.
for (const field of Object.keys(VALIDATORS)) {
  watch(() => form[field], () => {
    if (errors[field]) errors[field] = VALIDATORS[field]()
  })
}

watch(() => form.password, () => {
  if (errors.confirmPassword && form.confirmPassword) {
    errors.confirmPassword = VALIDATORS.confirmPassword()
  }
})

onMounted(() => {
  if (hasFinePointer()) document.getElementById(FIELD_IDS.firstName)?.focus({ preventScroll: true })
})

// Returns the first invalid field in the list, or null.
function validateFields(fields) {
  let firstInvalid = null
  for (const field of fields) {
    errors[field] = VALIDATORS[field]()
    if (errors[field] && !firstInvalid) firstInvalid = field
  }
  return firstInvalid
}

function rejectField(field) {
  shake(formEl.value)
  document.getElementById(FIELD_IDS[field])?.focus()
}

function goTo(index) {
  if (index === step.value || index < 0 || index >= STEPS.length) return
  stepDirection.value = index > step.value ? 'next' : 'prev'
  message.value = ''
  step.value = index
}

function next() {
  const invalid = validateFields(currentStep.value.fields)
  if (invalid) {
    rejectField(invalid)
    return
  }
  goTo(step.value + 1)
}

function onSubmit() {
  if (isLastStep.value) register()
  else next()
}

// After a step slides in, move focus there: the first field with a mouse,
// otherwise the step heading so screen readers announce the new step.
function focusStep() {
  if (hasFinePointer()) {
    const panel = formEl.value?.querySelector('.step-panel')
    const field = panel?.querySelector('input:not([type="radio"]):not([type="checkbox"]), select')
    if (field) {
      field.focus({ preventScroll: true })
      return
    }
  }
  stepTitle.value?.focus({ preventScroll: true })
}

async function register() {
  if (isSubmitting.value) return

  message.value = ''

  // Every step is checked on the way forward; re-check them all anyway.
  for (let i = 0; i < STEPS.length; i++) {
    const invalid = validateFields(STEPS[i].fields)
    if (!invalid) continue
    if (i === step.value) rejectField(invalid)
    else goTo(i)
    return
  }

  isSubmitting.value = true

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        student_id: form.studentId,
        first_name: form.firstName,
        middle_name: form.middleName,
        last_name: form.lastName,
        email: form.email,
        password: form.password,
        course: form.course,
        year_level: form.yearLevel,
        section: form.section
      })
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(data.message || 'Registration failed.')
      error.status = response.status
      throw error
    }

    successMessage.value = data.message || 'Registration successful! Your account is waiting for admin approval.'

    // Don't keep the password in memory once the account exists.
    form.password = ''
    form.confirmPassword = ''
    done.value = true

  } catch (error) {
    const text = error instanceof TypeError
      ? 'Cannot connect to the server. Please make sure your backend is running.'
      : error.message

    if (error.status === 409) {
      // Student ID or email already taken: send them back to fix it.
      goTo(0)
      errors.studentId = 'This student ID may already be registered.'
      errors.email = 'This email may already be registered.'
    } else {
      shake(formEl.value)
    }

    await nextTick()
    message.value = text
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.register-view { max-width: 540px; }

/* ---------- Stepper ---------- */

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 26px;
  padding: 0;
  list-style: none;
}

.stepper-item { flex: 0 0 auto; }

.stepper-line {
  position: relative;
  flex: 1;
  min-width: 14px;
  height: 2px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--border);
}

.stepper-line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #10b981, #2563eb);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}

.stepper-line.is-filled::after { transform: scaleX(1); }

.stepper-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  text-align: left;
  cursor: pointer;
}

.stepper-btn:disabled { cursor: default; }

.stepper-dot {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--border-strong);
  border-radius: 50%;
  background: #fff;
  color: var(--text-4);
  transition: background-color 0.35s ease, border-color 0.35s ease, color 0.35s ease, transform 0.25s ease, box-shadow 0.35s ease;
}

.is-active .stepper-dot {
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  box-shadow: 0 8px 18px -8px rgba(37, 99, 235, 0.85);
  animation: dot-pulse 2.4s ease-out infinite;
}

@keyframes dot-pulse {
  0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.35), 0 8px 18px -8px rgba(37, 99, 235, 0.85); }
  70%, 100% { box-shadow: 0 0 0 9px rgba(37, 99, 235, 0), 0 8px 18px -8px rgba(37, 99, 235, 0.85); }
}

.is-complete .stepper-dot {
  border-color: transparent;
  background: var(--success-soft);
  color: var(--success);
}

.is-complete .stepper-btn:hover .stepper-dot { transform: scale(1.08); }

.stepper-text small {
  display: block;
  color: var(--text-4);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.stepper-text strong {
  display: block;
  color: var(--text-3);
  font-size: 13.5px;
  font-weight: 600;
  transition: color 0.3s ease;
}

.is-active .stepper-text strong,
.is-complete .stepper-text strong { color: var(--text); }

/* ---------- Step panels ---------- */

/* Clip the sideways slide without cutting off focus rings. */
.step-viewport {
  margin: -8px;
  padding: 8px;
  overflow: hidden;
}

.step-intro { margin-bottom: 18px; }

.step-intro h3 {
  margin: 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  outline: none;
}

.step-intro p {
  margin: 3px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 14px;
}

.span-2 { grid-column: 1 / -1; }

.field-stack {
  display: grid;
  gap: 18px;
}

.step-next-enter-active,
.step-prev-enter-active {
  transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.step-next-leave-active,
.step-prev-leave-active {
  transition: opacity 0.18s ease-in, transform 0.18s ease-in;
}

.step-next-enter-from,
.step-prev-leave-to { opacity: 0; transform: translateX(44px); }

.step-next-leave-to,
.step-prev-enter-from { opacity: 0; transform: translateX(-44px); }

/* Year level pills */

.year-legend {
  float: left;
  width: 100%;
  margin-bottom: 8px;
  padding: 0;
}

.year-pills {
  clear: both;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.year-pill {
  position: relative;
  height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text-2);
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.25s ease;
}

.year-pill input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.year-pill:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.year-pill:has(input:focus-visible) {
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
}

.year-pill.is-selected {
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  box-shadow: 0 10px 20px -10px rgba(37, 99, 235, 0.85);
  animation: pill-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.auth-field.has-error .year-pill:not(.is-selected) { border-color: #f1a7a1; }

@keyframes pill-pop { 50% { transform: scale(1.06); } }

/* Password strength */

.strength {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.strength-bars {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}

.strength-bars span {
  height: 5px;
  border-radius: 3px;
  background: var(--border);
  transition: background-color 0.3s ease;
}

.strength-label {
  min-width: 64px;
  font-size: 12px;
  font-weight: 650;
  text-align: right;
  transition: color 0.3s ease;
}

.strength[data-level='1'] .is-on { background: #ef4444; }
.strength[data-level='2'] .is-on { background: #f59e0b; }
.strength[data-level='3'] .is-on { background: #22c55e; }
.strength[data-level='4'] .is-on { background: #059669; }

.strength[data-level='1'] .strength-label { color: #dc2626; }
.strength[data-level='2'] .strength-label { color: #b45309; }
.strength[data-level='3'] .strength-label { color: #16a34a; }
.strength[data-level='4'] .strength-label { color: #047857; }

.terms { padding-top: 2px; }

/* ---------- Actions ---------- */

.register-alert { margin-top: 20px; }

.wizard-actions {
  display: flex;
  margin-top: 24px;
}

.wizard-back {
  max-width: 140px;
  margin-right: 12px;
}

.wizard-next { flex: 1; }

/* Back button grows in from zero width so Continue resizes smoothly. */
.back-slide-enter-active,
.back-slide-leave-active {
  transition:
    max-width 0.4s cubic-bezier(0.65, 0, 0.35, 1),
    margin-right 0.4s cubic-bezier(0.65, 0, 0.35, 1),
    padding 0.4s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.3s ease;
}

.back-slide-enter-from,
.back-slide-leave-to {
  max-width: 0;
  margin-right: 0;
  padding-left: 0;
  padding-right: 0;
  opacity: 0;
}

/* ---------- Success ---------- */

.register-swap-enter-active { transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.register-swap-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.register-swap-enter-from { opacity: 0; transform: scale(0.96); }
.register-swap-leave-to { opacity: 0; transform: scale(1.02); }

.register-success { text-align: center; }

.success-badge {
  position: relative;
  width: 84px;
  height: 84px;
  margin: 0 auto 22px;
}

.success-check {
  width: 100%;
  height: 100%;
}

.success-check circle {
  fill: #ecfdf5;
  stroke: #10b981;
  stroke-width: 2.5;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: draw 0.7s cubic-bezier(0.65, 0, 0.35, 1) 0.1s forwards;
}

.success-check path {
  fill: none;
  stroke: #059669;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: draw 0.45s cubic-bezier(0.65, 0, 0.35, 1) 0.65s forwards;
}

@keyframes draw { to { stroke-dashoffset: 0; } }

.success-spark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px;
  border-radius: 50%;
  background: var(--c);
  opacity: 0;
  animation: spark 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.9s;
}

@keyframes spark {
  0% { opacity: 1; transform: rotate(var(--a)) translateY(-34px) scale(1); }
  100% { opacity: 0; transform: rotate(var(--a)) translateY(-66px) scale(0.3); }
}

.register-success h2 {
  margin: 10px 0 0;
  color: var(--text);
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.success-message {
  max-width: 400px;
  margin: 8px auto 0;
  color: var(--text-3);
  font-size: 14.5px;
  line-height: 1.6;
}

.next-steps {
  display: grid;
  gap: 2px;
  margin: 26px 0;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  list-style: none;
  text-align: left;
  box-shadow: var(--shadow-xs);
}

.next-steps li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 11px;
}

.next-steps li.is-current { background: var(--primary-soft); }

.next-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-4);
}

.is-done .next-icon { background: var(--success-soft); color: var(--success); }
.is-current .next-icon { background: #fff; color: var(--primary); }

.next-steps strong {
  display: block;
  color: var(--text);
  font-size: 13.5px;
  font-weight: 650;
}

.next-steps small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
  overflow-wrap: anywhere;
}

/* ---------- Responsive ---------- */

@media (max-width: 520px) {
  .stepper { gap: 8px; }
  .stepper-item:not(.is-active) .stepper-text { display: none; }

  .field-grid { grid-template-columns: minmax(0, 1fr); }
  .span-2 { grid-column: auto; }

  .year-pills { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
