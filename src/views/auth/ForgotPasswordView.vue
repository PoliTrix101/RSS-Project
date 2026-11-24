
<template>
  <div class="forgot-page">
    <div class="forgot-card">
      <div class="logo">RSS</div>

      <h1>Forgot your password?</h1>
      <p class="description">
        Passwords are reset by your RSS administrator. They will give you a temporary password.
      </p>

      <ol class="steps">
        <li>Ask your RSS administrator to reset your password.</li>
        <li>Sign in with the temporary password they give you.</li>
        <li>Open <strong>Settings</strong> and choose a new password.</li>
      </ol>

      <router-link to="/login" class="back-link">
        ← Back to Login
      </router-link>
    </div>
  </div>
</template>

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
  color: #f1f5f9;
  font-family: Inter, Arial, sans-serif;
}

.logo {
  width: 65px;
  height: 65px;
  display: grid;
  place-items: center;
  margin: 0 auto 22px;
  background: #2563eb;
  border-radius: 14px;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
}

h1 {
  margin: 0 0 12px;
  font-size: 23px;
}

.description {
  margin: 0 0 22px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.7;
}

.steps {
  margin: 0;
  padding: 16px 18px 16px 36px;
  text-align: left;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.8;
}

.steps strong {
  color: #f1f5f9;
}

.back-link {
  display: inline-block;
  margin-top: 25px;
  color: #60a5fa;
  font-size: 13px;
}
</style>
