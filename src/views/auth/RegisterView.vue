
<template>
  <div class="register-page">

    <!-- LEFT BRANDING PANEL -->
    <aside class="brand-panel">
      <div class="brand-content">
        <div class="brand-logo"><AppIcon name="graduation-cap" :size="26" /></div>

        <div class="brand-title">
          <span>STUDENT SERVICE PORTAL</span>
          <h1>Return of<br />Service System</h1>
          <p>
            Manage your service hours, monitor your progress,
            and stay updated with your school service activities.
          </p>
        </div>

        <div class="brand-features">
          <div class="feature">
            <span class="feature-icon"><AppIcon name="clock" :size="17" /></span>
            <div>
              <strong>Track your service hours</strong>
              <small>Monitor your progress toward 340 hours.</small>
            </div>
          </div>

          <div class="feature">
            <span class="feature-icon"><AppIcon name="file-text" :size="17" /></span>
            <div>
              <strong>Manage your records</strong>
              <small>Keep your service documents organized.</small>
            </div>
          </div>

          <div class="feature">
            <span class="feature-icon"><AppIcon name="bell" :size="17" /></span>
            <div>
              <strong>Stay informed</strong>
              <small>Receive important program announcements.</small>
            </div>
          </div>
        </div>
      </div>

      <div class="brand-footer">
        Return of Service System · Student Portal
      </div>
    </aside>

    <!-- RIGHT REGISTRATION AREA -->
    <main class="form-panel">
      <div class="register-container">

        <div class="mobile-logo">
          <div class="brand-logo"><AppIcon name="graduation-cap" :size="26" /></div>
          <span>RETURN OF SERVICE SYSTEM</span>
        </div>

        <div class="form-heading">
          <span class="eyebrow">STUDENT REGISTRATION</span>
          <h2>Create your account</h2>
          <p>Enter your information to get started with the RSS portal.</p>
        </div>

        <form @submit.prevent="register">

          <!-- PERSONAL INFORMATION -->
          <section class="form-section">
            <div class="section-heading">
              <div class="section-number">01</div>
              <div>
                <h3>Personal Information</h3>
                <p>Provide your basic student information.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>First Name <span>*</span></label>
                <input
                  v-model.trim="form.firstName"
                  type="text"
                  placeholder="Enter first name"
                  autocomplete="given-name"
                  required
                />
              </div>

              <div class="form-group">
                <label>Last Name <span>*</span></label>
                <input
                  v-model.trim="form.lastName"
                  type="text"
                  placeholder="Enter last name"
                  autocomplete="family-name"
                  required
                />
              </div>

              <div class="form-group full-width">
                <label>Middle Name <small>(Optional)</small></label>
                <input
                  v-model.trim="form.middleName"
                  type="text"
                  placeholder="Enter middle name"
                />
              </div>

              <div class="form-group">
                <label>Student ID <span>*</span></label>
                <input
                  v-model.trim="form.studentId"
                  type="text"
                  placeholder="Enter student ID"
                  required
                />
              </div>

              <div class="form-group">
                <label>School Email <span>*</span></label>
                <input
                  v-model.trim="form.email"
                  type="email"
                  placeholder="name@school.edu.ph"
                  autocomplete="email"
                  required
                />
              </div>
            </div>
          </section>

          <!-- ACADEMIC INFORMATION -->
          <section class="form-section">
            <div class="section-heading">
              <div class="section-number">02</div>
              <div>
                <h3>Academic Information</h3>
                <p>Enter your current academic details.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group full-width">
                <label>Course <span>*</span></label>
                <select v-model="form.course" required>
                  <option value="" disabled>Select your course</option>
                  <option value="BIT">
                    Bachelor of Industrial Technology (BIT)
                  </option>
                  <option value="BSIT">
                    Bachelor of Science in Information Technology
                  </option>
                  <option value="BSHM">
                    Bachelor of Science in Hospitality Management
                  </option>
                  <option value="BSED">
                    Bachelor of Secondary Education
                  </option>
                  <option value="BEED">
                    Bachelor of Elementary Education
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Year Level <span>*</span></label>
                <select v-model="form.yearLevel" required>
                  <option value="" disabled>Select year level</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div class="form-group">
                <label>Section <span>*</span></label>
                <input
                  v-model.trim="form.section"
                  type="text"
                  placeholder="e.g. BIT-2B"
                  required
                />
              </div>
            </div>
          </section>

          <!-- ACCOUNT SECURITY -->
          <section class="form-section security-section">
            <div class="section-heading">
              <div class="section-number">03</div>
              <div>
                <h3>Account Security</h3>
                <p>Create a secure password for your account.</p>
              </div>
            </div>

            <div class="form-group">
              <label>Password <span>*</span></label>
              <div class="password-wrapper">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Create a password"
                  autocomplete="new-password"
                  minlength="8"
                  required
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <small class="input-hint">Use at least 8 characters.</small>
            </div>

            <div class="form-group">
              <label>Confirm Password <span>*</span></label>
              <div class="password-wrapper">
                <input
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Confirm your password"
                  autocomplete="new-password"
                  minlength="8"
                  required
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  {{ showConfirmPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>
          </section>

          <!-- TERMS -->
          <label class="terms">
            <input type="checkbox" v-model="form.agree" required />
            <span>
              I confirm that the information I provided is accurate
              and correct.
            </span>
          </label>

          <!-- MESSAGE -->
          <div v-if="message" :class="['message', messageType]">
            {{ message }}
          </div>

          <!-- SUBMIT -->
          <button
            type="submit"
            class="register-button"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Creating Account...' : 'Create Account' }}
            <AppIcon v-if="!isSubmitting" name="arrow-right" :size="18" />
          </button>

        </form>

        <div class="login-link">
          Already have an account?
          <router-link to="/login">Sign in instead</router-link>
        </div>

        <div class="form-footer">
          © 2026 Return of Service System. All rights reserved.
        </div>

      </div>
    </main>
  </div>
</template>


<script setup>
import { reactive, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '')

const message = ref('')
const messageType = ref('success')

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)

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

async function register() {
  message.value = ''

  if (form.password.length < 8) {
    message.value = 'Password must contain at least 8 characters.'
    messageType.value = 'error'
    return
  }

  if (form.password !== form.confirmPassword) {
    message.value = 'Passwords do not match. Please try again.'
    messageType.value = 'error'
    return
  }

  if (!form.agree) {
    message.value = 'Please confirm your information before registering.'
    messageType.value = 'error'
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

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed.')
    }

    messageType.value = 'success'
    message.value = data.message

    // Clear password fields after successful registration
    form.password = ''
    form.confirmPassword = ''
    form.agree = false

  } catch (error) {
    messageType.value = 'error'

    if (error instanceof TypeError) {
      message.value = 'Cannot connect to the server. Please make sure your backend is running.'
    } else {
      message.value = error.message
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.register-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 40% 60%;
  background: #f7f9fc;
  color: #19283d;
  font-family: Inter, Arial, sans-serif;
}

/* BRANDING PANEL */
.brand-panel {
  min-height: 100vh;
  padding: 55px 55px 30px;
  background:
    radial-gradient(circle at 10% 90%, rgba(55, 115, 204, .22), transparent 35%),
    linear-gradient(145deg, #12243d, #1c3c68);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
}

.brand-content {
  max-width: 470px;
  margin: auto;
}

.brand-logo {
  width: 55px;
  height: 55px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: grid;
  place-items: center;
  color: white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
}

.brand-title {
  margin-top: 75px;
}

.brand-title > span,
.eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  font-weight: 700;
  color: #83b4ff;
}

.brand-title h1 {
  font-size: clamp(32px, 3.2vw, 46px);
  line-height: 1.15;
  margin: 20px 0;
  letter-spacing: -1.5px;
}

.brand-title p {
  color: #b9c9df;
  font-size: 13px;
  line-height: 1.9;
  max-width: 380px;
}

.brand-features {
  display: grid;
  gap: 24px;
  margin-top: 60px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 15px;
}

.feature-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .13);
  border-radius: 10px;
  color: #8bbaff;
  font-weight: 700;
}

