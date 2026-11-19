
<template>
  <div class="forgot-page">
    <div class="forgot-card">
      <div class="logo">RSS</div>

      <h1>Forgot Password?</h1>
      <p class="description">
        Enter your registered school email address. We'll help you recover your account.
      </p>

      <form @submit.prevent="resetPassword">
        <div class="form-group">
          <label>School Email Address</label>
          <input
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <button type="submit" class="submit-button">
          Request Password Reset
        </button>
      </form>

      <p v-if="message" class="message">{{ message }}</p>

      <router-link to="/login" class="back-link">
        ← Back to Login
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const message = ref('')

function resetPassword() {
  message.value = 'Password recovery will be connected to the backend later.'
}
</script>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #0f172a;
}

.forgot-card {
  width: 100%;
  max-width: 420px;
  padding: 38px;
  text-align: center;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
}

.logo {
  width: 65px;
  height: 65px;
  display: grid;
  place-items: center;
  margin: 0 auto 22px;
  background: #2563eb;
  border-radius: 14px;
  font-size: 20px;
  font-weight: 800;
}

h1 {
  font-size: 23px;
  margin-bottom: 12px;
}

.description {
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 28px;
}

.form-group {
  text-align: left;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 9px;
  font-size: 13px;
  font-weight: 600;
}

.submit-button {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-weight: 700;
}

.submit-button:hover {
  background: #1d4ed8;
}

.message {
  margin-top: 18px;
  color: #93c5fd;
  font-size: 13px;
}

.back-link {
  display: inline-block;
  margin-top: 25px;
  color: #60a5fa;
  font-size: 13px;
}
</style>
