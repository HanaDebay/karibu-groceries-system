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
        <div class="form-group"><label>Produce Name</label><select v-model="cashForm.produceName" required @change="onProduceChange('cash')"><option value="">Select Produce</option><option v-for="item in produceOptions" :key="`c-${item.name}`" :value="item.name" :disabled="item.remaining <= 0">{{ item.name }}</option></select></div>
        <div class="form-group"><label>Available Stock (KG)</label><input :value="cashAvailableStockDisplay" type="text" readonly /></div>
        <div class="form-group"><label>Tonnage (KG)</label><input v-model.number="cashForm.tonnage" type="number" min="1" required @input="recalcCashAmount" /></div>
        <div class="form-group"><label>Amount Paid (UGX)</label><input v-model.number="cashForm.amountPaid" type="number" min="1" required /></div>
        <div class="form-group"><label>Date</label><input v-model="cashForm.date" type="date" required /></div>
        <div class="form-group"><label>Time</label><input v-model="cashForm.time" type="time" required /></div>
        <div class="form-group"><label>Buyer Name</label><input v-model.trim="cashForm.buyerName" type="text" required /></div>
        <div class="form-group"><label>Sales Agent</label><input :value="agentName" type="text" readonly /></div>
        <button type="submit" class="submit-btn">Add to Cart</button>
      </form>

      <form v-else class="sale-form" novalidate @submit.prevent="submitCredit">
        <h4>Credit Sale</h4>
        <div class="form-group"><label>Sales Agent</label><input :value="agentName" type="text" readonly /></div>
        <div class="form-group"><label>Buyer Name</label><input v-model.trim="creditForm.buyerName" type="text" required /></div>
        <div class="form-group"><label>National ID (NIN)</label><input v-model.trim="creditForm.nationalId" type="text" required /></div>
        <div class="form-group"><label>Location</label><input v-model.trim="creditForm.location" type="text" required /></div>
        <div class="form-group"><label>Contact</label><input v-model.trim="creditForm.contact" type="tel" required /></div>
        <div class="form-group"><label>Produce Name</label><select v-model="creditForm.produceName" required @change="onProduceChange('credit')"><option value="">Select Produce</option><option v-for="item in produceOptions" :key="`k-${item.name}`" :value="item.name" :disabled="item.remaining <= 0">{{ item.name }}</option></select></div>
        <div class="form-group"><label>Available Stock (KG)</label><input :value="creditAvailableStockDisplay" type="text" readonly /></div>
        <div class="form-group"><label>Produce Type</label><input v-model="creditForm.produceType" type="text" readonly /></div>
        <div class="form-group"><label>Tonnage (KG)</label><input v-model.number="creditForm.tonnage" type="number" min="1" required @input="recalcCreditAmount" /></div>
        <div class="form-group"><label>Amount Due (UGX)</label><input v-model.number="creditForm.amountDue" type="number" min="1" required /></div>
        <div class="form-group"><label>Dispatch Date</label><input v-model="creditForm.dispatchDate" type="date" required /></div>
        <div class="form-group"><label>Due Date</label><input v-model="creditForm.dueDate" type="date" required /></div>
        <button type="submit" class="submit-btn">Add to Cart</button>
      </form>
    </main>

    <section v-if="cart.length" class="cart-section">
      <h4>Sale Items</h4>
      <table>
        <thead><tr><th>Produce</th><th>Qty (KG)</th><th>Amount</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="(item, index) in cart" :key="`${item.produceName}-${index}`">
            <td>{{ item.produceName }}</td>
            <td>{{ item.tonnage }}</td>
            <td>{{ Number(item.amountPaid || item.amountDue || 0).toLocaleString() }}</td>
            <td><button class="btn-delete" type="button" @click="removeFromCart(index)">Remove</button></td>
          </tr>
        </tbody>
      </table>
      <button class="submit-btn checkout" type="button" :disabled="processingCheckout" @click="processCheckout">
        {{ processingCheckout ? 'Processing...' : 'Complete Sale & Print Receipt' }}
      </button>
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
const agentName = auth.userName || 'Sales Agent'
const today = new Date().toISOString().split('T')[0]

const activeSaleTab = ref('cash')
const availableStock = ref([])
const cart = ref([])
const processingCheckout = ref(false)
const toast = reactive({ show: false, message: '', type: 'success' })

const cashForm = reactive({ produceName: '', tonnage: '', amountPaid: '', date: today, time: '', buyerName: '' })
const creditForm = reactive({ buyerName: '', nationalId: '', location: '', contact: '', produceName: '', produceType: '', tonnage: '', amountDue: '', dispatchDate: today, dueDate: '' })