.feature strong {
  display: block;
  font-size: 12px;
  margin-bottom: 5px;
}

.feature small {
  color: #aebed4;
  font-size: 10px;
}

.brand-footer {
  color: #8398b4;
  font-size: 10px;
  margin-top: 40px;
}

/* FORM PANEL */
.form-panel {
  padding: 45px 55px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.register-container {
  width: 100%;
  max-width: 680px;
}

.mobile-logo {
  display: none;
}

.form-heading {
  margin-bottom: 35px;
}

.form-heading h2 {
  font-size: 30px;
  letter-spacing: -1px;
  margin: 12px 0 9px;
  color: #182a43;
}

.form-heading p {
  color: #8591a2;
  font-size: 12px;
  line-height: 1.7;
}

/* FORM SECTIONS */
.form-section {
  margin-bottom: 30px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e8edf4;
}

.section-number {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #eaf1ff;
  color: #3479e8;
  font-size: 11px;
  font-weight: 800;
}

.section-heading h3 {
  margin: 0 0 5px;
  font-size: 14px;
  color: #24354b;
}

.section-heading p {
  margin: 0;
  font-size: 10px;
  color: #929dad;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 19px 16px;
}

.form-group {
  min-width: 0;
  margin-bottom: 18px;
}

.form-grid .form-group {
  margin-bottom: 0;
}

.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  display: block;
  color: #435168;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 9px;
}

