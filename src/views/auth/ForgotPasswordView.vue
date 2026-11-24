<template>
  <section class="auth-view forgot-view">
    <header class="auth-head">
      <span class="key-badge auth-rise" style="--i: 0" aria-hidden="true">
        <AppIcon name="key" :size="22" />
      </span>
      <span class="auth-kicker auth-rise" style="--i: 1">Account help</span>
      <h2 class="auth-rise" style="--i: 2">Forgot your password?</h2>
      <p class="auth-rise" style="--i: 3">
        Passwords are reset by your RSS administrator. They'll give you a
        temporary password to sign in with.
      </p>
    </header>

    <ol class="help-steps">
      <li class="help-step auth-rise" style="--i: 4">
        <span class="help-dot">1</span>
        <div>
          <strong>Contact your administrator</strong>
          <p>Ask them to reset the password for your account.</p>
        </div>
      </li>
      <li class="help-step auth-rise" style="--i: 5">
        <span class="help-dot">2</span>
        <div>
          <strong>Sign in with the temporary password</strong>
          <p>Use your school email and the password they give you.</p>
        </div>
      </li>
      <li class="help-step auth-rise" style="--i: 6">
        <span class="help-dot">3</span>
        <div>
          <strong>Choose a new password</strong>
          <p>Open <em>Settings</em> in the student portal and change it right away.</p>
        </div>
      </li>
    </ol>

    <div class="auth-rise" style="--i: 7">
      <router-link to="/login" class="auth-btn auth-btn-primary auth-btn-block back-btn">
        <AppIcon name="arrow-left" :size="18" class="back-arrow" />
        Back to sign in
      </router-link>
    </div>

    <p class="auth-alt auth-rise" style="--i: 8">
      New here?
      <router-link to="/register" class="auth-link">Create an account</router-link>
    </p>
  </section>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'
</script>

<style scoped>
.forgot-view { max-width: 440px; }

/* Key badge: swings in like a key turning in a lock. */
.key-badge {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  box-shadow:
    0 14px 28px -12px rgba(37, 99, 235, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.key-badge .app-icon {
  animation: key-turn 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s backwards;
}

@keyframes key-turn {
  from { transform: rotate(-70deg) scale(0.7); opacity: 0; }
}

/* Steps: numbered dots joined by a line that draws downward. */
.help-steps {
  position: relative;
  display: grid;
  gap: 2px;
  margin: 0 0 26px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  list-style: none;
  box-shadow: var(--shadow-xs);
}

.help-steps::before {
  content: '';
  position: absolute;
  top: 34px;
  bottom: 34px;
  left: 33px;
  z-index: 1;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(to bottom, #2563eb, #7c3aed);
  opacity: 0.25;
  transform-origin: top;
  animation: line-draw 0.9s cubic-bezier(0.65, 0, 0.35, 1) 0.5s backwards;
}

@keyframes line-draw { from { transform: scaleY(0); } }

.help-step {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 12px;
  border-radius: 12px;
  transition: background-color 0.25s ease;
}

.help-step:hover { background: var(--surface-2); }

.help-dot {
  position: relative;
  z-index: 2;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 0 0 4px #fff, 0 6px 14px -6px rgba(37, 99, 235, 0.8);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.help-step:hover .help-dot { transform: scale(1.1); }

/* Keep the white ring matching the row's hover background. */
.help-step:hover .help-dot {
  box-shadow: 0 0 0 4px var(--surface-2), 0 6px 14px -6px rgba(37, 99, 235, 0.8);
}

.help-step strong {
  display: block;
  padding-top: 3px;
  color: var(--text);
  font-size: 14px;
  font-weight: 650;
}

.help-step p {
  margin: 3px 0 0;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.5;
}

.help-step em {
  color: var(--text-2);
  font-style: normal;
  font-weight: 600;
}

/* The arrow nudges left on hover, toward where the link goes. */
.back-arrow { transition: transform 0.25s ease; }
.back-btn:hover .back-arrow { transform: translateX(-4px); }
</style>
