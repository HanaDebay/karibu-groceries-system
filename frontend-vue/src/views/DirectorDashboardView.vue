<template>
  <div class="director-layout">
    <aside :class="['sidebar', { collapsed: sidebarCollapsed }]">
      <div class="logo">
        <img src="/images/logo.png" alt="KGL Logo" />
        <button class="toggle-btn" type="button" @click="toggleSidebar"><i class="fa-solid fa-bars"></i></button>
      </div>

      <nav>
        <a href="#" :class="{ active: activeTab === 'dashboard' }" @click.prevent="showDashboard">
          <i class="fa-solid fa-chart-pie"></i><span>Dashboard</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'sales' }" @click.prevent="showSalesOverview">
          <i class="fa-solid fa-coins"></i><span>Sales Overview</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'stock' }" @click.prevent="showStockOverview">
          <i class="fa-solid fa-warehouse"></i><span>Stock Overview</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'credit' }" @click.prevent="showCreditOverview">
          <i class="fa-solid fa-credit-card"></i><span>Credit Overview</span>
        </a>
        <a href="#" :class="{ active: activeTab === 'admin' }" @click.prevent="showAdministration">
          <i class="fa-solid fa-user-gear"></i><span>Administration</span>
        </a>
        <a href="#" @click.prevent="logout"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>
      </nav>
    </aside>

    <main class="main">
      <template v-if="activeTab === 'dashboard'">
        <header class="topbar">
          <h3>Welcome, Director</h3>
          <span>{{ auth.userName || 'Director' }}</span>
        </header>

        <section class="cards">
          <div class="card">
            <h4>Total Stock</h4>
            <p>{{ totalStockLabel }}</p>
          </div>
          <div class="card">
            <h4>Total Sales</h4>
            <p>{{ totalSalesLabel }}</p>
          </div>
          <div class="card">
            <h4>Credit Outstanding</h4>
            <p>{{ creditOutstandingLabel }}</p>
          </div>
          <div class="card">
            <h4>Active Branches</h4>
            <p>{{ activeBranches }}</p>
          </div>
        </section>

        <section class="charts">
          <div class="chart-box">
            <h4>Sales by Branch (UGX)</h4>
            <canvas ref="branchSalesCanvas"></canvas>
          </div>
          <div class="chart-box">
            <h4>Stock Distribution (KG)</h4>
            <canvas ref="stockDistributionCanvas"></canvas>
          </div>
        </section>
      </template>

      <DirectorSalesOverview v-else-if="activeTab === 'sales'" />
      <DirectorStockOverview v-else-if="activeTab === 'stock'" />
      <DirectorCreditOverview v-else-if="activeTab === 'credit'" />
      <DirectorAdministration v-else-if="activeTab === 'admin'" />

      <iframe
        v-else
        class="legacy-frame"
        :src="legacySrc"
        title="Legacy Director Page"
      />
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Chart } from 'chart.js/auto'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'
import DirectorSalesOverview from '../components/DirectorSalesOverview.vue'
import DirectorStockOverview from '../components/DirectorStockOverview.vue'
import DirectorCreditOverview from '../components/DirectorCreditOverview.vue'
import DirectorAdministration from '../components/DirectorAdministration.vue'

const router = useRouter()
const auth = useAuthStore()

const sidebarCollapsed = ref(false)
const activeTab = ref('dashboard')
const legacySrc = ref('/legacy/pages/directorDashboard.html')

const totalStock = ref(0)
const totalSales = ref(0)
const creditOutstanding = ref(0)
const activeBranches = ref(0)

const branchSalesCanvas = ref(null)
const stockDistributionCanvas = ref(null)
let branchSalesChart = null
let stockDistributionChart = null

const totalStockLabel = computed(() => `${Number(totalStock.value || 0).toLocaleString()} KG`)
const totalSalesLabel = computed(() => `UGX ${Number(totalSales.value || 0).toLocaleString()}`)
const creditOutstandingLabel = computed(() => `UGX ${Number(creditOutstanding.value || 0).toLocaleString()}`)

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

function showSalesOverview() {
  activeTab.value = 'sales'
}

function showStockOverview() {
  activeTab.value = 'stock'
}

function showCreditOverview() {
  activeTab.value = 'credit'
}

function showAdministration() {
  activeTab.value = 'admin'
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
  if (branchSalesCanvas.value && !branchSalesChart) {
    branchSalesChart = new Chart(branchSalesCanvas.value, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{ label: 'Sales (UGX)', data: [], backgroundColor: '#2c3e50' }]
      },
      options: { responsive: true }
    })
  }

  if (stockDistributionCanvas.value && !stockDistributionChart) {
    stockDistributionChart = new Chart(stockDistributionCanvas.value, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: ['#2c3e50', '#8e44ad', '#16a085', '#f39c12', '#c0392b', '#2980b9']
          }
        ]
      },
      options: { responsive: true }
    })
  }
}

function destroyCharts() {
  if (branchSalesChart) {
    branchSalesChart.destroy()
    branchSalesChart = null
  }
  if (stockDistributionChart) {
    stockDistributionChart.destroy()
    stockDistributionChart = null
  }
}

async function fetchDashboardData() {
  if (!auth.token) {
    router.push({ name: 'login' })
    return
  }

  const headers = { Authorization: `Bearer ${auth.token}` }

  const [summaryRes, procurementRes, branchRes] = await Promise.all([
    apiFetch('/api/sales/director-summary', { headers }),
    apiFetch('/api/procurement', { headers }),
    apiFetch('/api/branches', { headers })
  ])

  if (summaryRes.ok) {
    const summary = summaryRes.data?.data || {}
    totalSales.value = Number(summary.totalSales || 0)
    creditOutstanding.value = Number(summary.creditOutstanding || 0)
    const salesByBranch = Array.isArray(summary.salesByBranch) ? summary.salesByBranch : []

    if (branchSalesChart) {
      branchSalesChart.data.labels = salesByBranch.map((item) => item.branch)
      branchSalesChart.data.datasets[0].data = salesByBranch.map((item) => Number(item.totalRevenue || 0))
      branchSalesChart.update()
    }
  }

  if (procurementRes.ok) {
    const procurements = procurementRes.data?.data || []
    let stockSum = 0
    const stockMap = {}

    for (const item of procurements) {
      const stock = Number(item.stock || 0)
      if (stock > 0) {
        stockSum += stock
        stockMap[item.produceName] = (stockMap[item.produceName] || 0) + stock
      }
    }

    totalStock.value = stockSum

    if (stockDistributionChart) {
      stockDistributionChart.data.labels = Object.keys(stockMap)
      stockDistributionChart.data.datasets[0].data = Object.values(stockMap)
      stockDistributionChart.update()
    }
  }

  if (branchRes.ok) {
    const branches = branchRes.data?.data || []
    activeBranches.value = branches.filter((item) => item.status === 'Active').length
  }
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