.form-group label span {
  color: #e05252;
}

.form-group label small {
  color: #98a2b1;
  font-weight: 400;
}

.form-group input,
.form-group select {
  width: 100%;
  height: 45px;
  padding: 0 13px;
  border: 1px solid #e1e7ef;
  border-radius: 8px;
  background: white;
  color: #25364c;
  outline: none;
  font-size: 11px;
  transition: .2s;
}

.form-group input::placeholder {
  color: #aab3c0;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #4384e9;
  box-shadow: 0 0 0 3px rgba(52, 121, 232, .09);
}

.form-group select {
  cursor: pointer;
}

/* PASSWORD */
.password-wrapper {
  position: relative;
}

.password-wrapper input {
  padding-right: 65px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #3479e8;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.input-hint {
  display: block;
  margin-top: 7px;
  color: #929dad;
  font-size: 10px;
}

/* TERMS */
.terms {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  color: #69768a;
  font-size: 11px;
  line-height: 1.6;
  margin: 8px 0 22px;
  cursor: pointer;
}

.terms input {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  margin: 1px 0 0;
  accent-color: #3479e8;
  cursor: pointer;
}

/* BUTTON */
.register-button {
  width: 100%;
  height: 49px;
  padding: 0 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  border: none;
  border-radius: 9px;
  background: #3479e8;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: .2s;
  box-shadow: 0 5px 14px rgba(52, 121, 232, .18);
}

.register-button:hover:not(:disabled) {
  background: #2468d1;
  transform: translateY(-1px);
}

.register-button:disabled {
  opacity: .65;
  cursor: not-allowed;
}

/* FEEDBACK */
.message {
  padding: 12px 14px;
  border-radius: 8px;
  margin-bottom: 15px;
  font-size: 11px;
  line-height: 1.5;
}

.message.success {
  background: #e8f7ee;
  color: #18834d;
}

.message.error {
  background: #fff0f0;
  color: #c33d3d;
}

/* FOOTER */
.login-link {
  text-align: center;
  margin-top: 25px;
  color: #8994a4;
  font-size: 11px;
}

.login-link a {
  color: #3479e8;
  font-weight: 700;
  text-decoration: none;
  margin-left: 4px;
}

.login-link a:hover {
  text-decoration: underline;
}

.form-footer {
  text-align: center;
  color: #a1aab7;
  font-size: 9px;
  margin-top: 35px;
}

/* RESPONSIVE */
@media (max-width: 1050px) {
  .register-page {
    grid-template-columns: 35% 65%;
  }

  .brand-panel {
    padding: 40px 28px;
  }

  .form-panel {
    padding: 40px 30px;
  }
}

@media (max-width: 750px) {
  .register-page {
    display: block;
  }

  .brand-panel {
    display: none;
  }

  .form-panel {
    padding: 28px 20px;
  }

  .mobile-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 35px;
    color: #263a54;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .mobile-logo .brand-logo {
    width: 42px;
    height: 42px;
    font-size: 13px;
    border-radius: 11px;
  }

  .form-heading h2 {
    font-size: 26px;
  }
}

@media (max-width: 480px) {
  .form-panel {
    padding: 22px 17px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .full-width {
    grid-column: auto;
  }

  .form-heading {
    margin-bottom: 27px;
  }
}
</style>
