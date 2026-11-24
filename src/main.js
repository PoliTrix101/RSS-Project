
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import './style.css'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),

  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      component: () => import('./views/auth/LoginView.vue')
    },
    {
      path: '/register',
      component: () => import('./views/auth/RegisterView.vue')
    },
    {
      path: '/forgot-password',
      component: () => import('./views/auth/ForgotPasswordView.vue')
    },
    {
      path: '/student/dashboard',
      component: () => import('./views/student/DashboardView.vue')
    },
    {
      path: '/admin/dashboard',
      component: () => import('./views/Admin/DashboardView.vue')
    },
    {
      path: '/admin/students',
      component: () => import('./views/Admin/StudentsView.vue')
    },
    {
      path: '/admin/workflows/:module',
      component: () => import('./views/Admin/AdminWorkflowsView.vue')
    }
  ]
})

createApp(App)
  .use(router)
  .mount('#app')