const branchLabel = computed(() => `${branch || 'Branch'} Branch`)
const produceOptions = computed(() => availableStock.value.map((item) => ({ ...item, remaining: Math.max(0, item.totalStock - getReservedInCart(item.name)) })))
const cashAvailableStockDisplay = computed(() => getAvailableStockDisplay(cashForm.produceName))
const creditAvailableStockDisplay = computed(() => getAvailableStockDisplay(creditForm.produceName))

const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/
const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/
const ninRegex = /^(CM|CF)[A-Z0-9]{12}$/i

function showToast(message, type = 'success') {
  toast.show = true
  toast.message = message
  toast.type = type
  setTimeout(() => { toast.show = false }, 3000)
}

function getReservedInCart(name) {
  return cart.value.filter((i) => i.produceName === name).reduce((sum, i) => sum + Number(i.tonnage || 0), 0)
}

function selectedStock(name) {
  return availableStock.value.find((i) => i.name === name)
}

function getAvailableStockDisplay(produceName) {
  if (!produceName) return ''
  const item = produceOptions.value.find((stock) => stock.name === produceName)
  return String(Math.max(0, Number(item?.remaining || 0)))
}

function isValidAmount(amount) {
  return !Number.isNaN(Number(amount)) && String(Math.trunc(Number(amount))).length >= 5
}

function onProduceChange(type) {
  if (type === 'cash') recalcCashAmount()
  else {
    const item = selectedStock(creditForm.produceName)
    creditForm.produceType = item?.type || ''
    recalcCreditAmount()
  }
}

function recalcCashAmount() {
  const item = selectedStock(cashForm.produceName)
  if (!item || !cashForm.tonnage) return
  cashForm.amountPaid = Number(cashForm.tonnage) * Number(item.sellingPricePerKg || 0)
}

function recalcCreditAmount() {
  const item = selectedStock(creditForm.produceName)
  if (!item || !creditForm.tonnage) return
  creditForm.amountDue = Number(creditForm.tonnage) * Number(item.sellingPricePerKg || 0)
}

function submitCash() {
  const item = selectedStock(cashForm.produceName)
  const tonnage = Number(cashForm.tonnage || 0)
  if (!cashForm.produceName || !tonnage || !cashForm.amountPaid || !cashForm.buyerName) return showToast('All fields are required', 'error')
  if (tonnage <= 0) return showToast('Invalid tonnage, it must be greater than 0', 'error')
  if (!isValidAmount(cashForm.amountPaid)) return showToast('Amount paid must be at least 5 digits', 'error')
  if (!alphaNumRegex.test(cashForm.buyerName)) return showToast('Invalid buyer name', 'error')
  if (!item) return showToast('Selected produce is not available in stock', 'error')
  if (tonnage > item.totalStock - getReservedInCart(cashForm.produceName)) return showToast(`Insufficient stock. Only ${item.totalStock}kg available.`, 'error')

  cart.value.push({ ...cashForm, branch, salesAgent: agentName, saleType: 'cash' })
  showToast('Item added to cart')
  cashForm.produceName = ''; cashForm.tonnage = ''; cashForm.amountPaid = ''; cashForm.buyerName = ''; cashForm.date = today; cashForm.time = ''
}

function submitCredit() {
  const item = selectedStock(creditForm.produceName)
  const tonnage = Number(creditForm.tonnage || 0)
  const due = new Date(creditForm.dueDate); const dispatch = new Date(creditForm.dispatchDate); const now = new Date(); now.setHours(0,0,0,0)
  if (!creditForm.buyerName || !creditForm.nationalId || !creditForm.location || !creditForm.contact || !creditForm.amountDue || !creditForm.produceName || !creditForm.tonnage || !creditForm.dueDate || !creditForm.dispatchDate) return showToast('All fields are required', 'error')
  if (!alphaNumRegex.test(creditForm.buyerName)) return showToast('Invalid buyer name', 'error')
  if (!ninRegex.test(creditForm.nationalId)) return showToast('Invalid National ID (NIN)', 'error')
  if (!alphaNumRegex.test(creditForm.location)) return showToast('Invalid location', 'error')
  if (!ugPhoneRegex.test(creditForm.contact)) return showToast('Invalid phone number', 'error')
  if (!isValidAmount(creditForm.amountDue)) return showToast('Amount due must be at least 5 digits', 'error')
  if (due < now) return showToast('Due date cannot be in the past', 'error')
  if (due <= dispatch) return showToast('Due date must be after the dispatch date', 'error')
  if (!item) return showToast('Selected produce is not available in stock', 'error')
  if (tonnage > item.totalStock - getReservedInCart(creditForm.produceName)) return showToast(`Insufficient stock. Only ${item.totalStock}kg available.`, 'error')

  cart.value.push({ ...creditForm, branch, salesAgent: agentName, saleType: 'credit', time: new Date().toLocaleTimeString('en-GB', { hour12: false }) })
  showToast('Item added to cart')
  Object.assign(creditForm, { buyerName: '', nationalId: '', location: '', contact: '', produceName: '', produceType: '', tonnage: '', amountDue: '', dispatchDate: today, dueDate: '' })
}

