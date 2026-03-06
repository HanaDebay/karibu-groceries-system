<template>
  <section>
    <header class="topbar">
      <h3>Sales Report - Branch Manager</h3>
      <span>{{ branchLabel }}</span>
    </header>

    <section class="report-controls">
      <div class="buttons">
        <button :class="{ active: currentView === 'cash' }" type="button" @click="currentView = 'cash'">Cash Sales</button>
        <button :class="{ active: currentView === 'credit' }" type="button" @click="currentView = 'credit'">Credit Sales</button>
      </div>
      <div class="search-box">
        <input v-model="startDate" type="date" placeholder="From Date" aria-label="From Date" />
        <input v-model="endDate" type="date" placeholder="To Date" aria-label="To Date" />
        <input v-model.trim="searchText" type="text" placeholder="Search by Buyer or Produce..." />
        <button class="reset-btn" @click="resetFilters">Reset</button>
      </div>
    </section>

    <section class="report-table">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Produce Name</th>
              <th>Tonnage (KG)</th>
              <th>Buyer Name</th>
              <th>{{ currentView === 'cash' ? 'Amount Paid (UGX)' : 'Outstanding (UGX)' }}</th>
              <th v-show="currentView === 'credit'">Paid (UGX)</th>
              <th v-show="currentView === 'credit'">Total Credit (UGX)</th>
              <th v-show="currentView === 'credit'">Status</th>
              <th v-show="currentView === 'credit'">Due Date</th>
              <th>Recorded By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="numColumns">Loading sales data...</td>
            </tr>
            <tr v-else-if="!filteredSales.length">
              <td :colspan="numColumns">No {{ currentView }} sales found.</td>
            </tr>
            <tr v-for="(sale, idx) in filteredSales" :key="`${sale._id || idx}-${sale.date || sale.dispatchDate}`">
              <td>{{ formatDate(sale.date || sale.dispatchDate) }}</td>
              <td>{{ sale.produceName || '-' }}</td>
              <td>{{ Number(sale.tonnage || 0).toLocaleString() }}</td>
              <td>{{ sale.buyerName || '-' }}</td>
              <td>{{ Number(getAmount(sale)).toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">{{ Number(getPaidAmount(sale)).toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">{{ Number(getTotalCredit(sale)).toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">
                <span :class="['badge', getStatusClass(sale)]">{{ getStatusLabel(sale) }}</span>
              </td>
              <td v-show="currentView === 'credit'">{{ sale.dueDate ? formatDate(sale.dueDate) : '-' }}</td>
              <td>{{ sale.salesAgent || sale.recordedBy || '-' }}</td>
              <td>
                <button class="print-btn" type="button" @click="printSaleReceipt(sale)">Print</button>
                <button v-if="currentView === 'credit' && Number(getAmount(sale)) > 0" class="pay-btn" type="button" @click="openPaymentModal(sale)">Receive Payment</button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="2">TOTALS:</td>
              <td>{{ totalTonnage.toLocaleString() }}</td>
              <td></td> <!-- For Buyer Name -->
              <td>{{ totalAmount.toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">{{ totalPaidAmount.toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">{{ totalCreditAmount.toLocaleString() }}</td>
              <td v-show="currentView === 'credit'"></td> <!-- For Status -->
              <td v-show="currentView === 'credit'"></td> <!-- For Due Date -->
              <td></td> <!-- For Recorded By -->
              <td></td> <!-- For Action -->
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <div v-if="paymentModal.show" class="modal-backdrop" @click.self="closePaymentModal">
      <div class="payment-modal">
        <h4>Receive Credit Payment</h4>
        <p><strong>Buyer:</strong> {{ paymentModal.buyerName }}</p>
        <p><strong>Outstanding:</strong> UGX {{ Number(paymentModal.outstanding || 0).toLocaleString() }}</p>

        <div class="modal-group">
          <label>Amount (UGX)</label>
          <input v-model.number="paymentModal.amount" type="number" min="1" />
        </div>
        <div class="modal-group">
          <label>Method</label>
          <select v-model="paymentModal.method">
            <option value="cash">Cash</option>
            <option value="mobile-money">Mobile Money</option>
            <option value="bank-transfer">Bank Transfer</option>
          </select>
        </div>
        <div class="modal-group">
          <label>Payment Date</label>
          <input v-model="paymentModal.paidOn" type="date" />
        </div>
        <div class="modal-group">
          <label>Note (Optional)</label>
          <textarea v-model.trim="paymentModal.note" rows="2"></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="closePaymentModal">Cancel</button>
          <button type="button" class="btn-submit" :disabled="paymentModal.submitting" @click="submitPayment">
            {{ paymentModal.submitting ? 'Saving...' : 'Submit Payment' }}
          </button>
        </div>
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
const branchLabel = computed(() => `${auth.branch || 'Branch'} Branch`)

const salesData = ref([])
const loading = ref(false)
const currentView = ref('cash')
const searchText = ref('')
const startDate = ref('')
const endDate = ref('')
const toast = reactive({ show: false, message: '', type: 'success' })
const paymentModal = reactive({
  show: false,
  saleId: '',
  buyerName: '',
  outstanding: 0,
  amount: '',
  method: 'cash',
  paidOn: new Date().toISOString().split('T')[0],
  note: '',
  submitting: false
})

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB')
}

function getAmount(sale) {
  if ((sale.type || currentView.value) === 'credit') return sale.amountDue ?? sale.amount ?? 0
  return sale.amountPaid ?? sale.amount ?? 0
}

function getPaidAmount(sale) {
  return sale.amountPaid ?? 0
}

function getTotalCredit(sale) {
  return sale.totalAmount ?? Number(getAmount(sale)) + Number(getPaidAmount(sale))
}

function getStatusLabel(sale) {
  const due = Number(getAmount(sale) || 0)
  const paid = Number(getPaidAmount(sale) || 0)
  if (due <= 0) return 'Paid'
  
  if (sale.dueDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueD = new Date(sale.dueDate)
    dueD.setHours(0, 0, 0, 0)
    if (dueD < today) return 'Overdue'
  }

  if (paid > 0) return 'Partially Paid'
  return 'Pending'
}

function getStatusClass(sale) {
  const status = getStatusLabel(sale)
  if (status === 'Paid') return 'success'
  if (status === 'Overdue') return 'danger'
  if (status === 'Partially Paid') return 'warning'
  return 'warning'
}

function showToast(message, type = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  searchText.value = ''
}

const numColumns = computed(() => (currentView.value === 'credit' ? 11 : 7))

const filteredSales = computed(() => {
  const query = searchText.value.toLowerCase()
  const start = startDate.value ? new Date(startDate.value) : null
  const end = endDate.value ? new Date(endDate.value) : null

  if (start) start.setHours(0, 0, 0, 0)
  if (end) end.setHours(23, 59, 59, 999)

  return salesData.value.filter((sale) => {
    const typeOk = sale.type === currentView.value
    const buyer = String(sale.buyerName || '').toLowerCase()
    const produce = String(sale.produceName || '').toLowerCase()
    const agent = String(sale.salesAgent || sale.recordedBy || '').toLowerCase()
    const searchOk = buyer.includes(query) || produce.includes(query) || agent.includes(query)
    
    let dateOk = true
    if (start || end) {
      const saleDateStr = sale.date || sale.dispatchDate
      const saleDate = saleDateStr ? new Date(saleDateStr) : null
      
      // Check transaction date
      let transactionDateOk = false
      if (saleDate) {
        transactionDateOk = (!start || saleDate >= start) && (!end || saleDate <= end)
      }

      // For credit sales, also check due date as requested
      let dueDateOk = false
      if (currentView.value === 'credit' && sale.dueDate) {
        const dDate = new Date(sale.dueDate)
        dueDateOk = (!start || dDate >= start) && (!end || dDate <= end)
      }

      // If it's credit view, match either date. If cash, match transaction date.
      dateOk = currentView.value === 'credit' ? (transactionDateOk || dueDateOk) : transactionDateOk
    }

    return typeOk && searchOk && dateOk
  })
})

const totalTonnage = computed(() =>
  filteredSales.value.reduce((sum, sale) => sum + Number(sale.tonnage || 0), 0)
)

const totalAmount = computed(() =>
  filteredSales.value.reduce((sum, sale) => sum + Number(getAmount(sale) || 0), 0)
)

const totalPaidAmount = computed(() =>
  filteredSales.value.reduce((sum, sale) => sum + Number(getPaidAmount(sale) || 0), 0)
)

const totalCreditAmount = computed(() =>
  filteredSales.value.reduce((sum, sale) => sum + Number(getTotalCredit(sale) || 0), 0)
)

async function fetchSales() {
  loading.value = true
  const res = await apiFetch('/api/sales', {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (res.ok) salesData.value = res.data?.data || []
  else salesData.value = []
  loading.value = false
}

function openPaymentModal(sale) {
  const outstanding = Number(getAmount(sale) || 0)
  if (outstanding <= 0) {
    showToast('This credit sale is already fully paid.', 'error')
    return
  }
  paymentModal.show = true
  paymentModal.saleId = sale._id
  paymentModal.buyerName = sale.buyerName || '-'
  paymentModal.outstanding = outstanding
  paymentModal.amount = ''
  paymentModal.method = 'cash'
  paymentModal.paidOn = new Date().toISOString().split('T')[0]
  paymentModal.note = ''
}

function closePaymentModal() {
  paymentModal.show = false
  paymentModal.submitting = false
}

async function submitPayment() {
  const amount = Number(paymentModal.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Payment amount must be greater than 0.', 'error')
    return
  }
  if (amount > Number(paymentModal.outstanding || 0)) {
    showToast('Payment cannot exceed outstanding amount.', 'error')
    return
  }

  paymentModal.submitting = true
  const res = await apiFetch(`/api/sales/credit/${paymentModal.saleId}/payment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      method: paymentModal.method,
      paidOn: paymentModal.paidOn,
      note: paymentModal.note
    })
  })

  if (!res.ok) {
    paymentModal.submitting = false
    showToast(res.data?.message || 'Failed to receive payment.', 'error')
    return
  }

  await fetchSales()
  closePaymentModal()
  showToast('Credit payment received successfully.')
}

function printSaleReceipt(sale) {
  const receiptBranch = sale.branch || auth.branch || 'N/A'
  const formattedDate = formatDate(sale.date || sale.dispatchDate)
  const formattedTime = sale.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const amount = Number(getAmount(sale))
  const amountLabel = (sale.type || currentView.value) === 'credit' ? 'Amount Due' : 'Amount Paid'
  const logoUrl = `${window.location.origin}/images/logo.png`

  const receiptHtml = `
    <html><head><title>Sale Receipt</title></head>
    <body style="font-family:Segoe UI;padding:15px;background:#f9f9f9;">
      <div style="max-width:460px;margin:auto;background:#fff;padding:20px;border-radius:8px;">
        <div style="text-align:center;border-bottom:2px solid #f0f0f0;padding-bottom:10px;margin-bottom:14px;">
          <img src="${logoUrl}" alt="Karibu Groceries Logo" style="max-width:120px;max-height:60px;object-fit:contain;" />
          <h2 style="margin:3px 0;color:#2c3e50;">Karibu Groceries Ltd</h2>
          <p style="margin:0;font-size:12px;color:#666;">Sale Receipt</p>
        </div>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${formattedTime}</p>
        <p><strong>Branch:</strong> ${receiptBranch}</p>
        <p><strong>Sale Type:</strong> ${sale.type || currentView.value}</p>
        <p><strong>Buyer:</strong> ${sale.buyerName || '-'}</p>
        <p><strong>Produce:</strong> ${sale.produceName || '-'}</p>
        <p><strong>Produce Type:</strong> ${sale.produceType || '-'}</p>
        <p><strong>Tonnage:</strong> ${sale.tonnage || 0} KG</p>
        <p><strong>Sales Agent:</strong> ${sale.salesAgent || sale.recordedBy || '-'}</p>
        <p><strong>${amountLabel}:</strong> UGX ${amount.toLocaleString()}</p>
      </div>
    </body></html>
  `

  const win = window.open('', '', 'width=520,height=760')
  if (!win) return
  win.document.open()
  win.document.write(receiptHtml)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
  }, 250)
}

fetchSales()
</script>

<style scoped>
.topbar { background: #fff; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,.1); color: #2c3e50; }
.report-controls { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.buttons button { background: #2c3e50; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-right: 8px; }
.buttons button.active { background: #d4af37; color: #2c3e50; }
.search-box { display: flex; gap: 10px; }
.search-box input { padding: 10px 15px; border-radius: 6px; border: 1px solid #ccc; }
.reset-btn { background: #7f8c8d; color: #fff; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.table-scroll { overflow-x: auto; }
.report-table table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,.1); }
.report-table th, .report-table td { padding: 12px; text-align: left; }
.report-table th { background: #2c3e50; color: #fff; font-weight: 600; }
.report-table tr:nth-child(even) { background: #f2f2f2; }
.print-btn { padding: 5px 10px; background: #2c3e50; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.pay-btn { margin-left: 6px; padding: 5px 10px; background: #d4af37; color: #2c3e50; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
.pay-btn:hover { background: #2c3e50; color: #fff; }
.totals-row { font-weight: bold; background-color: #f8f9fa; }
.badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge.success { background: #d1fae5; color: #065f46; }
.badge.warning { background: #fef3c7; color: #92400e; }
.badge.danger { background: #fee2e2; color: #991b1b; }
.toast { min-width: 250px; color: #fff; text-align: center; border-radius: 4px; padding: 14px; position: fixed; z-index: 1100; right: 20px; top: 20px; }
.toast.success { background: #2ecc71; }
.toast.error { background: #e74c3c; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
.payment-modal { width: 100%; max-width: 460px; background: #fff; border-radius: 10px; padding: 18px; box-shadow: 0 12px 32px rgba(0,0,0,.2); }
.modal-group { display: flex; flex-direction: column; gap: 6px; margin: 10px 0; }
.modal-group input, .modal-group select, .modal-group textarea { border: 1px solid #ccc; border-radius: 6px; padding: 10px; font-size: 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.btn-cancel { border: 1px solid #cbd5e1; background: #fff; color: #334155; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
.btn-submit { border: none; background: #27ae60; color: #fff; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
@media (max-width:768px) { .report-controls { flex-direction: column; align-items: flex-start; } .search-box input { width: 100%; } }
</style>
