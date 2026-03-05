<template>
  <div class="manager-layout">
    <aside :class="['manager-sidebar', { collapsed: sidebarCollapsed }]">
      <div class="manager-logo">
        <img src="/images/logo.png" alt="KGL Logo" />
        <button class="manager-toggle-btn" type="button" @click="toggleSidebar"><i class="fa-solid fa-bars"></i></button>
      </div>

      <nav>
        <a href="#" :class="{ active: activeTab === 'dashboard' }" @click.prevent="showDashboard"><i class="fa-solid fa-chart-line"></i><span>Dashboard</span></a>
        <a href="#" :class="{ active: activeTab === 'procure' }" @click.prevent="showProcureProduce">
          <i class="fa-solid fa-box"></i><span>Procure Produce</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'stock' }" @click.prevent="showStockManagement">
          <i class="fa-solid fa-warehouse"></i><span>Stock Management</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'record-sales' }" @click.prevent="showRecordSales">
          <i class="fa-solid fa-cart-shopping"></i><span>Record Sales</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'sales-report' }" @click.prevent="showSalesReport">
          <i class="fa-solid fa-credit-card"></i><span>Sales Report</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'settings' }" @click.prevent="showSettings"><i class="fa-solid fa-gear"></i><span>Settings</span></a>
        <a href="#" @click.prevent="logout"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>
      </nav>
    </aside>

    <main class="manager-main">
      <template v-if="activeTab === 'dashboard'">
        <header class="manager-topbar">
          <h3>Welcome, {{ auth.userName || 'Branch Manager' }}</h3>
          <span>{{ branchLabel }}</span>
        </header>

        <section class="manager-cards">
          <div class="manager-card">
            <h4>Produce Types</h4>
            <p>{{ totalProduce }}</p>
          </div>
          <div class="manager-card">
            <h4>Total Stock</h4>
            <p>{{ totalStock.toLocaleString() }} KG</p>
          </div>
          <div class="manager-card">
            <h4>Today's Sales</h4>
            <p>UGX {{ todaySales.toLocaleString() }}</p>
          </div>
          <div class="manager-card">
            <h4>Credit Due</h4>
            <p>UGX {{ creditDue.toLocaleString() }}</p>
          </div>
        </section>

        <section class="manager-charts">
          <div class="manager-chart-box">
            <h4>Stock Levels (KG)</h4>
            <canvas ref="stockCanvas"></canvas>
          </div>
          <div class="manager-chart-box">
            <h4>Weekly Sales (UGX)</h4>
            <canvas ref="salesCanvas"></canvas>
          </div>
        </section>
      </template>

      <section v-else-if="activeTab === 'settings'" class="manager-settings">
        <h3>Settings</h3>
        <p>This section is not migrated yet.</p>
      </section>
      <ManagerRecordSale v-else-if="activeTab === 'record-sales'" />
      <ManagerStockManagement v-else-if="activeTab === 'stock'" />
      <ManagerSalesReport v-else-if="activeTab === 'sales-report'" />
      <ManagerRecordProcurement v-else-if="activeTab === 'procure'" />

      <iframe v-else class="manager-frame" :src="legacySrc" title="Legacy Manager Page" />
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Chart } from 'chart.js/auto'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'
import ManagerRecordSale from '../components/ManagerRecordSale.vue'
import ManagerStockManagement from '../components/ManagerStockManagement.vue'
import ManagerSalesReport from '../components/ManagerSalesReport.vue'
import ManagerRecordProcurement from '../components/ManagerRecordProcurement.vue'

const router = useRouter()
const auth = useAuthStore()

const sidebarCollapsed = ref(false)
const activeTab = ref('dashboard')
const legacySrc = ref('/legacy/pages/managerDashboard.html')

const totalProduce = ref(0)
const totalStock = ref(0)
const todaySales = ref(0)
const creditDue = ref(0)

const stockCanvas = ref(null)
const salesCanvas = ref(null)
let stockChart = null
let salesChart = null

const branchLabel = computed(() => `${auth.branch || 'Branch'} Branch`)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function showDashboard() {
  activeTab.value = 'dashboard'
  nextTick(async () => {
    destroyCharts()
    initCharts()
    await fetchDashboardData()
  })
}

function showSettings() {
  activeTab.value = 'settings'
}

function showRecordSales() {
  activeTab.value = 'record-sales'
}

function showStockManagement() {
  activeTab.value = 'stock'
}

function showSalesReport() {
  activeTab.value = 'sales-report'
}

function showProcureProduce() {
  activeTab.value = 'procure'
}

function openLegacy(page, tab) {
  activeTab.value = tab
  legacySrc.value = `/legacy/pages/${page}`
}

function logout() {
  auth.clearAuth()
  router.push({ name: 'landing' })
}

function initCharts() {
  if (stockCanvas.value && !stockChart) {
    stockChart = new Chart(stockCanvas.value, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Stock (KG)', data: [], backgroundColor: '#2c3e50' }] },
      options: { responsive: true }
    })
  }

  if (salesCanvas.value && !salesChart) {
    salesChart = new Chart(salesCanvas.value, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{ label: 'Sales (UGX)', data: [], borderColor: '#2c3e50', tension: 0.4, fill: false }]
      },
      options: { responsive: true }
    })
  }
}

