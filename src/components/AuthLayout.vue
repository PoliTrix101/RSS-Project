<template>
  <div class="auth-shell">
    <!-- BRANDING PANEL -->
    <aside
      ref="brandPanel"
      class="brand-panel"
      @pointermove="trackPointer"
      @pointerleave="resetPointer"
    >
      <div class="aurora" aria-hidden="true">
        <span class="blob blob-a" />
        <span class="blob blob-b" />
        <span class="blob blob-c" />
      </div>
      <div class="grid-lines" aria-hidden="true" />
      <div class="spotlight" aria-hidden="true" />

      <div class="brand-inner">
        <div class="brand-logo">
          <span class="logo-mark"><AppIcon name="graduation-cap" :size="22" /></span>
          <span class="logo-text">
            <strong>Return of Service</strong>
            <small>Management System</small>
          </span>
        </div>

        <div class="brand-body">
          <Transition name="hero-swap" mode="out-in">
            <div :key="view" class="hero">
              <span class="hero-eyebrow"><span class="live-dot" />{{ copy.eyebrow }}</span>
              <h1>
                <span v-for="(line, i) in copy.lines" :key="line" class="hero-line">
                  <span
                    :class="{ 'hero-accent': i === copy.lines.length - 1 }"
                    :style="{ '--i': i }"
                  >{{ line }}</span>
                </span>
              </h1>
              <p>{{ copy.body }}</p>
            </div>
          </Transition>

          <!-- Decorative preview of the portal; hidden from screen readers. -->
          <div class="showcase" aria-hidden="true">
            <div class="parallax parallax-progress">
              <div class="card-enter" style="--delay: .55s">
                <div class="glass-card progress-card">
                  <div class="ring">
                    <svg viewBox="0 0 64 64">
                      <defs>
                        <linearGradient id="auth-ring-gradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stop-color="#60a5fa" />
                          <stop offset="100%" stop-color="#a78bfa" />
                        </linearGradient>
                      </defs>
                      <circle class="ring-track" cx="32" cy="32" r="27" />
                      <circle class="ring-fill" cx="32" cy="32" r="27" pathLength="100" />
                    </svg>
                    <span class="ring-value">{{ percent }}%</span>
                  </div>
                  <div class="progress-copy">
                    <span class="card-label">Service hours</span>
                    <strong class="card-value">{{ hours }} <small>/ {{ REQUIRED_HOURS }} hrs</small></strong>
                    <div class="mini-bars">
                      <span
                        v-for="(height, i) in BAR_HEIGHTS"
                        :key="i"
                        :style="{ '--h': `${height}%`, '--i': i }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="parallax parallax-attendance">
              <div class="card-enter" style="--delay: .8s">
                <div class="glass-card note-card" style="--float-delay: -2s">
                  <span class="note-icon is-green"><AppIcon name="calendar-check" :size="18" /></span>
                  <span>
                    <strong>Attendance verified</strong>
                    <small>Today · 8:02 AM</small>
                  </span>
                </div>
              </div>
            </div>

            <div class="parallax parallax-approved">
              <div class="card-enter" style="--delay: 1s">
                <div class="glass-card note-card" style="--float-delay: -4.5s">
                  <span class="note-icon is-violet"><AppIcon name="award" :size="18" /></span>
                  <span>
                    <strong>Activity approved</strong>
                    <small>+4 hrs · Community clean-up</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="brand-footer">
          <span>© 2026 Return of Service System</span>
          <span>Student Portal</span>
        </footer>
      </div>
    </aside>

    <!-- FORM PANEL -->
    <main class="form-panel">
      <div class="form-topbar">
        <nav
          class="auth-switch"
          :class="{ 'is-idle': view === 'forgot' }"
          aria-label="Sign in or create an account"
          :style="{ '--pos': view === 'register' ? 1 : 0 }"
        >
          <span class="auth-switch-thumb" aria-hidden="true" />
          <router-link to="/login">Sign in</router-link>
          <router-link to="/register">Create account</router-link>
        </nav>
      </div>

      <div class="form-stage">
        <router-view v-slot="{ Component, route: viewRoute }">
          <Transition :name="`auth-${direction}`" mode="out-in">
            <component :is="Component" :key="viewRoute.path" />
          </Transition>
        </router-view>
      </div>

      <footer class="form-footer">
        <AppIcon name="shield" :size="13" />
        <span>Your account information is protected.</span>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { prefersReducedMotion } from '@/utils/motion'

