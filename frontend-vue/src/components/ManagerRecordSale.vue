<template>
  <section class="record-sale-root">
    <header class="topbar">
      <h3>Record Sale</h3>
      <span>{{ branchLabel }}</span>
    </header>

    <section class="sale-type-toggle">
      <button type="button" :class="{ active: activeSaleTab === 'cash' }" @click="activeSaleTab = 'cash'">Cash Sale</button>
      <button type="button" :class="{ active: activeSaleTab === 'credit' }" @click="activeSaleTab = 'credit'">Credit Sale</button>
    </section>

    <main class="form-container">
      <form v-if="activeSaleTab === 'cash'" class="sale-form" novalidate @submit.prevent="submitCash">
        <h4>Cash Sale</h4>

        <div class="form-group">
          <label>Produce Name</label>
          <select v-model="cashForm.produceName" required @change="onProduceChange('cash')">
            <option value="">Select Produce</option>
            <option
              v-for="item in produceOptions"
              :key="`cash-${item.name}`"
              :value="item.name"
              :disabled="item.remaining <= 0"
            >
              {{ item.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Available Stock (KG)</label>
          <input :value="cashAvailableStockDisplay" type="text" readonly />
        </div>

        <div class="form-group">
          <label>Tonnage (KG)</label>
          <input v-model.number="cashForm.tonnage" type="number" min="1" required @input="recalcCashAmount" />
        </div>

        <div class="form-group">
          <label>Amount Paid (UGX)</label>
          <input v-model.number="cashForm.amountPaid" type="number" min="1" required />
        </div>

        <div class="form-group">
          <label>Buyer's Name</label>
          <input v-model.trim="cashForm.buyerName" type="text" required />
        </div>

        <div class="form-group">
          <label>Recorded By</label>
          <input :value="agentName" type="text" readonly />
        </div>

        <div class="form-group">
          <label>Date</label>
          <input v-model="cashForm.date" type="date" required />
        </div>

        <button type="submit" class="submit-btn">Add Cash Sale to Cart</button>
      </form>

      <form v-else class="sale-form" novalidate @submit.prevent="submitCredit">
        <h4>Credit Sale</h4>

        <div class="form-group">
          <label>Buyer's Name</label>
          <input v-model.trim="creditForm.buyerName" type="text" required />
        </div>

        <div class="form-group">
          <label>National ID (NIN)</label>
          <input v-model.trim="creditForm.nationalId" type="text" required />
        </div>

        <div class="form-group">
          <label>Location</label>
          <input v-model.trim="creditForm.location" type="text" required />
        </div>

        <div class="form-group">
          <label>Contacts</label>
          <input v-model.trim="creditForm.contact" type="tel" required />
        </div>

        <div class="form-group">
          <label>Produce Name</label>
          <select v-model="creditForm.produceName" required @change="onProduceChange('credit')">
            <option value="">Select Produce</option>
            <option
              v-for="item in produceOptions"
              :key="`credit-${item.name}`"
              :value="item.name"
              :disabled="item.remaining <= 0"
            >
              {{ item.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Available Stock (KG)</label>
          <input :value="creditAvailableStockDisplay" type="text" readonly />
        </div>

        <div class="form-group">
          <label>Produce Type</label>
          <input v-model="creditForm.produceType" type="text" readonly />
        </div>

        <div class="form-group">
          <label>Tonnage (KG)</label>
          <input v-model.number="creditForm.tonnage" type="number" min="1" required @input="recalcCreditAmount" />
        </div>

        <div class="form-group">
          <label>Amount Due (UGX)</label>
          <input v-model.number="creditForm.amountDue" type="number" min="1" required />
        </div>

        <div class="form-group">
          <label>Recorded By</label>
          <input :value="agentName" type="text" readonly />
        </div>

        <div class="form-group">
          <label>Dispatch Date</label>
          <input v-model="creditForm.dispatchDate" type="date" required />
        </div>

        <div class="form-group">
          <label>Due Date</label>
          <input v-model="creditForm.dueDate" type="date" required />
        </div>

        <button type="submit" class="submit-btn">Add Credit Sale to Cart</button>
      </form>
    </main>

    <section v-if="cart.length" class="cart-section">
      <h4>Sales Cart</h4>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Item</th>
              <th>Qty (KG)</th>
              <th>Amount (UGX)</th>
              <th>Buyer</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in cart" :key="`${item.produceName}-${index}`">
              <td class="cap">{{ item.saleType }}</td>
              <td>{{ item.produceName }}</td>
              <td>{{ item.tonnage }}</td>
              <td>{{ Number(item.amountPaid || item.amountDue || 0).toLocaleString() }}</td>
              <td>{{ item.buyerName }}</td>
              <td><button class="btn-delete" type="button" @click="removeFromCart(index)">Remove</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="cart-footer">
        <strong>Total: UGX {{ cartTotal.toLocaleString() }}</strong>
        <button class="submit-btn" type="button" :disabled="processingCheckout" @click="processCheckout">
          {{ processingCheckout ? 'Processing...' : 'Complete Sale & Print Receipt' }}
        </button>
      </div>
    </section>

    <div v-if="toast.show" :class="['toast', 'show', toast.type]">{{ toast.message }}</div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'

const auth = useAuthStore()
const branch = auth.branch || ''
const agentName = auth.userName || auth.role || 'Manager'

const activeSaleTab = ref('cash')
const availableStock = ref([])
const cart = ref([])
const processingCheckout = ref(false)

const toast = reactive({ show: false, message: '', type: 'success' })

const today = new Date().toISOString().split('T')[0]

const cashForm = reactive({
  produceName: '',
  tonnage: '',
  amountPaid: '',
  buyerName: '',
  date: today
})

const creditForm = reactive({
  buyerName: '',
  nationalId: '',
  location: '',
  contact: '',
  produceName: '',
  produceType: '',
  tonnage: '',
  amountDue: '',
  dispatchDate: today,
  dueDate: ''
})

const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/
const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/
const ninRegex = /^(CM|CF)[A-Z0-9]{12}$/i

const branchLabel = computed(() => `${branch || 'Branch'} Branch`)

const produceOptions = computed(() =>
  availableStock.value.map((item) => {
    const remaining = Math.max(0, item.totalStock - getReservedInCart(item.name))
    return { ...item, remaining }
  })
)

const cartTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + Number(item.amountPaid || item.amountDue || 0), 0)
)
const cashAvailableStockDisplay = computed(() => getAvailableStockDisplay(cashForm.produceName))
const creditAvailableStockDisplay = computed(() => getAvailableStockDisplay(creditForm.produceName))

function showToast(message, type = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

function getReservedInCart(produceName) {
  return cart.value
    .filter((item) => item.produceName === produceName)
    .reduce((sum, item) => sum + Number(item.tonnage || 0), 0)
}

function selectedStockFor(name) {
  return availableStock.value.find((item) => item.name === name)
}

function getAvailableStockDisplay(produceName) {
  if (!produceName) return ''
  const item = produceOptions.value.find((stock) => stock.name === produceName)
  return String(Math.max(0, Number(item?.remaining || 0)))
}

function onProduceChange(type) {
  if (type === 'cash') {
    recalcCashAmount()
    return
  }
  const stockItem = selectedStockFor(creditForm.produceName)
  creditForm.produceType = stockItem?.type || ''
  recalcCreditAmount()
}

function recalcCashAmount() {
  const stockItem = selectedStockFor(cashForm.produceName)
  if (!stockItem || !cashForm.tonnage) return
  cashForm.amountPaid = Number(cashForm.tonnage) * Number(stockItem.sellingPricePerKg || 0)
}

function recalcCreditAmount() {
  const stockItem = selectedStockFor(creditForm.produceName)
  if (!stockItem || !creditForm.tonnage) return
  creditForm.amountDue = Number(creditForm.tonnage) * Number(stockItem.sellingPricePerKg || 0)
}

function isValidAmount(amount) {
  return !Number.isNaN(Number(amount)) && String(Math.trunc(Number(amount))).length >= 5
}

function resetCashForm() {
  cashForm.produceName = ''
  cashForm.tonnage = ''
  cashForm.amountPaid = ''
  cashForm.buyerName = ''
  cashForm.date = today
}

function resetCreditForm() {
  creditForm.buyerName = ''
  creditForm.nationalId = ''
  creditForm.location = ''
  creditForm.contact = ''
  creditForm.produceName = ''
  creditForm.produceType = ''
  creditForm.tonnage = ''
  creditForm.amountDue = ''
  creditForm.dispatchDate = today
  creditForm.dueDate = ''
}

function submitCash() {
  const stockItem = selectedStockFor(cashForm.produceName)
  const tonnage = Number(cashForm.tonnage || 0)

  if (!cashForm.produceName || !tonnage || !cashForm.amountPaid || !cashForm.buyerName || !cashForm.date) {
    showToast('All fields are required', 'error')
    return
  }
  if (tonnage <= 0) {
    showToast('Tonnage must be greater than 0', 'error')
    return
  }
  if (!isValidAmount(cashForm.amountPaid)) {
    showToast('Amount paid must be at least 5 digits', 'error')
    return
  }
  if (!alphaNumRegex.test(cashForm.buyerName)) {
    showToast('Buyer name must be at least 2 alphanumeric characters', 'error')
    return
  }
  if (!stockItem) {
    showToast('Selected produce is not available in stock', 'error')
    return
  }

  const remaining = stockItem.totalStock - getReservedInCart(cashForm.produceName)
  if (tonnage > remaining) {
    showToast(`Insufficient stock. Only ${remaining}kg available.`, 'error')
    return
  }

  cart.value.push({
    saleType: 'cash',
    branch,
    salesAgent: agentName,
    produceName: cashForm.produceName,
    tonnage,
    amountPaid: Number(cashForm.amountPaid),
    buyerName: cashForm.buyerName,
    date: cashForm.date,
    time: new Date().toLocaleTimeString('en-GB', { hour12: false })
  })

  showToast('Item added to cart')
  resetCashForm()
}

function submitCredit() {
  const stockItem = selectedStockFor(creditForm.produceName)
  const tonnage = Number(creditForm.tonnage || 0)
  const due = new Date(creditForm.dueDate)
  const dispatch = new Date(creditForm.dispatchDate || today)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  if (
    !creditForm.buyerName ||
    !creditForm.nationalId ||
    !creditForm.location ||
    !creditForm.contact ||
    !creditForm.amountDue ||
    !creditForm.produceName ||
    !tonnage ||
    !creditForm.dispatchDate ||
    !creditForm.dueDate
  ) {
    showToast('All fields are required', 'error')
    return
  }
  if (!alphaNumRegex.test(creditForm.buyerName)) {
    showToast('Buyer name must be at least 2 alphanumeric characters', 'error')
    return
  }
  if (!ninRegex.test(creditForm.nationalId)) {
    showToast('Invalid NIN format (use CM/CF + 12 characters)', 'error')
    return
  }
  if (!alphaNumRegex.test(creditForm.location)) {
    showToast('Location must be at least 2 alphanumeric characters', 'error')
    return
  }
  if (!ugPhoneRegex.test(creditForm.contact)) {
    showToast('Invalid Ugandan phone number', 'error')
    return
  }
  if (tonnage <= 0) {
    showToast('Tonnage must be greater than 0', 'error')
    return
  }
  if (!isValidAmount(creditForm.amountDue)) {
    showToast('Amount due must be at least 5 digits', 'error')
    return
  }
  if (due < todayDate) {
    showToast('Due date cannot be in the past', 'error')
    return
  }
  if (due <= dispatch) {
    showToast('Due date must be after dispatch date', 'error')
    return
  }
  if (!stockItem) {
    showToast('Selected produce is not available in stock', 'error')
    return
  }
  const remaining = stockItem.totalStock - getReservedInCart(creditForm.produceName)
  if (tonnage > remaining) {
    showToast(`Insufficient stock. Only ${remaining}kg available.`, 'error')
    return
  }

  cart.value.push({
    saleType: 'credit',
    branch,
    salesAgent: agentName,
    buyerName: creditForm.buyerName,
    nationalId: creditForm.nationalId,
    location: creditForm.location,
    contact: creditForm.contact,
    produceName: creditForm.produceName,
    produceType: creditForm.produceType || stockItem.type || '',
    tonnage,
    amountDue: Number(creditForm.amountDue),
    dispatchDate: creditForm.dispatchDate,
    dueDate: creditForm.dueDate,
    time: new Date().toLocaleTimeString('en-GB', { hour12: false })
  })

  showToast('Item added to cart')
  resetCreditForm()
}

function removeFromCart(index) {
  cart.value.splice(index, 1)
}

async function fetchStock() {
  const res = await apiFetch('/api/procurement', {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (!res.ok) {
    showToast('Failed to load stock data', 'error')
    return
  }

  const procurements = res.data?.data || []
  const stockMap = {}
  for (const item of procurements) {
    if (Number(item.stock || 0) <= 0) continue
    if (branch && item.branch !== branch) continue

    if (!stockMap[item.produceName]) {
      stockMap[item.produceName] = {
        name: item.produceName,
        type: item.produceType,
        totalStock: 0,
        sellingPricePerKg: Number((item.sellingPricePerKg ?? item.sellingPrice) || 0)
      }
    }
    stockMap[item.produceName].totalStock += Number(item.stock || 0)
  }

  availableStock.value = Object.values(stockMap)
}

async function processCheckout() {
  if (!cart.value.length) {
    showToast('Cart is empty', 'error')
    return
  }
  processingCheckout.value = true

  const successfulItems = []
  const failedItems = []

  for (const item of cart.value) {
    const endpoint = item.saleType === 'cash' ? '/api/sales/cash' : '/api/sales/credit'
    const res = await apiFetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    })
    if (res.ok) successfulItems.push(item)
    else failedItems.push(item.produceName)
  }

  if (successfulItems.length) {
    printBatchReceipt(successfulItems)
    cart.value = cart.value.filter((item) => !successfulItems.includes(item))
    await fetchStock()
    showToast(`Successfully recorded ${successfulItems.length} sale(s).`)
  }

  if (failedItems.length) {
    showToast(`Failed to record: ${failedItems.join(', ')}`, 'error')
  }

  processingCheckout.value = false
}

function printBatchReceipt(items) {
  const date = new Date().toLocaleDateString('en-GB')
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const buyerName = items[0]?.buyerName || 'N/A'
  let totalAmount = 0

  const rows = items
    .map((item) => {
      const amount = Number(item.amountPaid || item.amountDue || 0)
      totalAmount += amount
      return `<tr><td>${item.produceName}</td><td>${item.tonnage} KG</td><td>${item.saleType}</td><td>${amount.toLocaleString()}</td></tr>`
    })
    .join('')

  const taxAmount = totalAmount * 0.18
  const grandTotal = totalAmount + taxAmount
  const logoUrl = `${window.location.origin}/images/logo.png`

  const receiptHtml = `
    <html>
      <head><title>Sales Receipt</title></head>
      <body style="font-family:Segoe UI;padding:15px;">
        <div style="max-width:480px;margin:auto;background:#fff;padding:20px;border:1px solid #eee;border-radius:8px;">
          <div style="text-align:center;border-bottom:1px solid #eee;padding-bottom:10px;">
            <img src="${logoUrl}" alt="Karibu Groceries Logo" style="max-width:120px;max-height:60px;object-fit:contain;" />
            <h2 style="margin:6px 0;color:#2c3e50;">Karibu Groceries Ltd</h2>
            <p style="margin:0;color:#666;">Your Trusted Partner for Fresh Produce</p>
          </div>
          <p><strong>Date:</strong> ${date} ${time}</p>
          <p><strong>Branch:</strong> ${branch || 'N/A'}</p>
          <p><strong>Sold To:</strong> ${buyerName}</p>
          <p><strong>Sales Agent:</strong> ${agentName}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:10px;">
            <thead><tr><th style="text-align:left;border-bottom:1px solid #eee;">Item</th><th style="text-align:left;border-bottom:1px solid #eee;">Qty</th><th style="text-align:left;border-bottom:1px solid #eee;">Type</th><th style="text-align:left;border-bottom:1px solid #eee;">Amount (UGX)</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p><strong>Subtotal:</strong> UGX ${totalAmount.toLocaleString()}</p>
          <p><strong>VAT (18%):</strong> UGX ${taxAmount.toLocaleString()}</p>
          <p><strong>Total:</strong> UGX ${grandTotal.toLocaleString()}</p>
        </div>
      </body>
    </html>
  `

  const win = window.open('', '', 'width=520,height=760')
  if (!win) {
    showToast('Unable to open print window. Please allow popups.', 'error')
    return
  }
  win.document.open()
  win.document.write(receiptHtml)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
  }, 300)
}

watch(
  () => cashForm.tonnage,
  () => {
    if (activeSaleTab.value === 'cash') recalcCashAmount()
  }
)

watch(
  () => creditForm.tonnage,
  () => {
    if (activeSaleTab.value === 'credit') recalcCreditAmount()
  }
)

fetchStock()
</script>

<style scoped>
.record-sale-root {
  width: 100%;
  max-width: 980px;
}

.topbar {
  width: 100%;
  background: #fff;
  margin: 0 0 20px;
  padding: 15px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.sale-type-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.sale-type-toggle button {
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  color: #fff;
  background: #2c3e50;
}

.sale-type-toggle button.active {
  background: #d4af37;
  color: #1a202c;
}

.form-container {
  width: 100%;
  background: #fff;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.sale-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group input,
.form-group select {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 14px;
}

input[readonly] {
  background-color: #ecf0f1;
  color: #7f8c8d;
}

.submit-btn {
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: #d4af37;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.cart-section {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-top: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.table-scroll {
  overflow-x: auto;
}

.cart-section table {
  width: 100%;
  border-collapse: collapse;
}

.cart-section th,
.cart-section td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.cap {
  text-transform: capitalize;
}

.btn-delete {
  color: #d62828;
  border: none;
  background: none;
  cursor: pointer;
}

.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  gap: 8px;
  flex-wrap: wrap;
}

.toast {
  min-width: 250px;
  color: #fff;
  text-align: center;
  border-radius: 4px;
  padding: 16px;
  position: fixed;
  z-index: 1100;
  right: 20px;
  top: 20px;
}

.toast.success {
  background-color: #2ecc71;
}

.toast.error {
  background-color: #e74c3c;
}
</style>
