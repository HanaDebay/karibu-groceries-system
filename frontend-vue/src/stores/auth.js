import { defineStore } from 'pinia'

function read(key) {
  return localStorage.getItem(key)
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: read('token') || '',
    userName: read('userName') || '',
    role: read('role') || '',
    branch: read('branch') || ''
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token)
  },
  actions: {
    setAuth(payload) {
      this.token = payload.token || ''
      this.userName = payload.userName || ''
      this.role = payload.role || ''
      this.branch = payload.branch || ''

      localStorage.setItem('token', this.token)
      localStorage.setItem('userName', this.userName)
      localStorage.setItem('role', this.role)
      if (this.branch) {
        localStorage.setItem('branch', this.branch)
      } else {
        localStorage.removeItem('branch')
      }
    },
    clearAuth() {
      this.token = ''
      this.userName = ''
      this.role = ''
      this.branch = ''
      localStorage.removeItem('token')
      localStorage.removeItem('userName')
      localStorage.removeItem('role')
      localStorage.removeItem('branch')
    }
  }
})
