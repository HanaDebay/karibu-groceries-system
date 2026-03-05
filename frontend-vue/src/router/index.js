import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/LoginView.vue'
import DirectorDashboardView from '../views/DirectorDashboardView.vue'
import ManagerDashboardView from '../views/ManagerDashboardView.vue'
import SalesAgentDashboardView from '../views/SalesAgentDashboardView.vue'

function roleHomeRoute(role) {
  // Single redirect map used by guards to avoid duplicated role checks.
  if (role === 'Director') return { name: 'director' }
  if (role === 'Manager') return { name: 'manager' }
  if (role === 'Sales Agent') return { name: 'sales-agent' }
  return { name: 'login' }
}

const routes = [
  { path: '/', name: 'landing', component: LandingView, meta: { public: true, guestOnly: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true, guestOnly: true } },
  { path: '/director', name: 'director', component: DirectorDashboardView, meta: { role: 'Director' } },
  { path: '/manager', name: 'manager', component: ManagerDashboardView, meta: { role: 'Manager' } },
  { path: '/sales-agent', name: 'sales-agent', component: SalesAgentDashboardView, meta: { role: 'Sales Agent' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Authenticated users should not stay on guest-only pages (landing/login).
  if (to.meta.public && to.meta.guestOnly && auth.isAuthenticated) {
    return roleHomeRoute(auth.role)
  }

  if (to.meta.public) {
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.role && auth.role !== to.meta.role) {
    return roleHomeRoute(auth.role)
  }

  return true
})

export default router
