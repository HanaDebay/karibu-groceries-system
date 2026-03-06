<template>
  <section class="table-container">
    <header class="topbar">
      <h3>Sales Overview</h3>
      <span>All Branches</span>
    </header>

    <div class="search-row">
      <input v-model="startDate" type="date" aria-label="From Date" />
      <input v-model="endDate" type="date" aria-label="To Date" />
      <input v-model.trim="searchText" type="search" placeholder="Search produce, agent, branch..." />
      <button class="btn-reset" type="button" @click="resetFilters">Reset</button>
      <button class="btn-print" type="button" @click="printSales">Print</button>
    </div>

    <div class="table-scroll">
      <table class="stock-table">
        <thead>
          <tr>
            <th>Produce</th>
            <th>Sale Date</th>
            <th>Branch</th>
            <th>Agent</th>
            <th>Sale Type</th>
            <th>Quantity (KG)</th>
            <th>Amount (UGX)</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9">Loading sales...</td>
          </tr>
          <tr v-else-if="errorMessage">
            <td colspan="9">{{ errorMessage }}</td>
          </tr>
          <tr v-else-if="!filteredSales.length">
            <td colspan="9">No sales found.</td>
          </tr>
          <tr v-for="(item, idx) in filteredSales" :key="`${item.date}-${item.branch}-${idx}`">
            <td>{{ item.produce }}</td>
            <td>{{ formatDate(item.date) }}</td>
            <td>{{ item.branch }}</td>
            <td>{{ item.agent }}</td>
            <td>
              <span :class="['badge', String(item.saleType).toLowerCase() === 'cash' ? 'success' : 'warning']">
                {{ item.saleType }}
              </span>
            </td>
            <td>{{ item.quantity }}</td>
            <td>UGX {{ Number(item.amount || 0).toLocaleString() }}</td>
            <td>{{ item.dueDate ? formatDate(item.dueDate) : '-' }}</td>
            <td>
              <span :class="['badge', getBadgeClass(item.status)]">
                {{ item.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

const auth = useAuthStore()

const sales = ref([])
const searchText = ref('')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const errorMessage = ref('')

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function getBadgeClass(status) {
  const s = String(status).toLowerCase()
  if (s === 'paid') return 'success'
  if (s === 'overdue') return 'danger'
  return 'warning'
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  searchText.value = ''
}

const filteredSales = computed(() => {
  const query = searchText.value.toLowerCase()
  const start = startDate.value ? new Date(startDate.value) : null
  const end = endDate.value ? new Date(endDate.value) : null

  if (start) start.setHours(0, 0, 0, 0)
  if (end) end.setHours(23, 59, 59, 999)

  return sales.value.filter((item) => {
    const itemDate = item.date ? new Date(item.date) : null
    let dateMatch = true

    if (start || end) {
      if (!itemDate) {
        dateMatch = false
      } else {
        if (start && itemDate < start) dateMatch = false
        if (end && itemDate > end) dateMatch = false
      }
    }

    const searchableText = [
      item.produce,
      item.type,
      item.branch,
      item.agent,
      item.saleType,
      item.status,
      formatDate(item.date),
      formatDate(item.dueDate)
    ]
      .map((v) => String(v || '').toLowerCase())
      .join(' ')

    return dateMatch && (!query || searchableText.includes(query))
  })
})

async function fetchSalesOverview() {
  loading.value = true
  errorMessage.value = ''

  const headers = { Authorization: `Bearer ${auth.token}` }
  const response = await apiFetch('/api/sales/director-overview', { headers })

  if (!response.ok) {
    errorMessage.value = 'Failed to load sales.'
    loading.value = false
    return
  }

  sales.value = Array.isArray(response.data?.data) ? response.data.data : []
  loading.value = false
}

function printSales() {
  if (!filteredSales.value.length) return

  const rowsHtml = filteredSales.value
    .map(
      (item) => `
      <tr>
        <td>${item.produce}</td>
        <td>${formatDate(item.date)}</td>
        <td>${item.branch}</td>
        <td>${item.agent}</td>
        <td>${item.saleType}</td>
        <td>${item.quantity}</td>
        <td>UGX ${Number(item.amount || 0).toLocaleString()}</td>
        <td>${item.dueDate ? formatDate(item.dueDate) : '-'}</td>
        <td>${item.status}</td>
      </tr>
    `
    )
    .join('')

  const printWindow = window.open('', '_blank', 'width=900,height=650')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>Sales Overview Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #2c3e50; color: #d4af37; }
        </style>
      </head>
      <body>
        <h2>Sales Overview Report</h2>
        <table>
          <thead>
            <tr>
              <th>Produce</th>
              <th>Sale Date</th>
              <th>Branch</th>
              <th>Agent</th>
              <th>Sale Type</th>
              <th>Quantity (KG)</th>
              <th>Amount (UGX)</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

onMounted(fetchSalesOverview)
</script>

<style scoped>
.table-container {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.topbar {
  background: #fff;
  padding: 15px 0;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.search-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 10px;
}

.search-row input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
  flex: 1;
}

.btn-print {
  background: #2c3e50;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-reset {
  background: #7f8c8d;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.table-scroll {
  overflow-x: auto;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
}

.stock-table thead {
  background: #2c3e50;
  color: #d4af37;
}

.stock-table th,
.stock-table td {
  padding: 14px;
  text-align: left;
}

.stock-table tbody tr:nth-child(even) {
  background: #f9fafb;
}

.badge {
  padding: 6px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: bold;
}

.badge.success {
  background: #c6f6d5;
  color: #22543d;
}

.badge.warning {
  background: #fefcbf;
  color: #744210;
}

.badge.danger {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 768px) {
  .search-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-row input {
    width: 100%;
  }

  .stock-table {
    min-width: 900px;
  }
}
</style>