function destroyCharts() {
  if (stockChart) {
    stockChart.destroy()
    stockChart = null
  }
  if (salesChart) {
    salesChart.destroy()
    salesChart = null
  }
}

function updateCharts(stockEntries, weeklySalesData) {
  if (stockChart) {
    stockChart.data.labels = stockEntries.map((item) => item.name)
    stockChart.data.datasets[0].data = stockEntries.map((item) => item.stock)
    stockChart.update()
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  if (salesChart) {
    salesChart.data.labels = weekDays
    salesChart.data.datasets[0].data = weekDays.map((day) => weeklySalesData[day] || 0)
    salesChart.update()
  }
}

async function fetchDashboardData() {
  if (!auth.token) {
    router.push({ name: 'login' })
    return
  }

  const branch = auth.branch
  const headers = { Authorization: `Bearer ${auth.token}` }

  const [stockRes, salesRes] = await Promise.all([
    apiFetch('/api/procurement', { headers }),
    apiFetch('/api/sales', { headers })
  ])

  const stockMap = {}
  const produceSet = new Set()
  let stockSum = 0

  if (stockRes.ok) {
    const procurements = stockRes.data?.data || []
    for (const item of procurements) {
      if (item.branch === branch) {
        const stock = Number(item.stock || 0)
        if (stock > 0) {
          stockSum += stock
          produceSet.add(item.produceName)
        }
        stockMap[item.produceName] = (stockMap[item.produceName] || 0) + stock
      }
    }
  }

  totalProduce.value = produceSet.size
  totalStock.value = stockSum

  const weeklySalesData = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  const localToday = new Date().toLocaleDateString('en-CA')
  let todaysSalesTotal = 0
  let totalCreditDue = 0

  if (salesRes.ok) {
    const sales = (salesRes.data?.data || []).slice().sort((a, b) => {
      return new Date(a.date || a.dispatchDate) - new Date(b.date || b.dispatchDate)
    })

    for (const sale of sales) {
      if (!sale.branch || sale.branch === branch) {
        const effectiveDate = sale.date || sale.dispatchDate
        if (!effectiveDate) continue

        const saleDateStr = String(effectiveDate).includes('T') ? String(effectiveDate).split('T')[0] : String(effectiveDate)
        if (saleDateStr === localToday) {
          todaysSalesTotal += Number(sale.amount || 0)
        }

        if (sale.type === 'credit' && Number(sale.amountDue || 0) > 0) {
          totalCreditDue += Number(sale.amountDue || 0)
        }

        const dateObj = new Date(effectiveDate)
        if (Number.isNaN(dateObj.getTime())) continue
        const day = dateObj.toLocaleDateString('en-GB', { weekday: 'short' })
        if (Object.prototype.hasOwnProperty.call(weeklySalesData, day)) {
          weeklySalesData[day] += Number(sale.amount || 0)
        }
      }
    }
  }

  todaySales.value = todaysSalesTotal
  creditDue.value = totalCreditDue

  const stockEntries = Object.keys(stockMap).map((name) => ({ name, stock: stockMap[name] }))
  updateCharts(stockEntries, weeklySalesData)
}

onMounted(async () => {
  if (!auth.token) {
    router.push({ name: 'login' })
    return
  }
  initCharts()
  await fetchDashboardData()
})

onBeforeUnmount(() => {
  destroyCharts()
})
</script>

<style scoped>
.manager-layout {
  display: flex;
  min-height: 100vh;
  background: #f4f6f8;
}

.manager-sidebar {
  width: 250px;
  background: #2c3e50;
  color: #fff;
  padding: 20px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  align-self: flex-start;
  transition: width 0.3s ease;
}

.manager-sidebar.collapsed {
  width: 80px;
}

.manager-sidebar.collapsed nav span {
  display: none;
}

.manager-sidebar nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #d4af37;
  text-decoration: none;
  padding: 12px;
  margin: 8px 0;
  border-radius: 6px;
}

.manager-sidebar.collapsed nav a {
  justify-content: center;
}

.manager-sidebar nav a.active,
.manager-sidebar nav a:hover {
  background: rgba(255, 255, 255, 0.2);
}

.manager-logo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
}

.manager-logo img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  padding: 2px;
}

.manager-toggle-btn {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}

.manager-main {
  flex: 1;
  padding: 20px;
}

.manager-topbar {
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.manager-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.manager-card {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.manager-card h4 {
  color: #d4af37;
}

.manager-card p {
  font-weight: bold;
}

.manager-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.manager-chart-box {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
}

.manager-frame {
  width: 100%;
  height: calc(100vh - 40px);
  border: none;
}

.manager-settings {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
}

@media (max-width: 768px) {
  .manager-layout {
    flex-direction: column;
  }

  .manager-sidebar,
  .manager-sidebar.collapsed {
    width: 100%;
  }
}
</style>
