
<template>
  <div class="login-page">

    <!-- LEFT BRANDING PANEL -->
    <section class="branding-panel">
      <div class="brand-content">

        <div class="brand-logo">
          <div class="logo-symbol"><AppIcon name="graduation-cap" :size="24" /></div>
          <div>
            <h2>RETURN OF SERVICE</h2>
            <span>MANAGEMENT SYSTEM</span>
          </div>
        </div>

        <div class="hero-content">
          <span class="eyebrow">STUDENT SERVICE PORTAL</span>

          <h1>
            Your service.<br />
            Your progress.<br />
            <span>Your future.</span>
          </h1>

          <p>
            Manage your service hours, monitor your progress,
            and keep track of your responsibilities through
            one convenient platform.
          </p>

          <div class="feature-list">
            <div class="feature">
              <span class="feature-icon"><AppIcon name="check" :size="13" :stroke-width="2.6" /></span>
              <span>Track your service hours</span>
            </div>

            <div class="feature">
              <span class="feature-icon"><AppIcon name="check" :size="13" :stroke-width="2.6" /></span>
              <span>Monitor your attendance</span>
            </div>

            <div class="feature">
              <span class="feature-icon"><AppIcon name="check" :size="13" :stroke-width="2.6" /></span>
              <span>Manage your requirements</span>
            </div>
          </div>
        </div>

        <div class="brand-footer">
          <span>© 2026 Return of Service System</span>
          <span>Student Portal</span>
        </div>

      </div>

      <div class="decoration-circle circle-one"></div>
      <div class="decoration-circle circle-two"></div>
    </section>

    <!-- RIGHT LOGIN PANEL -->
    <section class="login-panel">
      <div class="login-container">

        <div class="mobile-brand">
          <div class="logo-symbol"><AppIcon name="graduation-cap" :size="24" /></div>
          <span>RETURN OF SERVICE</span>
        </div>

        <div class="login-heading">
          <span class="welcome-label">WELCOME BACK</span>
          <h1>Sign in to your account</h1>
          <p>Enter your credentials to access your dashboard.</p>
        </div>

        <form @submit.prevent="login">

          <div class="form-group">
            <label for="email">Email Address</label>

            <div class="input-wrapper">
              <span class="input-icon"><AppIcon name="mail" :size="18" /></span>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="name@school.edu.ph"
                autocomplete="username"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <div class="password-label">
              <label for="password">Password</label>
              <router-link to="/forgot-password">
                Forgot password?
              </router-link>
            </div>

            <div class="input-wrapper">
              <span class="input-icon"><AppIcon name="lock" :size="18" /></span>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              />

              <button
                type="button"
                class="show-password"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <label class="remember-option">
            <input type="checkbox" v-model="rememberMe" />
            <span>Remember me</span>
          </label>

          <button
            type="submit"
            class="login-button"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Signing in…' : 'Sign In' }}
            <AppIcon v-if="!isSubmitting" name="arrow-right" :size="18" />
          </button>

          <div
            v-if="message"
            class="message"
            :class="messageType"
            :role="messageType === 'error' ? 'alert' : 'status'"
          >
            {{ message }}
          </div>

        </form>

        <div class="register-section">
          <span>Don't have an account?</span>
          <router-link to="/register">Create an account</router-link>
        </div>

        <div class="security-note">
          <AppIcon name="shield" :size="14" />
          <p>Your account information is protected.</p>
        </div>

      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()

// Backend API URL
const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '')

// Form values
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)

// Login state
const message = ref('')
const messageType = ref('error')
const isSubmitting = ref(false)

async function login() {
  message.value = ''

  if (!email.value.trim() || !password.value) {
    message.value = 'Please enter your email and password.'
    return
  }

  isSubmitting.value = true

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

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.')
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

    messageType.value = 'success'
    message.value = 'Login successful! Redirecting...'

    // Redirect based on account role
    if (data.user.role === 'admin') {
      await router.push('/admin/dashboard')
    } else {
      await router.push('/student/dashboard')
    }

  } catch (error) {
    messageType.value = 'error'

    if (error instanceof TypeError) {
      message.value = 'Cannot connect to the server. Make sure your backend is running.'
    } else {
      message.value = error.message
    }

  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #ffffff;
  color: #172033;
}

/* BRANDING PANEL */

.branding-panel {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 55px 65px;
  background: #101e38;
  color: #ffffff;
}

.brand-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 560px;
  margin: auto;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 13px;
}

.logo-symbol {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 8px 20px -8px rgba(37, 99, 235, 0.8);
}

.brand-logo h2 {
  font-size: 14px;
  letter-spacing: 1.5px;
}

.brand-logo span {
  display: block;
  margin-top: 5px;
  color: #8fa7cb;
  font-size: 9px;
  letter-spacing: 2px;
}

