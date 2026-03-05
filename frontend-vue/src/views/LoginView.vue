<template>
  <div class="login-page">
    <router-link class="back-link" :to="{ name: 'landing' }" aria-label="Back to landing page">
      <i class="fa-solid fa-arrow-left"></i>
      <span>Back</span>
    </router-link>
    <div class="login-container">
      <div class="login-card">
        <img src="/images/logo.png" alt="KGL Logo" class="logo" />

        <h2>Welcome Back</h2>
        <p>Login to access the system</p>

        <form novalidate @submit.prevent="onSubmit">
          <div class="form-group">
            <label>Email</label>
            <input v-model.trim="email" type="email" required placeholder="Enter your email" autocomplete="off" />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input v-model.trim="password" type="password" required autocomplete="off" placeholder="Enter your password" />
          </div>

          <div class="form-extra">
            <label><input type="checkbox" disabled /> Remember me</label>
            <a href="#" @click.prevent>Forgot password?</a>
          </div>

          <button type="submit" class="btn-login" :disabled="loading">
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>

        <div class="account-info">
          <p>Don't have an account? <strong>Contact the Director</strong> to be registered.</p>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="['toast', toast.type]">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

const toast = reactive({
  show: false,
  message: '',
  type: 'error'
})

function showToast(message, type = 'error') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

async function onSubmit() {
  if (!email.value || !password.value) {
    showToast('Please enter both email and password.', 'error')
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    showToast('Please enter a valid email address.', 'error')
    return
  }
  if (password.value.length < 3) {
    showToast('Password must be at least 3 characters.', 'error')
    return
  }

  loading.value = true

  try {
    const { ok, data } = await apiFetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })

    if (!ok) {
      showToast(data?.message || 'Invalid credentials', 'error')
      return
    }

    const authData = data?.data || data || {}
    const user = authData.user || authData
    const role = (user.role || authData.role || '').trim()

    auth.setAuth({
      token: authData.token,
      userName: user.fullName || user.name || user.username || '',
      role,
      branch: user.branch || authData.branch || ''
    })

    if (role === 'Director') {
      router.push({ name: 'director' })
      return
    }

    if (role === 'Manager') {
      router.push({ name: 'manager' })
      return
    }

    if (role === 'Sales Agent') {
      router.push({ name: 'sales-agent' })
      return
    }

    showToast(`Unknown user role: "${role}". Please contact support.`, 'error')
  } catch {
    showToast('Something went wrong. Please try again later.', 'error')
  } finally {
    loading.value = false
  }
}
</script>
