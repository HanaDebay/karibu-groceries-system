<template>
  <section>
    <header class="topbar">
      <h3>Stock Management</h3>
      <span>{{ branchLabel }}</span>
    </header>

    <section class="table-container">
      <div class="search-row">
        <input v-model.trim="searchText" type="search" placeholder="Search produce, type or branch..." @input="onSearchInput" />
        <button class="btn print" type="button" @click="printReport">Print Report</button>
      </div>

      <div class="table-scroll">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Produce</th>
              <th>Type</th>
              <th>Branch</th>
              <th>Available (KG)</th>
              <th>Price (UGX)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7">Loading...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="7">No stock records found.</td>
            </tr>
            <tr v-for="item in rows" :key="item._id">
              <td>{{ item.produceName }}</td>
              <td>{{ item.produceType }}</td>
              <td>{{ item.branch }}</td>
              <td>{{ Number(item.stock || 0).toLocaleString() }}</td>
              <td>{{ Number(item.sellingPrice || 0).toLocaleString() }}</td>
              <td><span :class="['badge', getStatus(item.stock).class]">{{ getStatus(item.stock).text }}</span></td>
              <td class="actions">
                <button class="btn edit" type="button" @click="openEdit(item)">Edit</button>
                <button class="btn delete" type="button" @click="openDelete(item)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <header>
          <h3>Edit Stock</h3>
          <button class="modal-close" type="button" @click="showEditModal = false">x</button>
        </header>
        <form @submit.prevent="saveEdit">
          <div class="form-row">
            <label>Produce</label>
            <input v-model.trim="editForm.produceName" type="text" required />
          </div>
          <div class="form-row">
            <label>Type</label>
            <input v-model.trim="editForm.produceType" type="text" />
          </div>
          <div class="form-row">
            <label>Original Tonnage (KG)</label>
            <input v-model.number="editForm.tonnage" type="number" min="1" required />
          </div>
          <div class="form-row">
            <label>Price (UGX)</label>
            <input v-model.number="editForm.sellingPrice" type="number" min="0" required />
          </div>
          <footer class="modal-actions">
            <button type="button" class="btn cancel" @click="showEditModal = false">Cancel</button>
            <button type="submit" class="btn edit">Save</button>
          </footer>
        </form>
      </div>
    </div>

    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <header>
          <h3>Confirm Delete</h3>
          <button class="modal-close" type="button" @click="showDeleteModal = false">x</button>
        </header>
        <p>{{ deleteMessage }}</p>
        <footer class="modal-actions">
          <button type="button" class="btn cancel" @click="showDeleteModal = false">Cancel</button>
          <button type="button" class="btn delete" @click="confirmDelete">Delete</button>
        </footer>
      </div>
    </div>

    <div v-if="toast.show" :class="['toast', toast.type]">{{ toast.message }}</div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

const auth = useAuthStore()
const searchText = ref('')
const rows = ref([])
const loading = ref(false)
let searchTimeout = null

const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedId = ref('')

const editForm = reactive({
  produceName: '',
  produceType: '',
  tonnage: 0,
  sellingPrice: 0
})

const deleteMessage = ref('Are you sure you want to delete this stock item?')

const toast = reactive({ show: false, message: '', type: 'success' })
const branchLabel = computed(() => `${auth.branch || 'Branch'} Branch`)