.hero-content {
  margin-top: 115px;
}

.eyebrow,
.welcome-label {
  color: #4c91ff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
}

.hero-content h1 {
  margin-top: 22px;
  font-size: clamp(40px, 4vw, 60px);
  line-height: 1.16;
  letter-spacing: -2px;
}

.hero-content h1 span {
  color: #4d91ff;
}

.hero-content > p {
  max-width: 440px;
  margin-top: 23px;
  color: #a6b5cb;
  font-size: 14px;
  line-height: 1.9;
}

.feature-list {
  display: grid;
  gap: 18px;
  margin-top: 38px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 13px;
  color: #dce7f7;
  font-size: 13px;
}

.feature-icon {
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #1e3d68;
  color: #65a3ff;
  font-size: 12px;
  font-weight: 800;
}

.brand-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 100px;
  color: #7f91aa;
  font-size: 10px;
}

.decoration-circle {
  position: absolute;
  border: 1px solid rgba(89, 145, 229, 0.12);
  border-radius: 50%;
}

.circle-one {
  width: 470px;
  height: 470px;
  top: -210px;
  right: -200px;
}

.circle-two {
  width: 650px;
  height: 650px;
  bottom: -400px;
  right: -250px;
}

/* LOGIN PANEL */

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px;
  background: #f8fafc;
}

.login-container {
  width: 100%;
  max-width: 410px;
}

.login-heading {
  margin-bottom: 38px;
}

.welcome-label {
  color: #3478f6;
}

.login-heading h1 {
  margin-top: 13px;
  color: #172033;
  font-size: 29px;
  letter-spacing: -0.8px;
}

.login-heading p {
  margin-top: 10px;
  color: #7b8798;
  font-size: 13px;
  line-height: 1.7;
}

/* INPUTS */

.form-group {
  margin-bottom: 24px;
}

.form-group label,
.password-label label {
  display: block;
  margin-bottom: 10px;
  color: #344054;
  font-size: 12px;
  font-weight: 700;
}

.input-wrapper {
  height: 51px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 15px;
  background: #ffffff;
  border: 1px solid #e0e6ef;
  border-radius: 9px;
  transition: 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: #3478f6;
  box-shadow: 0 0 0 3px rgba(52, 120, 246, 0.1);
}

.input-icon {
  display: grid;
  place-items: center;
  color: #8b99ad;
}

.input-wrapper:focus-within .input-icon {
  color: #2563eb;
}

.input-wrapper input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #172033;
  font-size: 13px;
}

.input-wrapper input::placeholder {
  color: #a5afbd;
}

.show-password {
  padding: 5px;
  border: none;
  background: transparent;
  color: #3478f6;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.password-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.password-label a {
  margin-bottom: 10px;
  color: #3478f6;
  font-size: 11px;
  font-weight: 600;
}

/* REMEMBER ME */

.remember-option {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 3px 0 26px;
  color: #657187;
  font-size: 12px;
  cursor: pointer;
}

.remember-option input {
  width: 15px;
  height: 15px;
  accent-color: #3478f6;
}

/* BUTTON */

.login-button {
  width: 100%;
  height: 51px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: none;
  border-radius: 9px;
  background: #3478f6;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  transition: 0.2s ease;
  cursor: pointer;
}

.login-button:hover {
  background: #2463d7;
  transform: translateY(-1px);
  box-shadow: 0 7px 18px rgba(52, 120, 246, 0.2);
}

.login-button span {
  font-size: 18px;
}

.login-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* MESSAGES */

.message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
  line-height: 1.5;
}

.message.success {
  background: #e8f8ef;
  color: #16834a;
}

.message.error {
  background: #fff0f0;
  color: #d32f2f;
}

/* REGISTER */

.register-section {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 30px;
  color: #7b8798;
  font-size: 12px;
}

.register-section a {
  color: #3478f6;
  font-weight: 700;
}

.security-note {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 65px;
  padding-top: 22px;
  border-top: 1px solid #e7ebf1;
}

.security-note {
  color: #98a2b3;
}

.security-note p {
  color: #98a2b3;
  font-size: 10px;
}

.mobile-brand {
  display: none;
}

/* RESPONSIVE */

@media (max-width: 900px) {
  .branding-panel {
    padding: 40px;
  }

  .login-panel {
    padding: 30px;
  }

  .hero-content h1 {
    font-size: 43px;
  }
}

@media (max-width: 650px) {
  .login-page {
    display: block;
  }

  .branding-panel {
    display: none;
  }

  .login-panel {
    min-height: 100vh;
    padding: 30px 22px;
  }

  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 65px;
    color: #172033;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .login-heading h1 {
    font-size: 25px;
  }

  .security-note {
    margin-top: 55px;
  }
}
</style>
