<template>
  <section>
    <header class="topbar">
      <h3>Administration Panel</h3>
      <span>Director Access</span>
    </header>

    <div class="toggle-container">
      <button type="button" :class="['toggle-btn', { active: activeView === 'users' }]" @click="activeView = 'users'">
        User Management
      </button>
      <button type="button" :class="['toggle-btn', { active: activeView === 'branches' }]" @click="activeView = 'branches'">
        Branch Management
      </button>
    </div>

    <section v-if="activeView === 'users'" class="tab-content">
      <div class="action-bar">
        <button type="button" class="btn primary" @click="openUserModal">Add User</button>
        <input v-model.trim="userSearchText" type="search" placeholder="Search user..." />
      </div>

      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5">Loading users...</td>
            </tr>
            <tr v-else-if="!filteredUsers.length">
              <td colspan="5">No users found.</td>
            </tr>
            <tr v-for="user in filteredUsers" :key="user._id">
              <td>{{ user.fullName }}</td>
              <td>{{ user.role }}</td>
              <td>{{ user.branch || '-' }}</td>
              <td><span class="badge active">Active</span></td>
              <td>
                <button type="button" class="btn secondary" @click="openUpdateUserModal(user)">Key</button>
                <button type="button" class="btn delete" @click="deleteUser(user._id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="tab-content">
      <div class="action-bar">
        <button type="button" class="btn primary" @click="openBranchModal">Add Branch</button>
        <input v-model.trim="branchSearchText" type="search" placeholder="Search branch..." />
      </div>

      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Branch Name</th>
              <th>Location</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5">Loading branches...</td>
            </tr>
            <tr v-else-if="!filteredBranches.length">
              <td colspan="5">No branches found.</td>
            </tr>
            <tr v-for="branch in filteredBranches" :key="branch._id">
              <td>{{ branch.name }}</td>
              <td>{{ branch.location }}</td>
              <td>{{ branch.manager || '-' }}</td>
              <td><span class="badge active">Active</span></td>
              <td>
                <button type="button" class="btn delete" @click="deleteBranch(branch._id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>

  <div v-if="showUserModal" class="modal open">
    <div class="modal-content">
      <header>
        <h3>Register New User</h3>
        <button type="button" class="modal-close" @click="showUserModal = false">x</button>
      </header>
      <form @submit.prevent="addUser">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model.trim="userForm.fullName" type="text" required placeholder="e.g. John Doe" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model.trim="userForm.email" type="email" required placeholder="e.g. john@kgl.com" />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select v-model="userForm.role" required>
            <option value="Manager">Manager</option>
            <option value="Sales Agent">Sales Agent</option>
          </select>
        </div>
        <div class="form-group">
          <label>Branch</label>
          <select v-model="userForm.branch">
            <option value="">Select Branch</option>
            <option v-for="branch in branches" :key="branch._id" :value="branch.name">{{ branch.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="userForm.password" type="password" required placeholder="******" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showUserModal = false">Cancel</button>
          <button type="submit" class="btn primary">Register User</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showBranchModal" class="modal open">
    <div class="modal-content">
      <header>
        <h3>Add New Branch</h3>
        <button type="button" class="modal-close" @click="showBranchModal = false">x</button>
      </header>
      <form @submit.prevent="addBranch">
        <div class="form-group">
          <label>Branch Name</label>
          <input v-model.trim="branchForm.name" type="text" required placeholder="e.g. Matugga" />
        </div>
        <div class="form-group">
          <label>Location</label>
          <input v-model.trim="branchForm.location" type="text" required placeholder="e.g. Matugga Town" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showBranchModal = false">Cancel</button>
          <button type="submit" class="btn primary">Add Branch</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showUpdateUserModal" class="modal open">
    <div class="modal-content">
      <header>
        <h3>Update User Credentials</h3>
        <button type="button" class="modal-close" @click="showUpdateUserModal = false">x</button>
      </header>
      <form @submit.prevent="updateUser">
        <div class="form-group">
          <label>Email</label>
          <input v-model.trim="updateUserForm.email" type="email" placeholder="e.g. john@kgl.com" />
        </div>
        <div class="form-group">
          <label>New Password</label>
          <input v-model.trim="updateUserForm.password" type="password" placeholder="Temporary password" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showUpdateUserModal = false">Cancel</button>
          <button type="submit" class="btn primary">Update User</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="toast.show" :class="['toast', 'show', toast.type]">{{ toast.message }}</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

const auth = useAuthStore()

const users = ref([])
const branches = ref([])
const loading = ref(false)
const activeView = ref('users')
const userSearchText = ref('')
const branchSearchText = ref('')
const selectedUserId = ref('')

const showUserModal = ref(false)
const showBranchModal = ref(false)
const showUpdateUserModal = ref(false)

const userForm = reactive({
  fullName: '',
  email: '',
  role: 'Manager',
  branch: '',
  password: ''
})

const branchForm = reactive({
  name: '',
  location: ''
})

const updateUserForm = reactive({
  email: '',
  password: ''
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success'
})

function showToast(message, type = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

const filteredUsers = computed(() => {
  const query = userSearchText.value.toLowerCase()
  return users.value.filter((user) =>
    [user.fullName, user.role, user.branch, user.email]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')
      .includes(query)
  )
})

const filteredBranches = computed(() => {
  const query = branchSearchText.value.toLowerCase()
  return branches.value.filter((branch) =>
    [branch.name, branch.location, branch.manager]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')
      .includes(query)
  )
})

function authHeaders() {
  return { Authorization: `Bearer ${auth.token}` }
}

async function fetchData() {
  loading.value = true
  try {
    const [usersRes, branchesRes] = await Promise.all([
      apiFetch('/api/users', { headers: authHeaders() }),
      apiFetch('/api/branches', { headers: authHeaders() })
    ])

    if (usersRes.ok) {
      users.value = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
    }

    if (branchesRes.ok) {
      branches.value = Array.isArray(branchesRes.data) ? branchesRes.data : branchesRes.data?.data || []
    }
  } catch {
    showToast('Failed to load data', 'error')
  } finally {
    loading.value = false
  }
}

function openUserModal() {
  userForm.fullName = ''
  userForm.email = ''
  userForm.role = 'Manager'
  userForm.branch = ''
  userForm.password = ''
  showUserModal.value = true
}

function openBranchModal() {
  branchForm.name = ''
  branchForm.location = ''
  showBranchModal.value = true
}

function openUpdateUserModal(user) {
  selectedUserId.value = user?._id || ''
  updateUserForm.email = user?.email || ''
  updateUserForm.password = ''
  showUpdateUserModal.value = true
}

async function addUser() {
  const payload = {
    fullName: userForm.fullName,
    email: userForm.email,
    role: userForm.role,
    branch: userForm.branch,
    password: userForm.password
  }

  const res = await apiFetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    showToast(res.data?.message || 'Registration failed', 'error')
    return
  }

  showToast('User registered successfully')
  showUserModal.value = false
  await fetchData()
}

async function updateUser() {
  if (!selectedUserId.value) {
    showToast('No user selected', 'error')
    return
  }

  const payload = {}
  if (updateUserForm.email) payload.email = updateUserForm.email
  if (updateUserForm.password) payload.password = updateUserForm.password

  if (!payload.email && !payload.password) {
    showToast('Provide email or password to update', 'error')
    return
  }

  const res = await apiFetch(`/api/users/${selectedUserId.value}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    showToast(res.data?.message || 'Update failed', 'error')
    return
  }

  showToast('User updated successfully')
  showUpdateUserModal.value = false
  await fetchData()
}

async function addBranch() {
  const payload = {
    name: branchForm.name,
    location: branchForm.location
  }

  const res = await apiFetch('/api/branches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    showToast(res.data?.message || 'Failed to add branch', 'error')
    return
  }

  showToast('Branch added successfully')
  showBranchModal.value = false
  await fetchData()
}

async function deleteUser(id) {
  if (!window.confirm('Are you sure?')) return
  const res = await apiFetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  if (!res.ok) {
    showToast(res.data?.message || 'Error deleting user', 'error')
    return
  }
  showToast('User deleted')
  await fetchData()
}

function deleteBranch() {
  showToast('Delete functionality requires backend endpoint', 'error')
}

onMounted(fetchData)
</script>

<style scoped>
.toggle-container {
  display: flex;
  gap: 20px;
  margin-bottom: 25px;
}

.toggle-btn {
  flex: 1;
  padding: 15px;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background: #2c3e50;
  color: #fff;
}

.toggle-btn.active {
  background: #d4af37;
  color: #1a202c;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  gap: 10px;
}

.action-bar input {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.table-scroll {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.admin-table thead {
  background: #2c3e50;
  color: #d4af37;
}

.admin-table th,
.admin-table td {
  padding: 12px;
  text-align: left;
}

.admin-table tbody tr:nth-child(even) {
  background: #f9fafb;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn.primary {
  background: #2c3e50;
  color: #fff;
}

.btn.secondary {
  background: #95a5a6;
  color: #fff;
}

.btn.delete {
  background: #e53e3e;
  color: #fff;
}

.badge {
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: bold;
}

.badge.active {
  background: #c6f6d5;
  color: #22543d;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 25px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.modal-content header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #777;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #34495e;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.toast {
  min-width: 250px;
  color: #fff;
  text-align: center;
  border-radius: 4px;
  padding: 16px;
  position: fixed;
  z-index: 1100;
  right: 20px;
  top: 20px;
}

.toast.success {
  background-color: #2ecc71;
}

.toast.error {
  background-color: #e74c3c;
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
  }
}
</style>
