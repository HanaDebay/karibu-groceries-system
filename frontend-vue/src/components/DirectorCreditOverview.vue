<template>
  <section>
    <header class="topbar">
      <h3>Credit Overview</h3>
      <span>All Branches</span>
    </header>

    <section class="cards">
      <div class="card">
        <h4>Total Credit</h4>
        <p>UGX {{ totalCredit.toLocaleString() }}</p>
      </div>
      <div class="card">
        <h4>Overdue Amount</h4>
        <p>UGX {{ overdueAmount.toLocaleString() }}</p>
      </div>
      <div class="card">
        <h4>Pending Amount</h4>
        <p>UGX {{ pendingAmount.toLocaleString() }}</p>
      </div>
    </section>

    <section class="table-container">
      <div class="search-row">
        <input v-model.trim="searchText" type="search" placeholder="Search buyer, branch, agent..." />
        <button class="btn-print" type="button" @click="printCredits">Print</button>
      </div>

      <div class="table-scroll">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Branch</th>
              <th>Agent</th>
              <th>Produce</th>
              <th>Amount Due</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7">Loading credit sales...</td>
            </tr>
            <tr v-else-if="errorMessage">
              <td colspan="7">{{ errorMessage }}</td>
            </tr>
            <tr v-else-if="!filteredCredits.length">
              <td colspan="7">No credit sales found.</td>
            </tr>
            <tr
              v-for="(item, idx) in filteredCredits"
              v-else
              :key="`${item.buyer}-${item.branch}-${idx}`"
              :class="{ overdue: getStatus(item) === 'overdue' }"
            >
              <td>{{ item.buyer }}</td>
              <td>{{ item.branch }}</td>
              <td>{{ item.agent }}</td>
              <td>{{ item.produce }}</td>
              <td>UGX {{ Number(item.amountDue || 0).toLocaleString() }}</td>
              <td>{{ formatDate(item.dueDate) }}</td>
              <td>
                <span :class="['badge', badgeClass(item)]">{{ statusLabel(item) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

const auth = useAuthStore()

const creditData = ref([])
const searchText = ref('')
const loading = ref(false)
const errorMessage = ref('')

function getStatus(item) {
  const today = new Date()
  const due = new Date(item?.dueDate)
  const amountDue = Number(item?.amountDue || 0)

  if (amountDue === 0) return 'paid'
  if (!Number.isNaN(due.getTime()) && today > due) return 'overdue'
  return 'pending'
}

function statusLabel(item) {
  const status = getStatus(item)
  if (status === 'paid') return 'Paid'
  if (status === 'overdue') return 'Overdue'
  return 'Pending'
}

function badgeClass(item) {
  const status = getStatus(item)
  if (status === 'paid') return 'success'
  if (status === 'overdue') return 'danger'
  return 'warning'
}

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

const filteredCredits = computed(() => {
  const query = searchText.value.toLowerCase()
  if (!query) return creditData.value

  return creditData.value.filter((item) =>
    [item.buyer, item.branch, item.agent, item.produce, formatDate(item.dueDate)]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')
      .includes(query)
  )
})

const totalCredit = computed(() =>
  filteredCredits.value.reduce((sum, item) => sum + Number(item.amountDue || 0), 0)
)

const overdueAmount = computed(() =>
  filteredCredits.value.reduce((sum, item) => {
    return getStatus(item) === 'overdue' ? sum + Number(item.amountDue || 0) : sum
  }, 0)
)

const pendingAmount = computed(() =>
  filteredCredits.value.reduce((sum, item) => {
    return getStatus(item) === 'pending' ? sum + Number(item.amountDue || 0) : sum
  }, 0)
)

async function fetchCredits() {
  loading.value = true
  errorMessage.value = ''

  const headers = { Authorization: `Bearer ${auth.token}` }
  const response = await apiFetch('/api/sales/credit-overview', { headers })

  if (!response.ok) {
    errorMessage.value = 'Failed to load credit sales.'
    loading.value = false
    return
  }

  creditData.value = Array.isArray(response.data?.data) ? response.data.data : []
  loading.value = false
}

function printCredits() {
  if (!filteredCredits.value.length) return

  const rowsHtml = filteredCredits.value
    .map((item) => {
      return `
        <tr>
          <td>${item.buyer}</td>
          <td>${item.branch}</td>
          <td>${item.agent}</td>
          <td>${item.produce}</td>
          <td>UGX ${Number(item.amountDue || 0).toLocaleString()}</td>
          <td>${formatDate(item.dueDate)}</td>
          <td>${statusLabel(item)}</td>
        </tr>
      `
    })
    .join('')

  const printWindow = window.open('', '_blank', 'width=900,height=650')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>Credit Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #2c3e50; color: #d4af37; }
        </style>
      </head>
      <body>
        <h2>Credit Overview Report</h2>
        <table>
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Branch</th>
              <th>Agent</th>
              <th>Produce</th>
              <th>Amount Due</th>
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

onMounted(fetchCredits)
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.card {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.card h4 {
  color: #2c3e50;
}

.card p {
  font-weight: bold;
  color: #d4af37;
  margin-top: 10px;
}

.table-container {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
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
  width: 300px;
}

.btn-print {
  background: #2c3e50;
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

tr.overdue {
  background: #fff5f5 !important;
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
  background: #fed7d7;
  color: #742a2a;
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
    min-width: 800px;
  }
}
</style>