function removeFromCart(index) {
  cart.value.splice(index, 1)
}

async function processCheckout() {
  if (!cart.value.length) return
  processingCheckout.value = true
  let successCount = 0
  const failed = []
  const itemsToPrint = [...cart.value]

  for (const item of cart.value) {
    const endpoint = item.saleType === 'cash' ? '/api/sales/cash' : '/api/sales/credit'
    const res = await apiFetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (res.ok) successCount += 1
    else failed.push(item.produceName)
  }

  if (successCount > 0) {
    printBatchReceipt(itemsToPrint)
    cart.value = []
    await fetchStock()
    showToast(`Successfully recorded ${successCount} sales.`)
  }
  if (failed.length) showToast(`Failed to record: ${failed.join(', ')}`, 'error')
  processingCheckout.value = false
}

function printBatchReceipt(items) {
  const date = new Date().toLocaleDateString('en-GB')
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const buyerName = items[0]?.buyerName || 'N/A'
  let subtotal = 0
  const rows = items.map((item) => {
    const amount = Number(item.amountPaid || item.amountDue || 0); subtotal += amount
    return `<tr><td>${item.produceName}</td><td>${item.tonnage} KG</td><td>${amount.toLocaleString()}</td></tr>`
  }).join('')
  const vat = subtotal * 0.18
  const total = subtotal + vat
  const html = `<html><head><title>Sales Receipt</title></head><body style="font-family:Segoe UI;padding:15px;"><div style="max-width:450px;margin:auto;background:#fff;padding:25px;border-radius:8px;"><h2>Karibu Groceries Ltd</h2><p>Date: ${date} ${time}</p><p>Branch: ${branch || 'N/A'}</p><p>Sold To: ${buyerName}</p><p>Sales Agent: ${agentName}</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: UGX ${subtotal.toLocaleString()}</p><p>VAT (18%): UGX ${vat.toLocaleString()}</p><p><strong>Total: UGX ${total.toLocaleString()}</strong></p></div></body></html>`
  const win = window.open('', '', 'width=500,height=750')
  if (!win) return
  win.document.open(); win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print() }, 250)
}

async function fetchStock() {
  const res = await apiFetch('/api/procurement', { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) return showToast('Failed to load stock data', 'error')
  const procurements = res.data?.data || []
  const map = {}
  for (const item of procurements) {
    if (item.branch === branch && Number(item.stock || 0) > 0) {
      if (!map[item.produceName]) map[item.produceName] = { name: item.produceName, type: item.produceType, totalStock: 0, sellingPricePerKg: Number((item.sellingPricePerKg ?? item.sellingPrice) || 0) }
      map[item.produceName].totalStock += Number(item.stock || 0)
    }
  }
  availableStock.value = Object.values(map)
}

watch(() => cashForm.tonnage, recalcCashAmount)
watch(() => creditForm.tonnage, recalcCreditAmount)

fetchStock()
</script>

<style scoped>
.record-sale-root { width: 100%; max-width: 900px; }
.topbar { width: 100%; background: #fff; margin: 20px 0; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; box-shadow: 0 5px 15px rgba(0,0,0,.1); }
.sale-type-toggle { display: flex; gap: 10px; width: 100%; margin-bottom: 20px; }
.sale-type-toggle button { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #2c3e50; color: #fff; font-weight: bold; cursor: pointer; }
.sale-type-toggle button.active { background: #d4af37; color: #1a202c; }
.form-container { width: 100%; background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,.1); }
.sale-form { display: flex; flex-direction: column; gap: 15px; }
.form-group { display: flex; flex-direction: column; }
.form-group input, .form-group select { padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; }
.submit-btn { padding: 12px; border-radius: 8px; border: none; background: #d4af37; color: #fff; font-weight: bold; cursor: pointer; }
.cart-section { width: 100%; margin-top: 20px; background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,.1); }
.cart-section table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
.cart-section th, .cart-section td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
.btn-delete { color: red; border: none; background: none; cursor: pointer; }
.checkout { width: 100%; background: #27ae60; }
.toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; color: #fff; border-radius: 6px; opacity: 0; transition: .3s; }
.toast.success { background: green; }
.toast.error { background: #e74c3c; }
.toast.show { opacity: 1; }
</style>
