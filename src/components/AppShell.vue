<template>
  <div class="shell" :class="{ 'drawer-open': drawerOpen }">
    <aside id="app-sidebar" class="sidebar" aria-label="Main navigation">
      <div class="sidebar-brand">
        <span class="brand-mark"><AppIcon name="graduation-cap" :size="22" /></span>
        <div class="brand-copy">
          <strong>Return of Service</strong>
          <span>{{ brandSubtitle }}</span>
        </div>
        <button class="drawer-close" type="button" aria-label="Close navigation" @click="drawerOpen = false">
          <AppIcon name="x" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <div v-for="section in sections" :key="section.label" class="nav-section">
          <p v-if="section.label" class="nav-label">{{ section.label }}</p>
          <template v-for="item in section.items" :key="item.id">
            <router-link
              v-if="item.to"
              :to="item.to"
              class="nav-item"
              :class="{ active: item.id === activeId }"
              :aria-current="item.id === activeId ? 'page' : undefined"
              @click="drawerOpen = false"
            >
              <AppIcon :name="item.icon" />
              <span class="nav-text">{{ item.label }}</span>
              <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
            </router-link>
            <button
              v-else
              type="button"
              class="nav-item"
              :class="{ active: item.id === activeId }"
              :aria-current="item.id === activeId ? 'page' : undefined"
              @click="select(item.id)"
            >
              <AppIcon :name="item.icon" />
              <span class="nav-text">{{ item.label }}</span>
              <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
            </button>
          </template>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <span class="avatar avatar-sm sidebar-avatar">{{ userInitials }}</span>
          <div class="sidebar-user-copy">
            <strong>{{ userName }}</strong>
            <span>{{ userRole }}</span>
          </div>
          <button class="signout" type="button" title="Sign out" aria-label="Sign out" @click="logout">
            <AppIcon name="log-out" :size="17" />
          </button>
        </div>
      </div>
    </aside>

    <div class="shell-overlay" aria-hidden="true" @click="drawerOpen = false"></div>

    <div class="shell-main">
      <header class="topbar">
        <button
          class="btn btn-ghost btn-icon menu-button"
          type="button"
          aria-label="Open navigation"
          aria-controls="app-sidebar"
          :aria-expanded="drawerOpen"
          @click="drawerOpen = true"
        >
          <AppIcon name="menu" :size="20" />
        </button>
        <div class="topbar-title">
          <h1>{{ title }}</h1>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <div class="topbar-actions">
          <slot name="actions" />
          <div class="topbar-user">
            <span class="avatar avatar-sm">{{ userInitials }}</span>
            <div>
              <strong>{{ userName }}</strong>
              <span>{{ userMeta || userRole }}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="shell-content">
        <slot />
      </main>

      <footer class="shell-footer">
        <span>© {{ year }} Return of Service System</span>
        <span>{{ brandSubtitle }}</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { clearSession } from '@/utils/session'

defineProps({
  brandSubtitle: { type: String, default: '' },
  sections: { type: Array, required: true },
  activeId: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  userName: { type: String, default: '' },
  userRole: { type: String, default: '' },
  userMeta: { type: String, default: '' },
  userInitials: { type: String, default: '?' }
})
const emit = defineEmits(['navigate'])

const router = useRouter()
const drawerOpen = ref(false)
const year = new Date().getFullYear()

function select(id) {
  drawerOpen.value = false
  emit('navigate', id)
}

function logout() {
  clearSession()
  router.replace('/login')
}