const COPY = {
  login: {
    eyebrow: 'Student Service Portal',
    lines: ['Your service.', 'Your progress.', 'Your future.'],
    body: 'Log your service hours, check your attendance and keep every requirement on track — all from one place.'
  },
  register: {
    eyebrow: 'New student registration',
    lines: ['Every hour', 'moves you', 'forward.'],
    body: 'Create your account in three quick steps. An administrator reviews new accounts before your first sign-in.'
  },
  forgot: {
    eyebrow: 'Account help',
    lines: ['Locked out?', 'We’ll get you', 'back on track.'],
    body: 'Passwords are reset by your RSS administrator. Here’s how to get back into your account.'
  }
}

// Order of the pages, used for the slide direction. Moving "forward"
// slides the form in from the right; moving "back" slides it from the
// left. Forgot password sits between the two: deeper than Sign in, but
// Create account is still further along.
const VIEW_ORDER = { login: 0, forgot: 0.5, register: 1 }

const REQUIRED_HOURS = 340
const SAMPLE_HOURS = 245
const BAR_HEIGHTS = [40, 65, 35, 80, 55, 95, 70]

const route = useRoute()
const view = computed(() => (route.meta.authView in COPY ? route.meta.authView : 'login'))
const copy = computed(() => COPY[view.value])

const direction = ref('forward')
watch(view, (to, from) => {
  direction.value = VIEW_ORDER[to] >= VIEW_ORDER[from] ? 'forward' : 'back'
})

// Count the sample hours up alongside the progress ring animation.
const hours = ref(0)
const percent = computed(() => Math.round((hours.value / REQUIRED_HOURS) * 100))
let countFrame = 0

onMounted(() => {
  if (prefersReducedMotion()) {
    hours.value = SAMPLE_HOURS
    return
  }

  const start = performance.now() + 700
  const duration = 1600

  const tick = now => {
    const progress = Math.min(1, Math.max(0, (now - start) / duration))
    const eased = 1 - Math.pow(1 - progress, 3)
    hours.value = Math.round(SAMPLE_HOURS * eased)
    if (progress < 1) countFrame = requestAnimationFrame(tick)
  }
  countFrame = requestAnimationFrame(tick)
})

// Spotlight + parallax: the panel follows the mouse with CSS variables,
// written straight to the element so moving the mouse never re-renders.
const brandPanel = ref(null)
let pointerFrame = 0

