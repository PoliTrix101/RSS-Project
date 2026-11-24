<template>
  <AppShell
    brand-subtitle="Admin Console"
    :sections="sections"
    :active-id="active"
    :title="title"
    :subtitle="subtitle"
    :user-name="adminName"
    user-role="Administrator"
    :user-initials="initialsOf(adminName, 'A')"
  >
    <template #actions><slot name="actions" /></template>
    <slot />
  </AppShell>
</template>

<script setup>
import { computed } from 'vue'
import AppShell from './AppShell.vue'
import { fullName, initialsOf, readSession } from '@/utils/session'

defineProps({
  active: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})

const adminName = computed(() => fullName(readSession('admin')?.user, 'Administrator'))

const sections = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: '/admin/dashboard' },
      { id: 'students', label: 'Students', icon: 'users', to: '/admin/students' }
    ]
  },
  {
    label: 'Reviews',
    items: [
      { id: 'attendance', label: 'Attendance', icon: 'clipboard-check', to: '/admin/workflows/attendance' },
      { id: 'documents', label: 'Documents', icon: 'file-text', to: '/admin/workflows/documents' },
      { id: 'hours', label: 'Service Hours', icon: 'clock', to: '/admin/workflows/hours' }
    ]
  },
  {
    label: 'Programs',
    items: [
      { id: 'activities', label: 'Service Activities', icon: 'calendar-check', to: '/admin/workflows/activities' },
      { id: 'areas', label: 'Service Areas', icon: 'map-pin', to: '/admin/workflows/areas' }
    ]
  },
  {
    label: 'Communication',
    items: [
      { id: 'announcements', label: 'Announcements', icon: 'megaphone', to: '/admin/workflows/announcements' }
    ]
  }
]
</script>
