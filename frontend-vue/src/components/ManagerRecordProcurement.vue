<template>
  <section>
    <header class="topbar">
      <h3>Procure Produce</h3>
      <span>{{ branchLabel }}</span>
    </header>

    <section class="tabs">
      <button type="button" :class="{ active: activeTab === 'add' }" @click="activeTab = 'add'">Add Produce</button>
      <button type="button" :class="{ active: activeTab === 'view' }" @click="switchToView">View Procurements</button>
    </section>

    <section class="form-container">
      <form v-if="activeTab === 'add'" class="sale-form" @submit.prevent="submitProcurement">
        <h4>Record New Produce</h4>
        <div class="form-group"><label>Produce Name</label><input v-model.trim="form.name" type="text" /></div>
        <div class="form-group"><label>Type</label><input v-model.trim="form.type" type="text" /></div>
        <div class="form-group"><label>Date</label><input v-model="form.date" type="date" /></div>
        <div class="form-group"><label>Time</label><input v-model="form.time" type="time" /></div>
        <div class="form-group"><label>Tonnage (KG)</label><input v-model.number="form.tonnage" type="number" /></div>
        <div class="form-group"><label>Total Cost (UGX)</label><input v-model.number="form.cost" type="number" min="1" /></div>
        <div class="form-group"><label>Dealer Name</label><input v-model.trim="form.dealer" type="text" /></div>
        <div class="form-group"><label>Branch</label><input :value="auth.branch || ''" type="text" readonly /></div>
        <div class="form-group"><label>Contact</label><input v-model.trim="form.contact" type="tel" /></div>
        <div class="form-group"><label>Selling Price Per KG (UGX)</label><input v-model.number="form.sellingPricePerKg" type="number" min="1" /></div>
        <button class="submit-btn" type="submit">Add Produce</button>
      </form>

      <div v-else class="table-container">
        <div class="search-row">
          <input v-model="startDate" type="date" placeholder="From" aria-label="From Date" @change="onSearchInput" />
          <input v-model="endDate" type="date" placeholder="To" aria-label="To Date" @change="onSearchInput" />
          <input v-model.trim="searchText" type="search" placeholder="Search produce, dealer..." @input="onSearchInput" />
          <button class="reset-btn" type="button" @click="resetFilters">Reset</button>
          <button class="submit-btn" type="button" @click="printReport">Print Report</button>
        </div>
        <div class="table-scroll">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Date</th>
                <th>Tonnage (KG)</th>
                <th>Cost (UGX)</th>
                <th>Dealer</th>
                <th>Branch</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading"><td colspan="8">Loading procurements...</td></tr>
              <tr v-else-if="!rows.length"><td colspan="8">No procurements found for this branch.</td></tr>
              <tr v-for="(item, idx) in rows" :key="item._id || idx">
                <td>{{ item.produceName }}</td>
                <td>{{ item.produceType }}</td>
                <td>{{ formatDate(item.date) }}</td>
                <td>{{ Number(item.tonnage || 0).toLocaleString() }}</td>
                <td>{{ Number(item.cost || 0).toLocaleString() }}</td>
                <td>{{ item.dealerName }}</td>
                <td>{{ item.branch }}</td>
                <td>{{ item.contact }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div v-if="toast.show" :class="['toast', toast.type]">{{ toast.message }}</div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

const auth = useAuthStore()
const branchLabel = computed(() => `${auth.branch || 'Branch'} Branch`)

const activeTab = ref('add')
const searchText = ref('')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const rows = ref([])
let searchTimeout = null

const form = reactive({
  name: '',
  type: '',
  date: '',
  time: '',
  tonnage: '',
  cost: '',
  dealer: '',
  contact: '',
  sellingPricePerKg: ''
})

const toast = reactive({ show: false, message: '', type: 'success' })

const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/
const alphaRegex = /^[a-zA-Z ]{2,}$/
const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/

function showToast(message, type = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString()
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  searchText.value = ''
  fetchProcurements()
}

function resetForm() {
  form.name = ''
  form.type = ''
  form.date = ''
  form.time = ''
  form.tonnage = ''
  form.cost = ''
  form.dealer = ''
  form.contact = ''
  form.sellingPricePerKg = ''
}

async function submitProcurement() {
  const tonnage = Number(form.tonnage || 0)
  const cost = Number(form.cost || 0)
  const sellingPricePerKg = Number(form.sellingPricePerKg || 0)
  const costPerKg = tonnage > 0 ? Math.round(cost / tonnage) : 0

  const data = {
    produceName: form.name,
    produceType: form.type,
    date: form.date,
    tonnage,
    cost,
    dealerName: form.dealer,
    contact: form.contact,
    sellingPricePerKg,
    sellingPrice: sellingPricePerKg,
    costPerKg,
    branch: auth.branch,
    time: form.time
  }

  if (!data.produceName || !data.produceType || !data.date || !data.tonnage || !data.cost || !data.dealerName || !data.contact || !data.sellingPricePerKg) {
    showToast('All fields are required.', 'error')
    return
  }
  if (!alphaNumRegex.test(data.produceName)) return showToast('Invalid produce name (alphanumeric, >= 2 chars).', 'error')
  if (!alphaRegex.test(data.produceType)) return showToast('Invalid produce type (alphabetic, >= 2 chars).', 'error')
  if (parseInt(data.tonnage, 10) < 1000) return showToast('Tonnage must be at least 1000 KG.', 'error')
  if (String(data.cost).length < 5 || Number.isNaN(Number(data.cost))) return showToast('Total cost must be a number of at least 5 digits.', 'error')
  if (!alphaNumRegex.test(data.dealerName)) return showToast('Invalid dealer name (alphanumeric, >= 2 chars).', 'error')
  if (!ugPhoneRegex.test(data.contact)) return showToast('Please use a valid Ugandan phone number.', 'error')
  if (Number.isNaN(Number(data.sellingPricePerKg)) || Number(data.sellingPricePerKg) <= 0) return showToast('Please enter a valid selling price per KG.', 'error')

  const res = await apiFetch('/api/procurement/add', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    showToast(res.data?.message || 'Failed to record procurement.', 'error')
    return
  }

  showToast('Produce procured successfully!')
  resetForm()
  await fetchProcurements(searchText.value)
}

async function fetchProcurements(searchTerm = '') {
  loading.value = true
  let url = '/api/procurement'
  const params = new URLSearchParams()
  if (searchTerm) params.append('search', searchTerm)
  if (startDate.value) params.append('startDate', startDate.value)
  if (endDate.value) params.append('endDate', endDate.value)
  if (!searchTerm && !startDate.value && !endDate.value) params.append('limit', '5')

  const res = await apiFetch(`${url}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (!res.ok) {
    rows.value = []
    loading.value = false
    return
  }
  rows.value = res.data?.data || []
  loading.value = false
}

function switchToView() {
  activeTab.value = 'view'
  fetchProcurements(searchText.value)
}

function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchProcurements(searchText.value)
  }, 300)
}

async function printReport() {
  const params = new URLSearchParams()
  if (searchText.value) params.append('search', searchText.value)
  if (startDate.value) params.append('startDate', startDate.value)
  if (endDate.value) params.append('endDate', endDate.value)

  const url = `/api/procurement?${params.toString()}`
  const res = await apiFetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (!res.ok) return showToast('Could not fetch full report for printing.', 'error')
  const data = res.data?.data || []
  if (!data.length) return showToast('No data found to generate a report.', 'error')

  const rowsHtml = data
    .map((item) => `<tr><td>${item.produceName}</td><td>${item.produceType}</td><td>${formatDate(item.date)}</td><td>${Number(item.tonnage || 0).toLocaleString()}</td><td>${Number(item.cost || 0).toLocaleString()}</td><td>${item.dealerName}</td><td>${item.branch}</td><td>${item.contact}</td></tr>`)
    .join('')
  const html = `
    <html><head><title>Procurement Report</title></head>
    <body style="font-family:Segoe UI;padding:20px;">
      <h2>Karibu Groceries Ltd</h2><p>Procurement Report</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th>Name</th><th>Type</th><th>Date</th><th>Tonnage (KG)</th><th>Cost (UGX)</th><th>Dealer</th><th>Branch</th><th>Contact</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`
  const win = window.open('', '', 'width=1000,height=750')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
  }, 250)
}
</script>

<style scoped>
.topbar { background: #fff; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 20px; }
.tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.tabs button { flex: 1; padding: 10px 0; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; color: #fff; background: #2c3e50; }
.tabs button.active { background: #d4af37; color: #1a202c; }
.form-container { background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,.1); }
.sale-form { display: flex; flex-direction: column; gap: 15px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group input { padding: 10px; border-radius: 6px; border: 1px solid #ccc; }
.form-group input[readonly] { background: #ecf0f1; color: #7f8c8d; }
.submit-btn { padding: 12px; border-radius: 8px; border: none; background: #d4af37; color: #fff; font-weight: 700; cursor: pointer; }
.table-container { background: #fff; padding: 8px; border-radius: 10px; }
.search-row { display: flex; gap: 10px; margin-bottom: 12px; }
.search-row input { flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; }
.reset-btn { background: #7f8c8d; color: #fff; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.table-scroll { overflow-x: auto; }
.stock-table { width: 100%; border-collapse: collapse; }
.stock-table thead { background: #2c3e50; color: #d4af37; }
.stock-table th, .stock-table td { padding: 14px; text-align: left; }
.stock-table tbody tr:nth-child(even) { background: #f9fafb; }
.toast { min-width: 250px; color: #fff; text-align: center; border-radius: 4px; padding: 16px; position: fixed; z-index: 1100; right: 20px; top: 20px; }
.toast.success { background: #2ecc71; }
.toast.error { background: #e74c3c; }
</style>