function trackPointer(event) {
  if (event.pointerType !== 'mouse' || prefersReducedMotion()) return

  const panel = brandPanel.value
  if (!panel) return

  const rect = panel.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height

  cancelAnimationFrame(pointerFrame)
  pointerFrame = requestAnimationFrame(() => {
    panel.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`)
    panel.style.setProperty('--my', `${(y * 100).toFixed(2)}%`)
    panel.style.setProperty('--px', (x - 0.5).toFixed(3))
    panel.style.setProperty('--py', (y - 0.5).toFixed(3))
  })
}

function resetPointer() {
  cancelAnimationFrame(pointerFrame)
  brandPanel.value?.style.setProperty('--px', '0')
  brandPanel.value?.style.setProperty('--py', '0')
}

onBeforeUnmount(() => {
  cancelAnimationFrame(countFrame)
  cancelAnimationFrame(pointerFrame)
})
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  background: #f6f8fc;
  color: var(--text);
}

/* ---------- Branding panel ---------- */

.brand-panel {
  --mx: 50%;
  --my: 40%;
  --px: 0;
  --py: 0;

  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(120% 90% at 0% 0%, #13284d 0%, transparent 55%),
    #0a1424;
  color: #fff;
}

.aurora {
  position: absolute;
  inset: 0;
  z-index: -3;
}

.blob {
  position: absolute;
  border-radius: 50%;
  mix-blend-mode: screen;
  will-change: transform;
}

.blob-a {
  width: 640px;
  height: 640px;
  top: -220px;
  left: -180px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.55), transparent 65%);
  animation: drift-a 22s ease-in-out infinite alternate;
}

.blob-b {
  width: 540px;
  height: 540px;
  top: 28%;
  right: -200px;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.42), transparent 65%);
  animation: drift-b 26s ease-in-out infinite alternate;
}

.blob-c {
  width: 580px;
  height: 580px;
  bottom: -280px;
  left: 8%;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.3), transparent 65%);
  animation: drift-c 30s ease-in-out infinite alternate;
}

@keyframes drift-a { to { transform: translate3d(130px, 90px, 0) scale(1.15); } }
@keyframes drift-b { to { transform: translate3d(-150px, -70px, 0) scale(0.88); } }
@keyframes drift-c { to { transform: translate3d(100px, -130px, 0) scale(1.12); } }

.grid-lines {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 75% 60% at 30% 38%, #000 15%, transparent 75%);
  mask-image: radial-gradient(ellipse 75% 60% at 30% 38%, #000 15%, transparent 75%);
}

.spotlight {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(520px circle at var(--mx) var(--my), rgba(96, 165, 250, 0.16), transparent 45%);
  opacity: 0;
  transition: opacity 0.5s ease;
}

.brand-panel:hover .spotlight { opacity: 1; }

.brand-inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 40px clamp(32px, 5vw, 72px) 30px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  animation: brand-fade 0.6s ease backwards;
}

.logo-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  box-shadow:
    0 10px 30px -10px rgba(99, 102, 241, 0.9),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.logo-text strong {
  display: block;
  font-size: 14px;
  letter-spacing: 0.02em;
}

.logo-text small {
  display: block;
  margin-top: 2px;
  color: #8ea3c4;
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.brand-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 46px;
  max-width: 560px;
  padding: 32px 0;
}

/* Hero copy */

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 13px 6px 11px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: #bfd3f5;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  animation: brand-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  animation: live-pulse 2.2s ease-out infinite;
}

@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6); }
  70%, 100% { box-shadow: 0 0 0 9px rgba(52, 211, 153, 0); }
}

.hero h1 {
  margin: 22px 0 0;
  font-size: clamp(38px, 4.1vw, 60px);
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.035em;
}

/* Each line slides up from behind a mask. */
.hero-line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
  margin-bottom: -0.08em;
}

.hero-line > span {
  display: inline-block;
  animation: line-up 0.95s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(var(--i) * 110ms + 120ms);
}

.hero-line > .hero-accent {
  background: linear-gradient(90deg, #60a5fa, #a78bfa 30%, #22d3ee 60%, #60a5fa);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation:
    line-up 0.95s cubic-bezier(0.16, 1, 0.3, 1) backwards,
    hue-flow 9s linear infinite;
  animation-delay: calc(var(--i) * 110ms + 120ms), 0s;
}

@keyframes line-up { from { transform: translateY(110%); } }
@keyframes hue-flow { to { background-position: 300% 0; } }

.hero p {
  max-width: 440px;
  margin: 22px 0 0;
  color: #a9b9d2;
  font-size: 15px;
  line-height: 1.75;
  animation: brand-rise 0.8s 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.hero-swap-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease, filter 0.25s ease;
}

.hero-swap-leave-to {
  opacity: 0;
  transform: translateY(-12px);
  filter: blur(6px);
}

.hero-swap-enter-active { transition: opacity 0.2s ease; }
.hero-swap-enter-from { opacity: 0; }

/* Floating preview cards */

.showcase {
  position: relative;
  height: 214px;
  max-width: 520px;
}

.parallax {
  position: absolute;
  transform: translate3d(
    calc(var(--px) * var(--depth) * -22px),
    calc(var(--py) * var(--depth) * -22px),
    0
  );
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.parallax-progress { top: 0; left: 0; --depth: 1; }
.parallax-attendance { top: 6px; right: 0; --depth: 2.2; }
.parallax-approved { bottom: 0; left: 30%; --depth: 1.6; }

.card-enter {
  animation: card-pop 0.9s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: var(--delay);
}

@keyframes card-pop {
  from { opacity: 0; transform: translateY(26px) scale(0.94); }
}

.glass-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 18px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.04));
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  backdrop-filter: blur(14px) saturate(140%);
  box-shadow:
    0 24px 48px -20px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  animation: float 7s ease-in-out infinite;
  animation-delay: var(--float-delay, 0s);
}

@keyframes float { 50% { transform: translateY(-9px); } }

.progress-card { padding: 16px 20px 16px 16px; }

.ring {
  position: relative;
  width: 66px;
  height: 66px;
  flex-shrink: 0;
}

.ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring circle {
  fill: none;
  stroke-width: 6;
}

.ring-track { stroke: rgba(255, 255, 255, 0.1); }

.ring-fill {
  stroke: url(#auth-ring-gradient);
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 28;
  animation: ring-fill 1.6s cubic-bezier(0.65, 0, 0.35, 1) 0.7s backwards;
}

@keyframes ring-fill { from { stroke-dashoffset: 100; } }

.ring-value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.card-label {
  display: block;
  color: #9fb3d1;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-value {
  display: block;
  margin-top: 2px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.card-value small {
  color: #8ea3c4;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
}

.mini-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 22px;
  margin-top: 8px;
}

.mini-bars span {
  width: 7px;
  height: var(--h);
  border-radius: 3px;
  background: linear-gradient(to top, #3b82f6, #22d3ee);
  transform-origin: bottom;
  animation: bar-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(1s + var(--i) * 70ms);
}

@keyframes bar-grow { from { transform: scaleY(0); } }

.note-card { padding-right: 22px; }

.note-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
}

.note-icon.is-green { background: rgba(16, 185, 129, 0.18); color: #34d399; }
.note-icon.is-violet { background: rgba(139, 92, 246, 0.22); color: #c4b5fd; }

.note-card strong {
  display: block;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.note-card small {
  display: block;
  margin-top: 1px;
  color: #9fb3d1;
  font-size: 11.5px;
  white-space: nowrap;
}

.brand-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #6f83a3;
  font-size: 11.5px;
}

@keyframes brand-fade { from { opacity: 0; } }
@keyframes brand-rise { from { opacity: 0; transform: translateY(12px); } }

/* ---------- Form panel ---------- */

.form-panel {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 26px clamp(22px, 4vw, 56px) 24px;
  overflow-x: clip;
  background:
    radial-gradient(700px 380px at 100% 0%, rgba(99, 102, 241, 0.08), transparent 60%),
    radial-gradient(600px 400px at 0% 100%, rgba(37, 99, 235, 0.06), transparent 60%),
    #f7f9fc;
}

.form-topbar {
  display: flex;
  justify-content: flex-end;
}

.auth-switch {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  box-shadow: var(--shadow-xs);
}

.auth-switch a {
  position: relative;
  z-index: 1;
  padding: 8px 18px;
  border-radius: 999px;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.auth-switch a:hover { color: var(--text); }
.auth-switch a.router-link-active { color: #fff; }

.auth-switch-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 6px 16px -6px rgba(37, 99, 235, 0.7);
  transform: translateX(calc(var(--pos) * 100%));
  transition: transform 0.5s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.3s ease;
}

/* On Forgot password neither tab is current, so the highlight fades out. */
.auth-switch.is-idle .auth-switch-thumb { opacity: 0; }

.form-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px 0;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--text-4);
  font-size: 12px;
}

/* ---------- Responsive ---------- */

/* Short laptop screens: drop the preview cards so nothing gets clipped. */
@media (max-height: 820px) {
  .showcase { display: none; }
}

@media (max-width: 960px) {
  .auth-shell { grid-template-columns: 1fr; }

  .brand-panel {
    position: relative;
    height: auto;
  }

  .brand-inner { padding: 24px 22px 70px; }
  .brand-body { gap: 0; padding: 26px 0 0; }
  .showcase,
  .brand-footer,
  .hero p { display: none; }

  .hero h1 {
    margin-top: 16px;
    font-size: clamp(30px, 7.5vw, 42px);
  }

  .form-panel {
    min-height: auto;
    margin-top: -40px;
    padding: 18px 20px 26px;
    border-radius: 28px 28px 0 0;
    box-shadow: 0 -14px 34px -14px rgba(10, 20, 36, 0.45);
  }

  .form-topbar { justify-content: center; }
  .auth-switch { width: 100%; max-width: 380px; }
  .form-stage { padding: 30px 0; }
}
</style>

<!--
  Shared building blocks for LoginView and RegisterView. Not scoped, so the
  child pages can use them; every class is prefixed with `auth-`.
-->
<style>
/* Entrance: children rise in one after another (set --i on each). */
.auth-rise {
  animation: auth-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(var(--i, 0) * 65ms + 60ms);
}

@keyframes auth-rise {
  from { opacity: 0; transform: translateY(14px); }
}

/* Page-to-page slide, direction-aware. */
.auth-forward-enter-active,
.auth-back-enter-active {
  transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-forward-leave-active,
.auth-back-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}

.auth-forward-enter-from,
.auth-back-leave-to { opacity: 0; transform: translateX(40px); }

.auth-forward-leave-to,
.auth-back-enter-from { opacity: 0; transform: translateX(-40px); }

/* Headings */

.auth-view { width: 100%; }

.auth-head { margin-bottom: 28px; }

.auth-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.auth-head h2 {
  margin: 10px 0 0;
  color: var(--text);
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.auth-head p {
  margin: 8px 0 0;
  color: var(--text-3);
  font-size: 14.5px;
  line-height: 1.6;
}

/* Fields */

.auth-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.auth-field-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.auth-label {
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.auth-optional {
  margin-left: 7px;
  color: var(--text-4);
  font-size: 12px;
  font-weight: 500;
}

.auth-control {
  position: relative;
  height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 27, 45, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.25s ease, background-color 0.2s ease;
}

.auth-control:hover { border-color: var(--border-strong); }

.auth-control:focus-within {
  border-color: #93b4f8;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12), 0 1px 2px rgba(15, 27, 45, 0.04);
}

/* Gradient line that grows from the centre on focus. */
.auth-control::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #2563eb, #7c3aed);
  transform: scaleX(0);
  transition: transform 0.35s cubic-bezier(0.65, 0, 0.35, 1);
  pointer-events: none;
}

.auth-control:focus-within::after { transform: scaleX(1); }

.auth-control-icon {
  color: var(--text-4);
  transition: color 0.2s ease, transform 0.3s ease;
}

.auth-control:focus-within .auth-control-icon {
  color: var(--primary);
  transform: scale(1.08);
}

.auth-control input,
.auth-control select {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 14.5px;
}

.auth-control input::placeholder { color: #a3adbb; }

.auth-control input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 40px #fff inset;
  -webkit-text-fill-color: var(--text);
}

.auth-control select {
  padding-right: 26px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.auth-control select.is-placeholder { color: #a3adbb; }
.auth-control select option { color: var(--text); }

.auth-select-chevron {
  position: absolute;
  right: 14px;
  color: var(--text-4);
  pointer-events: none;
}

.auth-field.has-error .auth-control {
  border-color: #f1a7a1;
  background: #fffafa;
}

.auth-field.has-error .auth-control:focus-within {
  box-shadow: 0 0 0 4px rgba(217, 58, 47, 0.12);
}

.auth-field.has-error .auth-control::after {
  background: linear-gradient(90deg, #d93a2f, #f97316);
}

.auth-field.has-error .auth-control-icon { color: var(--danger-solid); }

.auth-field-msg {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 7px 0 0;
  font-size: 12.5px;
  line-height: 1.4;
}

.auth-field-msg .app-icon { margin-top: 1px; }
.auth-field-msg.is-error { color: var(--danger); }
.auth-field-msg.is-hint { color: var(--text-4); }
.auth-field-msg.is-success { color: var(--success); }
.auth-field-msg.is-warning { color: var(--warning); }

.auth-msg-enter-active,
.auth-msg-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }

.auth-msg-enter-from,
.auth-msg-leave-to { opacity: 0; transform: translateY(-4px); }

/* Show / hide password */

.auth-reveal {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-right: -6px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-4);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.auth-reveal:hover {
  background: var(--surface-3);
  color: var(--text-2);
}

.icon-swap-enter-active,
.icon-swap-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; }
.icon-swap-enter-from { opacity: 0; transform: rotate(-35deg) scale(0.6); }
.icon-swap-leave-to { opacity: 0; transform: rotate(35deg) scale(0.6); }

/* Checkbox */

.auth-check {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--text-3);
  font-size: 13.5px;
  line-height: 1.45;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
}

.auth-check input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.auth-check-box {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--border-strong);
  border-radius: 6px;
  background: #fff;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth-check-box svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: #fff;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.35, 1) 0.05s;
}

.auth-check:hover .auth-check-box { border-color: #9fb4d6; }

.auth-check input:checked + .auth-check-box {
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  animation: auth-check-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.auth-check input:checked + .auth-check-box svg { stroke-dashoffset: 0; }

.auth-check input:focus-visible + .auth-check-box {
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
}

.auth-check.has-error .auth-check-box { border-color: var(--danger-solid); }

@keyframes auth-check-pop { 50% { transform: scale(1.18); } }

/* Buttons */

.auth-btn {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 22px;
  border: 0;
  border-radius: 12px;
  font-size: 14.5px;
  font-weight: 650;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.25s ease, background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.auth-btn-block { width: 100%; }

.auth-btn-primary {
  color: #fff;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  box-shadow:
    0 10px 24px -10px rgba(37, 99, 235, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

/* Darker gradient fades in on hover. */
.auth-btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(135deg, #1d4ed8, #6d28d9);
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* Light sweep across the button on hover. */
.auth-btn-primary::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: skewX(-20deg);
  transition: left 0.75s ease;
  pointer-events: none;
}

.auth-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 30px -12px rgba(79, 70, 229, 0.75);
}

.auth-btn-primary:hover:not(:disabled)::before { opacity: 1; }
.auth-btn-primary:hover:not(:disabled)::after { left: 130%; }

.auth-btn:active:not(:disabled) { transform: translateY(0) scale(0.985); }
.auth-btn:disabled { cursor: progress; }

.auth-btn-primary.is-success {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 10px 24px -10px rgba(5, 150, 105, 0.75);
}

.auth-btn-ghost {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-2);
  box-shadow: var(--shadow-xs);
}

.auth-btn-ghost:hover {
  border-color: var(--border-strong);
  background: var(--surface-2);
  color: var(--text);
}

.auth-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.auth-btn-arrow { transition: transform 0.25s ease; }
.auth-btn:hover:not(:disabled) .auth-btn-arrow { transform: translateX(4px); }

.auth-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}

@keyframes auth-spin { to { transform: rotate(360deg); } }

.btn-swap-enter-active,
.btn-swap-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; }
.btn-swap-enter-from { opacity: 0; transform: translateY(10px); }
.btn-swap-leave-to { opacity: 0; transform: translateY(-10px); }

/* Alerts */

.auth-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.5;
}

.auth-alert .app-icon { margin-top: 1px; }
.auth-alert.is-error { border-color: #f6cbc7; background: #fff5f4; color: #a12a21; }
.auth-alert.is-warning { border-color: #f3d9a4; background: #fff8ea; color: var(--warning); }
.auth-alert.is-success { border-color: #bfe8d3; background: #effaf4; color: var(--success); }

.auth-alert-enter-active { transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.auth-alert-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.auth-alert-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); }
.auth-alert-leave-to { opacity: 0; transform: scale(0.98); }

/* Links */

.auth-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
  background-image: linear-gradient(currentColor, currentColor);
  background-position: 0 100%;
  background-repeat: no-repeat;
  background-size: 0% 1.5px;
  transition: background-size 0.3s ease, color 0.2s ease;
}

.auth-link:hover {
  color: var(--primary-hover);
  background-size: 100% 1.5px;
}

.auth-alt {
  margin: 26px 0 0;
  color: var(--text-3);
  font-size: 14px;
  text-align: center;
}

/* Respect the OS "reduce motion" setting everywhere on these pages. */
@media (prefers-reduced-motion: reduce) {
  .auth-shell *,
  .auth-shell *::before,
  .auth-shell *::after {
    animation-duration: 1ms !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    transition-delay: 0s !important;
  }
}
</style>
