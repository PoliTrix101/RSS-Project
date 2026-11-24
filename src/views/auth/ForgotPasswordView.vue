<template>
  <div class="forgot-page">
    <main class="forgot-card">
      <div class="brand">
        <span class="brand-mark"><AppIcon name="graduation-cap" :size="22" /></span>
        <span>Return of Service</span>
      </div>

      <span class="key-icon"><AppIcon name="key" :size="22" /></span>
      <h1>Forgot your password?</h1>
      <p class="description">
        Passwords are reset by your RSS administrator. They'll give you a temporary password to sign in with.
      </p>

      <ol class="steps">
        <li>
          <span class="step-number">1</span>
          <div><strong>Contact your administrator</strong><p>Ask them to reset the password for your account.</p></div>
        </li>
        <li>
          <span class="step-number">2</span>
          <div><strong>Sign in with the temporary password</strong><p>Use your school email and the password they give you.</p></div>
        </li>
        <li>
          <span class="step-number">3</span>
          <div><strong>Choose a new password</strong><p>Open <em>Settings</em> in the student portal and change it right away.</p></div>
        </li>
      </ol>

      <router-link to="/login" class="back-link">
        <AppIcon name="arrow-left" :size="16" />
        Back to sign in
      </router-link>
    </main>
  </div>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'
</script>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.12), transparent 40%),
    radial-gradient(circle at 90% 90%, rgba(29, 78, 216, 0.10), transparent 45%),
    var(--bg);
}

.forgot-card {
  width: 100%;
  max-width: 460px;
  padding: 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; color: var(--text); font-size: 15px; font-weight: 700; }
.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
}

.key-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; background: var(--primary-soft); color: var(--primary-text); }

h1 { margin: 18px 0 8px; color: var(--text); font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }

.description { margin: 0 0 24px; color: var(--text-3); font-size: 14px; line-height: 1.65; }

.steps { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.steps li { display: flex; gap: 14px; padding: 12px 0; }
.steps li + li { border-top: 1px solid var(--border); }
.step-number {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.steps strong { display: block; color: var(--text); font-size: 14px; font-weight: 600; }
.steps p { margin: 2px 0 0; color: var(--text-3); font-size: 13px; line-height: 1.5; }
.steps em { color: var(--text-2); font-style: normal; font-weight: 600; }

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  padding: 11px 16px;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color .15s ease, border-color .15s ease;
}
.back-link:hover { border-color: #b9c2cf; background: var(--surface-2); color: var(--text); }

@media (max-width: 480px) {
  .forgot-card { padding: 26px 22px; }
}
</style>
