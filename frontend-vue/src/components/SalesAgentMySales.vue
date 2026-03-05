<template>
  <main class="main">
    <header class="topbar">
      <h3>My Sales</h3>
      <span>{{ branchLabel }}</span>
    </header>

    <section class="table-container">
      <div class="report-controls">
        <button :class="{ active: currentView === 'cash' }" type="button" @click="currentView = 'cash'">Cash Sales</button>
        <button :class="{ active: currentView === 'credit' }" type="button" @click="currentView = 'credit'">Credit Sales</button>
      </div>

      <section class="search-row">
        <input v-model.trim="searchText" type="search" placeholder="Search by produce, buyer, or date..." />
      </section>

      <div class="table-scroll">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Produce</th>
              <th>KG Sold</th>
              <th>Buyer</th>
              <th>Outstanding (UGX)</th>
              <th v-show="currentView === 'credit'">Paid (UGX)</th>
              <th v-show="currentView === 'credit'">Total Credit (UGX)</th>
              <th v-show="currentView === 'credit'">Due Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredSales.length">
              <td colspan="10" style="text-align:center;">No {{ currentView }} sales found.</td>
            </tr>
            <tr v-for="sale in filteredSales" :key="sale._id">
              <td>{{ formatDate(sale.date || sale.dispatchDate) }}</td>
              <td>{{ sale.produceName }}</td>
              <td>{{ Number(sale.tonnage || 0).toLocaleString() }}</td>
              <td>{{ sale.buyerName }}</td>
              <td>{{ Number(getAmount(sale)).toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">{{ Number(getPaidAmount(sale)).toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">{{ Number(getTotalCredit(sale)).toLocaleString() }}</td>
              <td v-show="currentView === 'credit'">{{ sale.dueDate ? formatDate(sale.dueDate) : '-' }}</td>
              <td>
                <button class="print-btn" type="button" @click="printReceipt(sale)">Print</button>
                <button v-if="currentView === 'credit' && Number(getAmount(sale)) > 0" class="pay-btn" type="button" @click="openPaymentModal(sale)">Receive Payment</button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="2">TOTAL</th>
              <th>{{ totalKg.toLocaleString() }}</th>
              <th></th>
              <th>{{ totalAmount.toLocaleString() }}</th>
              <th v-show="currentView === 'credit'">{{ totalPaidAmount.toLocaleString() }}</th>
              <th v-show="currentView === 'credit'">{{ totalCreditAmount.toLocaleString() }}</th>
              <th v-show="currentView === 'credit'"></th>
              <th></th>
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
  </main>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

const auth = useAuthStore()
const allSales = ref([])
const currentView = ref('cash')
const searchText = ref('')
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

const branchLabel = computed(() => `${auth.branch || 'Branch'} Branch`)

function getAmount(sale) {
  if (sale.type === 'credit') return sale.amountDue || sale.amount || 0
  return sale.amountPaid || sale.amount || 0
}

function getPaidAmount(sale) {
  return sale.amountPaid || 0
}

function getTotalCredit(sale) {
  return sale.totalAmount || Number(getAmount(sale)) + Number(getPaidAmount(sale))
}

function showToast(message, type = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-GB')
}

const filteredSales = computed(() => {
  const term = searchText.value.toLowerCase()
  return allSales.value.filter((sale) => {
    const matchesType = sale.type === currentView.value
    const matchesSearch =
      String(sale.produceName || '').toLowerCase().includes(term) ||
      String(sale.buyerName || '').toLowerCase().includes(term) ||
      String(sale.date || sale.dispatchDate || '').toLowerCase().includes(term)
    return matchesType && matchesSearch
  })
})

const totalKg = computed(() => filteredSales.value.reduce((sum, sale) => sum + Number(sale.tonnage || 0), 0))
const totalAmount = computed(() => filteredSales.value.reduce((sum, sale) => sum + Number(getAmount(sale) || 0), 0))
const totalPaidAmount = computed(() => filteredSales.value.reduce((sum, sale) => sum + Number(getPaidAmount(sale) || 0), 0))
const totalCreditAmount = computed(() => filteredSales.value.reduce((sum, sale) => sum + Number(getTotalCredit(sale) || 0), 0))

function printReceipt(sale) {
  const branch = auth.branch || 'N/A'
  const agent = sale.salesAgent || auth.userName || 'N/A'
  const saleDate = formatDate(sale.date || sale.dispatchDate)
  const saleTime = sale.time || new Date(sale.date || sale.dispatchDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const isCredit = sale.type === 'credit'
  const amount = Number(getAmount(sale))
  const taxAmount = amount * 0.18
  const total = amount + taxAmount
  const logo = `${window.location.origin}/images/logo.png`
  const html = `<html><head><title>Sales Receipt</title></head><body style="font-family:Segoe UI;padding:15px;background:#f9f9f9;"><div style="max-width:450px;margin:auto;background:#fff;padding:25px;border-radius:8px;"><div style="text-align:center;"><img src="${logo}" style="max-width:120px;" /><h2>Karibu Groceries Ltd</h2><p>${isCredit ? 'Credit Sale Invoice' : 'Cash Sale Receipt'}</p></div><p><strong>Receipt No:</strong> ${sale._id}</p><p><strong>Date:</strong> ${saleDate} ${saleTime}</p><p><strong>Branch:</strong> ${sale.branch || branch}</p><p><strong>Sold To:</strong> ${sale.buyerName}</p><p><strong>Sales Agent:</strong> ${agent}</p><p><strong>Produce:</strong> ${sale.produceName}</p><p><strong>Tonnage:</strong> ${Number(sale.tonnage || 0)} KG</p><p><strong>Subtotal:</strong> UGX ${amount.toLocaleString()}</p><p><strong>VAT (18%):</strong> UGX ${taxAmount.toLocaleString()}</p><p><strong>Total:</strong> UGX ${total.toLocaleString()}</p>${isCredit ? `<p><strong>Due Date:</strong> ${formatDate(sale.dueDate)}</p>` : ''}</div></body></html>`
  const win = window.open('', '_blank', 'width=500,height=750')
  if (!win) return
  win.document.write(html); win.document.close(); win.print()
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

  await fetchMySales()
  closePaymentModal()
  showToast('Credit payment received successfully.')
}

async function fetchMySales() {
  const res = await apiFetch('/api/sales', { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) {
    allSales.value = []
    return
  }
  const data = res.data?.data || []
  allSales.value = data.filter((sale) => sale.salesAgent === auth.userName || sale.recordedBy === auth.userName).sort((a, b) => new Date(b.date || b.dispatchDate) - new Date(a.date || a.dispatchDate))
}

fetchMySales()
</script>

<style scoped>
.main { padding: 20px; }
.topbar { background: #fff; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 20px; }
.search-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.search-row input { padding: 8px 10px; border-radius: 6px; border: 1px solid #ddd; width: 300px; }
.table-container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,.08); overflow-x: auto; }
.report-controls { display: flex; justify-content: flex-start; margin-bottom: 20px; gap: 10px; }
.report-controls button { background: #2c3e50; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.report-controls button.active { background: #d4af37; color: #2c3e50; }
.table-scroll { overflow-x: auto; }
.stock-table { width: 100%; border-collapse: collapse; }
.stock-table thead { background: #2c3e50; color: #d4af37; }
.stock-table th, .stock-table td { padding: 14px; text-align: left; }
.stock-table tbody tr:nth-child(even) { background: #f9fafb; }
tfoot { background: #f4f6f8; font-weight: bold; }
.print-btn { padding: 5px 10px; background: #2c3e50; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.pay-btn { margin-left: 6px; padding: 5px 10px; background: #d4af37; color: #2c3e50; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
.pay-btn:hover { background: #2c3e50; color: #fff; }
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
</style>
