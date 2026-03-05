<template>
  <section class="main">
    <header class="topbar">
      <h3>Available Stock</h3>
      <span>{{ branchLabel }}</span>
    </header>

    <section class="table-container">
      <div class="search-row">
        <input v-model.trim="searchText" type="search" placeholder="Search produce or type..." />
        <button class="action-btn" type="button" @click="printStockReport(filteredStock)">Print Report</button>
      </div>

      <div class="table-scroll">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Produce</th>
              <th>Type</th>
              <th>Available (KG)</th>
              <th>Price (UGX)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredStock.length">
              <td colspan="6" style="text-align:center;">No stock available in this branch.</td>
            </tr>
            <tr v-for="item in filteredStock" :key="item.name">
              <td>{{ item.name }}</td>
              <td>{{ item.type }}</td>
              <td>{{ Number(item.quantity || 0).toLocaleString() }}</td>
              <td>{{ Number(item.price || 0).toLocaleString() }}</td>
              <td :style="{ color: statusColor(item.quantity), fontWeight: 'bold' }">{{ statusLabel(item.quantity) }}</td>
              <td><button class="action-btn sell" type="button" @click="$emit('sell')">Sell</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

defineEmits(['sell'])

const auth = useAuthStore()
const searchText = ref('')
const stockData = ref([])
const branchLabel = computed(() => `${auth.branch || 'Branch'} Branch`)

function statusLabel(quantity) {
  const q = Number(quantity || 0)
  if (q === 0) return 'Out of Stock'
  if (q < 50) return 'Low Stock'
  return 'Available'
}

function statusColor(quantity) {
  const q = Number(quantity || 0)
  if (q === 0) return 'red'
  if (q < 50) return 'orange'
  return 'green'
}

const filteredStock = computed(() => {
  const term = searchText.value.toLowerCase()
  return stockData.value.filter((item) => item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term))
})

async function fetchStock() {
  const res = await apiFetch('/api/procurement', { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) return
  const procurements = res.data?.data || []
  const stockMap = {}
  for (const item of procurements) {
    if (item.branch === auth.branch && Number(item.stock || 0) > 0) {
      if (!stockMap[item.produceName]) stockMap[item.produceName] = { name: item.produceName, type: item.produceType, quantity: 0, price: Number(item.sellingPrice || 0) }
      stockMap[item.produceName].quantity += Number(item.stock || 0)
    }
  }
  stockData.value = Object.values(stockMap)
}

function printStockReport(data) {
  const branch = auth.branch || 'N/A'
  const printDate = new Date().toLocaleDateString('en-GB')
  const rows = data.map((item) => `<tr><td>${item.name}</td><td>${item.type}</td><td>${Number(item.quantity || 0).toLocaleString()}</td><td>${Number(item.price || 0).toLocaleString()}</td><td>${statusLabel(item.quantity)}</td></tr>`).join('')
  const logo = `${window.location.origin}/images/logo.png`
  const html = `<html><head><title>Stock Report - ${branch}</title></head><body style="font-family:Segoe UI;padding:16px;"><div style="text-align:center;"><img src="${logo}" style="max-width:120px;max-height:60px;object-fit:contain;" /><h2>Karibu Groceries Ltd</h2><p>Available Stock Report</p></div><h3>Branch: ${branch}</h3><p>Date: ${printDate}</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th>Produce Name</th><th>Type</th><th>Quantity (KG)</th><th>Selling Price (UGX)</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No stock data available.</td></tr>'}</tbody></table></body></html>`
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) return
  win.document.write(html); win.document.close(); win.print()
}

fetchStock()
</script>

<style scoped>
.main { padding: 20px; }
.topbar { background: #fff; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 20px; }
.table-container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,.08); }
.search-row { display: flex; gap: 10px; margin-bottom: 12px; }
.search-row input { padding: 8px 10px; border-radius: 6px; border: 1px solid #ddd; width: 300px; }
.table-scroll { overflow-x: auto; }
.stock-table { width: 100%; border-collapse: collapse; }
.stock-table thead { background: #2c3e50; color: #d4af37; }
.stock-table th, .stock-table td { padding: 14px; text-align: left; }
.stock-table tbody tr:nth-child(even) { background: #f9fafb; }
.action-btn { padding: 5px 10px; background: #2c3e50; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.action-btn.sell { background: #d4af37; color: #1a202c; }
</style>