function showToast(message, type = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

function getStatus(stock) {
  const qty = Number(stock || 0)
  if (qty <= 0) return { text: 'Out of Stock', class: 'danger' }
  if (qty < 500) return { text: 'Low Stock', class: 'warning' }
  return { text: 'Available', class: 'success' }
}

async function fetchStock(searchTerm = '') {
  loading.value = true
  let url = '/api/procurement?'
  if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`
  else url += 'limit=10'

  const res = await apiFetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })

  if (!res.ok) {
    rows.value = []
    showToast(res.data?.message || 'Failed to fetch stock data.', 'error')
    loading.value = false
    return
  }

  rows.value = res.data?.data || []
  loading.value = false
}

function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchStock(searchText.value)
  }, 300)
}

function openEdit(item) {
  selectedId.value = item._id
  editForm.produceName = item.produceName || ''
  editForm.produceType = item.produceType || ''
  editForm.tonnage = Number(item.tonnage || 0)
  editForm.sellingPrice = Number(item.sellingPrice || 0)
  showEditModal.value = true
}

function openDelete(item) {
  selectedId.value = item._id
  deleteMessage.value = `Are you sure you want to delete the procurement record for "${item.produceName} (${item.produceType})"? This cannot be undone.`
  showDeleteModal.value = true
}

async function saveEdit() {
  const payload = {
    produceName: editForm.produceName,
    produceType: editForm.produceType,
    tonnage: Number(editForm.tonnage || 0),
    sellingPrice: Number(editForm.sellingPrice || 0)
  }
  const res = await apiFetch(`/api/procurement/${selectedId.value}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    showToast(res.data?.message || 'Failed to update record.', 'error')
    return
  }
  showToast('Procurement updated successfully!')
  showEditModal.value = false
  await fetchStock(searchText.value)
}

async function confirmDelete() {
  const res = await apiFetch(`/api/procurement/${selectedId.value}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (!res.ok) {
    showToast(res.data?.message || 'Failed to delete record.', 'error')
    return
  }
  showToast('Procurement deleted successfully!')
  showDeleteModal.value = false
  await fetchStock(searchText.value)
}

async function printReport() {
  const url = searchText.value ? `/api/procurement?search=${encodeURIComponent(searchText.value)}` : '/api/procurement'
  const res = await apiFetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (!res.ok) {
    showToast('Could not fetch full report data.', 'error')
    return
  }
  const printData = res.data?.data || []
  if (!printData.length) {
    showToast('No data found to generate a report.', 'error')
    return
  }

  const rowsHtml = printData
    .map((item) => {
      const status = getStatus(item.stock).text
      return `<tr><td>${item.produceName}</td><td>${item.produceType}</td><td>${item.branch}</td><td>${Number(item.stock || 0).toLocaleString()}</td><td>${Number(item.sellingPrice || 0).toLocaleString()}</td><td>${status}</td></tr>`
    })
    .join('')

  const now = new Date()
  const meta = `Branch: ${auth.branch || 'N/A'} | Date: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  const html = `
    <html><head><title>Stock Management Report</title></head>
    <body style="font-family:Segoe UI;padding:20px;">
      <h2>Karibu Groceries Ltd</h2>
      <p>Stock Management Report</p>
      <p>${meta}</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th>Produce</th><th>Type</th><th>Branch</th><th>Available (KG)</th><th>Price (UGX)</th><th>Status</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>
  `
  const win = window.open('', '', 'width=950,height=700')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
  }, 300)
}

fetchStock()
</script>

<style scoped>
.topbar { background: #fff; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 20px; }
.table-container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,.08); }
.search-row { display: flex; gap: 10px; margin-bottom: 12px; }
.search-row input { flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; }
.table-scroll { overflow-x: auto; }
.stock-table { width: 100%; border-collapse: collapse; }
.stock-table thead { background: #2c3e50; color: #d4af37; }
.stock-table th, .stock-table td { padding: 14px; text-align: left; }
.stock-table tbody tr:nth-child(even) { background: #f9fafb; }
.actions { display: flex; gap: 8px; }
.btn { border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #fff; }
.btn.edit { background: #3498db; }
.btn.delete { background: #e74c3c; }
.btn.print { background: #16a085; white-space: nowrap; }
.btn.cancel { background: #95a5a6; }
.badge { padding: 6px 12px; border-radius: 14px; font-size: 12px; font-weight: bold; }
.badge.success { background: #c6f6d5; color: #22543d; }
.badge.warning { background: #fefcbf; color: #744210; }
.badge.danger { background: #fed7d7; color: #742a2a; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: #fff; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%; }
.modal-content header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.form-row { margin-bottom: 15px; display: flex; flex-direction: column; gap: 5px; }
.form-row input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.toast { min-width: 250px; color: #fff; text-align: center; border-radius: 4px; padding: 16px; position: fixed; z-index: 1100; right: 20px; top: 20px; }
.toast.success { background-color: #2ecc71; }
.toast.error { background-color: #e74c3c; }
</style>
