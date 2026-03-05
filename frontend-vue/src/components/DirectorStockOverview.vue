<template>
  <section class="table-container">
    <header class="topbar">
      <h3>Stock Overview</h3>
      <span>All Branches</span>
    </header>

    <div class="search-row">
      <input v-model.trim="searchText" type="search" placeholder="Search produce, branch..." />
      <button class="btn-print" type="button" @click="printStock">Print</button>
    </div>

    <div class="table-scroll">
      <table class="stock-table">
        <thead>
          <tr>
            <th>Produce</th>
            <th>Type</th>
            <th>Branch</th>
            <th>Available (KG)</th>
            <th>Buying Price</th>
            <th>Selling Price</th>
            <th>Stock Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8">Loading stock...</td>
          </tr>
          <tr v-else-if="errorMessage">
            <td colspan="8">{{ errorMessage }}</td>
          </tr>
          <tr v-else-if="!filteredStock.length">
            <td colspan="8">No stock found.</td>
          </tr>
          <tr v-for="(item, idx) in filteredStock" :key="`${item.produce}-${item.branch}-${idx}`" :class="rowClass(item.quantity)">
            <td>{{ item.produce }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.branch }}</td>
            <td>{{ item.quantity }}</td>
            <td>UGX {{ Number(item.buyingPrice || 0).toLocaleString() }}</td>
            <td>UGX {{ Number(item.sellingPrice || 0).toLocaleString() }}</td>
            <td>UGX {{ Number(item.quantity * item.sellingPrice || 0).toLocaleString() }}</td>
            <td>
              <span :class="['badge', badgeClass(item.quantity)]">{{ statusLabel(item.quantity) }}</span>
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

const stock = ref([])
const searchText = ref('')
const loading = ref(false)
const errorMessage = ref('')

function getStatus(kg) {
  if (kg === 0) return 'out'
  if (kg < 1000) return 'low'
  return 'available'
}

function statusLabel(kg) {
  const status = getStatus(kg)
  if (status === 'available') return 'Available'
  if (status === 'low') return 'Low Stock'
  return 'Out of Stock'
}

function rowClass(kg) {
  const status = getStatus(kg)
  if (status === 'available') return ''
  return status
}

function badgeClass(kg) {
  const status = getStatus(kg)
  if (status === 'available') return 'success'
  if (status === 'low') return 'warning'
  return 'danger'
}

const filteredStock = computed(() => {
  const query = searchText.value.toLowerCase()
  if (!query) return stock.value
  return stock.value.filter((item) =>
    [item.produce, item.type, item.branch]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')
      .includes(query)
  )
})

async function fetchStockOverview() {
  loading.value = true
  errorMessage.value = ''

  const headers = { Authorization: `Bearer ${auth.token}` }
  const response = await apiFetch('/api/procurement', { headers })

  if (!response.ok) {
    errorMessage.value = 'Failed to load stock.'
    loading.value = false
    return
  }

  const procurements = Array.isArray(response.data?.data) ? response.data.data : []
  const grouped = new Map()

  for (const item of procurements) {
    const key = `${item.produceName}||${item.produceType}||${item.branch}`
    const tonnage = Number(item.tonnage || 0)
    const cost = Number(item.cost || 0)
    const sellingPrice = Number(item.sellingPrice || 0)
    const quantity = Number(item.stock || 0)

    if (!grouped.has(key)) {
      grouped.set(key, {
        produce: item.produceName,
        type: item.produceType,
        branch: item.branch,
        quantity: 0,
        totalTonnage: 0,
        totalCost: 0,
        totalSellingValue: 0
      })
    }

    const group = grouped.get(key)
    group.quantity += quantity
    group.totalTonnage += tonnage
    group.totalCost += cost
    group.totalSellingValue += sellingPrice * tonnage
  }

  stock.value = Array.from(grouped.values()).map((group) => {
    const buyingPrice = group.totalTonnage > 0 ? group.totalCost / group.totalTonnage : 0
    const sellingPrice = group.totalTonnage > 0 ? group.totalSellingValue / group.totalTonnage : 0
    return {
      produce: group.produce,
      type: group.type,
      branch: group.branch,
      quantity: Math.max(0, Math.round(group.quantity)),
      buyingPrice: Math.round(buyingPrice),
      sellingPrice: Math.round(sellingPrice)
    }
  })

  loading.value = false
}

function printStock() {
  if (!filteredStock.value.length) return

  const rowsHtml = filteredStock.value
    .map((item) => {
      const stockValue = item.quantity * item.sellingPrice
      return `
        <tr>
          <td>${item.produce}</td>
          <td>${item.type}</td>
          <td>${item.branch}</td>
          <td>${item.quantity}</td>
          <td>UGX ${Number(item.buyingPrice || 0).toLocaleString()}</td>
          <td>UGX ${Number(item.sellingPrice || 0).toLocaleString()}</td>
          <td>UGX ${Number(stockValue || 0).toLocaleString()}</td>
          <td>${statusLabel(item.quantity)}</td>
        </tr>
      `
    })
    .join('')

  const printWindow = window.open('', '_blank', 'width=900,height=650')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>Stock Overview Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #2c3e50; color: #d4af37; }
        </style>
      </head>
      <body>
        <h2>Stock Overview Report</h2>
        <table>
          <thead>
            <tr>
              <th>Produce</th>
              <th>Type</th>
              <th>Branch</th>
              <th>Available (KG)</th>
              <th>Buying Price</th>
              <th>Selling Price</th>
              <th>Stock Value</th>
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

onMounted(fetchStockOverview)
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

tr.low {
  background: #fffaf0 !important;
}

tr.out {
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
    min-width: 1000px;
  }
}
</style>