function onKeydown(event) {
  if (event.key === 'Escape') drawerOpen.value = false
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.shell { min-height: 100vh; display: flex; background: var(--bg); }

/* ---------- Sidebar ---------- */

.sidebar {
  position: sticky;
  top: 0;
  z-index: 40;
  width: 264px;
  height: 100vh;
  flex: 0 0 264px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--sidebar-bg-2) 0%, var(--sidebar-bg) 55%);
  color: var(--sidebar-text);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 20px;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 11px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  box-shadow: 0 6px 16px -6px rgba(37, 99, 235, 0.7);
}
.brand-copy { min-width: 0; flex: 1; }
.brand-copy strong { display: block; color: #fff; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
.brand-copy span { display: block; margin-top: 1px; color: var(--sidebar-muted); font-size: 12px; font-weight: 500; }
.drawer-close { display: none; }

.sidebar-nav { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 12px 16px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
.nav-section + .nav-section { margin-top: 14px; }
.nav-label {
  margin: 0 0 6px;
  padding: 0 12px;
  color: var(--sidebar-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.nav-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 1px 0;
  padding: 9px 12px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--sidebar-text);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color .15s ease, color .15s ease;
}
.nav-item:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
.nav-item.active { background: rgba(96, 148, 255, 0.16); color: #fff; }
.nav-item.active::before {
  content: "";
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: -12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #60a5fa;
}
.nav-item.active :deep(svg) { color: #93c5fd; }
.nav-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-badge {
  min-width: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: #f59e0b;
  color: #1c1305;
  font-size: 11px;
  font-weight: 700;
  line-height: 19px;
  text-align: center;
}

.sidebar-footer { padding: 12px; border-top: 1px solid var(--sidebar-border); }
.sidebar-user { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; background: rgba(255, 255, 255, 0.04); }
.sidebar-avatar { background: rgba(147, 197, 253, 0.16); color: #bfdbfe; }
.sidebar-user-copy { flex: 1; min-width: 0; }
.sidebar-user-copy strong { display: block; overflow: hidden; color: #fff; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-user-copy span { display: block; color: var(--sidebar-muted); font-size: 12px; }
.signout {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--sidebar-text);
  cursor: pointer;
}
.signout:hover { background: rgba(248, 113, 113, 0.14); color: #fca5a5; }

/* ---------- Main column ---------- */

.shell-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 72px;
  padding: 12px 32px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: saturate(180%) blur(10px);
}
.menu-button { display: none; margin-left: -8px; }
.topbar-title { flex: 1; min-width: 0; }
.topbar-title h1 { margin: 0; color: var(--text); font-size: 19px; font-weight: 700; letter-spacing: -0.015em; }
.topbar-title p { margin: 1px 0 0; overflow: hidden; color: var(--text-3); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.topbar-actions { display: flex; align-items: center; gap: 10px; }
.topbar-user { display: flex; align-items: center; gap: 10px; margin-left: 4px; padding-left: 14px; border-left: 1px solid var(--border); }
.topbar-user strong { display: block; max-width: 180px; overflow: hidden; color: var(--text); font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.topbar-user span:not(.avatar) { display: block; color: var(--text-3); font-size: 12px; }

.shell-content { flex: 1; width: 100%; max-width: 1360px; margin: 0 auto; padding: 28px 32px 40px; }

.shell-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 32px;
  border-top: 1px solid var(--border);
  color: var(--text-4);
  font-size: 12px;
}

.shell-overlay { display: none; }

/* ---------- Mobile drawer ---------- */

@media (max-width: 960px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    height: auto;
    transform: translateX(-100%);
    transition: transform .22s ease;
    box-shadow: var(--shadow-lg);
  }
  .drawer-open .sidebar { transform: translateX(0); }
  .drawer-close {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--sidebar-text);
    cursor: pointer;
  }
  .drawer-close:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  .shell-overlay {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: block;
    background: rgba(9, 18, 33, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s ease;
  }
  .drawer-open .shell-overlay { opacity: 1; pointer-events: auto; }
  .menu-button { display: inline-flex; }
  .topbar { padding: 10px 20px; min-height: 64px; }
  .shell-content { padding: 22px 20px 32px; }
  .shell-footer { padding: 16px 20px; }
}

@media (max-width: 640px) {
  .topbar-user { display: none; }
  .topbar-title h1 { font-size: 17px; }
  .topbar-title p { display: none; }
  .shell-content { padding: 18px 14px 28px; }
  .shell-footer { flex-direction: column; gap: 2px; }
}
</style>
