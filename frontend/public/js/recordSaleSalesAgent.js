// ===== Toast =====
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===== Toggle Forms =====
const cashBtn = document.getElementById("cashBtn");
const creditBtn = document.getElementById("creditBtn");
const cashForm = document.getElementById("cashSaleForm");
const creditForm = document.getElementById("creditSaleForm");

cashBtn.onclick = () => {
  cashForm.classList.remove("hidden");
  creditForm.classList.add("hidden");
  cashBtn.classList.add("active");
  creditBtn.classList.remove("active");
};

creditBtn.onclick = () => {
  creditForm.classList.remove("hidden");
  cashForm.classList.add("hidden");
  creditBtn.classList.add("active");
  cashBtn.classList.remove("active");
};

// ===== State =====
let availableStock = [];
let cart = [];
const token = localStorage.getItem("token");
const branch = localStorage.getItem("branch");
const userName = localStorage.getItem("userName") || "Sales Agent";

// ===== Validation =====
const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/;
const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/;
const ninRegex = /^(CM|CF)[A-Z0-9]{12}$/i;

function isValidAmount(amount) {
  return !Number.isNaN(Number(amount)) && String(Math.trunc(Number(amount))).length >= 5;
}

function getReservedInCart(produceName) {
  // Reserve quantities in cart to stop overselling before checkout is submitted.
  return cart
    .filter((item) => item.produceName === produceName)
    .reduce((sum, item) => sum + Number(item.tonnage || 0), 0);
}

function setDefaults() {
  document.querySelectorAll(".agent-name").forEach((input) => {
    input.value = userName;
  });

  const today = new Date().toISOString().split("T")[0];
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today;
  });

  const branchLabel = document.querySelector(".topbar span");
  if (branch && branchLabel) {
    branchLabel.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${branch} Branch`;
  }
}

function selectedStock(name) {
  return availableStock.find((item) => item.name === name);
}

function updateAvailableStockForForm(form) {
  if (!form) return;
  const select = form.querySelector('select[name="produceName"]');
  const input = form.querySelector('input[name="availableStock"]');
  if (!select || !input) return;

  const productName = select.value;
  if (!productName) {
    input.value = "";
    return;
  }

  const stockItem = selectedStock(productName);
  const remaining = stockItem ? Math.max(0, Number(stockItem.totalStock || 0) - getReservedInCart(productName)) : 0;
  input.value = String(remaining);
}

async function fetchStock() {
  try {
    const response = await fetch('/api/procurement', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to fetch stock");

    const resData = await response.json();
    const procurements = resData.data || [];

    const stockMap = {};
    procurements.forEach((item) => {
      if (item.branch !== branch || Number(item.stock || 0) <= 0) return;
      if (!stockMap[item.produceName]) {
        // Aggregate by produce and keep one unit-price-per-KG for amount calculations.
        stockMap[item.produceName] = {
          name: item.produceName,
          type: item.produceType,
          totalStock: 0,
          sellingPricePerKg: Number(item.sellingPricePerKg ?? item.sellingPrice ?? 0)
        };
      }
      stockMap[item.produceName].totalStock += Number(item.stock || 0);
    });

    availableStock = Object.values(stockMap);
    populateProduceSelects();
    updateAvailableStockForForm(cashForm);
    updateAvailableStockForForm(creditForm);
  } catch (error) {
    console.error("Error fetching stock:", error);
    showToast("Failed to load stock data", "error");
  }
}

function populateProduceSelects() {
  document.querySelectorAll(".produce-select").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Produce</option>';

    availableStock.forEach((item) => {
      const remaining = Math.max(0, Number(item.totalStock || 0) - getReservedInCart(item.name));
      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = item.name;
      option.dataset.price = String(item.sellingPricePerKg || 0);
      option.dataset.type = item.type || "";
      option.dataset.remaining = String(remaining);
      option.disabled = remaining <= 0;
      select.appendChild(option);
    });

    if (currentValue) select.value = currentValue;

    if (!select.dataset.bound) {
      // Bind only once so repopulating options does not duplicate listeners.
      select.addEventListener("change", (e) => {
        const form = e.target.closest("form");
        if (!form) return;
        const selected = e.target.options[e.target.selectedIndex];

        const typeInput = form.querySelector('input[name="produceType"]');
        if (typeInput) typeInput.value = selected?.dataset?.type || "";

        updateAvailableStockForForm(form);

        const price = Number(selected?.dataset?.price || 0);
        const tonnageInput = form.querySelector('input[name="tonnage"]');
        const amountInput = form.querySelector('input[name="amountPaid"], input[name="amountDue"]');
        if (tonnageInput && amountInput) {
          const recalc = () => {
            if (!tonnageInput.value || !price) return;
            amountInput.value = String(Number(tonnageInput.value) * price);
          };
          tonnageInput.oninput = recalc;
          recalc();
        }
      });
      select.dataset.bound = "true";
    }
  });
}

function addToCart(item) {
  cart.push(item);
  updateCartUI();
  populateProduceSelects();
  updateAvailableStockForForm(cashForm);
  updateAvailableStockForForm(creditForm);
  showToast("Item added to cart");
}

function updateCartUI() {
  const cartSection = document.getElementById('cartSection');
  const tbody = document.getElementById('cartTableBody');
  if (!cartSection || !tbody) return;

  if (!cart.length) {
    cartSection.style.display = 'none';
    tbody.innerHTML = '';
    return;
  }

  cartSection.style.display = 'block';
  tbody.innerHTML = '';

  cart.forEach((item, index) => {
    const amount = Number(item.amountPaid || item.amountDue || 0);
    tbody.innerHTML += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${item.produceName}</td>
        <td style="padding: 10px;">${item.tonnage}</td>
        <td style="padding: 10px;">${amount.toLocaleString()}</td>
        <td style="padding: 10px;"><button onclick="removeFromCart(${index})" style="color: red; border: none; background: none; cursor: pointer;"><i class="fa-solid fa-trash"></i></button></td>
      </tr>
    `;
  });
}

window.removeFromCart = (index) => {
  cart.splice(index, 1);
  updateCartUI();
  populateProduceSelects();
  updateAvailableStockForForm(cashForm);
  updateAvailableStockForForm(creditForm);
};

cashForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(cashForm).entries());
  data.branch = branch;
  data.salesAgent = userName;
  data.saleType = 'cash';

  const stockItem = selectedStock(data.produceName);

  if (!data.produceName || !data.tonnage || !data.amountPaid || !data.buyerName || !data.date) {
    return showToast("All fields are required", "error");
  }
  if (Number(data.tonnage) <= 0) {
    return showToast("Invalid tonnage, it must be greater than 0", "error");
  }
  if (!isValidAmount(data.amountPaid)) {
    return showToast("Amount paid must be at least 5 digits", "error");
  }
  if (!alphaNumRegex.test(data.buyerName)) {
    return showToast("Invalid buyer name", "error");
  }
  if (!stockItem) {
    return showToast("Selected produce is not available in stock", "error");
  }

  const remaining = Number(stockItem.totalStock || 0) - getReservedInCart(data.produceName);
  if (Number(data.tonnage) > remaining) {
    return showToast(`Insufficient stock. Only ${remaining}kg available.`, "error");
  }

  addToCart(data);
  cashForm.reset();
  setDefaults();
  updateAvailableStockForForm(cashForm);
});

creditForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(creditForm).entries());
  data.branch = branch;
  data.salesAgent = userName;
  data.saleType = 'credit';
  data.time = new Date().toLocaleTimeString('en-GB', { hour12: false });

  const stockItem = selectedStock(data.produceName);
  if (stockItem && !data.produceType) data.produceType = stockItem.type;

  const dispatch = new Date(data.dispatchDate || new Date());
  const due = new Date(data.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!data.buyerName || !data.nationalId || !data.location || !data.contact || !data.amountDue || !data.produceName || !data.tonnage || !data.dueDate || !data.dispatchDate) {
    return showToast("All fields are required", "error");
  }
  if (!alphaNumRegex.test(data.buyerName)) {
    return showToast("Invalid buyer name", "error");
  }
  if (!ninRegex.test(data.nationalId)) {
    return showToast("Invalid National ID (NIN)", "error");
  }
  if (!alphaNumRegex.test(data.location)) {
    return showToast("Invalid location", "error");
  }
  if (!ugPhoneRegex.test(data.contact)) {
    return showToast("Invalid phone number", "error");
  }
  if (Number(data.tonnage) <= 0) {
    return showToast("Tonnage must be greater than 0", "error");
  }
  if (!isValidAmount(data.amountDue)) {
    return showToast("Amount due must be at least 5 digits", "error");
  }
  if (due < today) {
    return showToast("Due date cannot be in the past", "error");
  }
  if (due <= dispatch) {
    return showToast("Due date must be after the dispatch date", "error");
  }
  if (!stockItem) {
    return showToast("Selected produce is not available in stock", "error");
  }

  const remaining = Number(stockItem.totalStock || 0) - getReservedInCart(data.produceName);
  if (Number(data.tonnage) > remaining) {
    return showToast(`Insufficient stock. Only ${remaining}kg available.`, "error");
  }

  addToCart(data);
  creditForm.reset();
  setDefaults();
  updateAvailableStockForForm(creditForm);
});

async function processCheckout() {
  if (!cart.length) {
    showToast("Cart is empty", "error");
    return;
  }

  const checkoutBtn = document.getElementById('checkoutBtn');
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing...";

  let successCount = 0;
  const failedItems = [];

  for (const item of cart) {
    // Keep backend compatibility by posting each sale item separately.
    try {
      const endpoint = item.saleType === 'cash' ? '/api/sales/cash' : '/api/sales/credit';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(item)
      });
      if (res.ok) successCount += 1;
      else failedItems.push(item.produceName);
    } catch (_err) {
      failedItems.push(item.produceName);
    }
  }

  if (successCount > 0) {
    printBatchReceipt(cart);
    cart = [];
    updateCartUI();
    await fetchStock();
    showToast(`Successfully recorded ${successCount} sales.`);
  }
  if (failedItems.length) {
    showToast(`Failed to record: ${failedItems.join(', ')}`, 'error');
  }

  checkoutBtn.disabled = false;
  checkoutBtn.textContent = "Complete Sale & Print Receipt";
}

function printBatchReceipt(items) {
  const displayBranch = localStorage.getItem('branch') || 'N/A';
  const agent = localStorage.getItem('userName') || 'Sales Agent';
  const date = new Date().toLocaleDateString('en-GB');
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const buyerName = items[0]?.buyerName || 'N/A';

  let subtotal = 0;
  const rows = items.map((item) => {
    const amount = Number(item.amountPaid || item.amountDue || 0);
    subtotal += amount;
    return `<tr><td>${item.produceName}</td><td>${item.tonnage} KG</td><td>${amount.toLocaleString()}</td></tr>`;
  }).join('');

  const vat = subtotal * 0.18;
  const total = subtotal + vat;

  const receiptHtml = `<html><head><title>Sales Receipt</title></head><body style="font-family:Segoe UI;padding:15px;background:#f9f9f9;"><div style="max-width:450px;margin:auto;background:#fff;padding:25px;border-radius:8px;"><div style="text-align:center;"><img src="/images/logo.png" style="max-width:120px;" /><h2>Karibu Groceries Ltd</h2></div><p><strong>Date:</strong> ${date} ${time}</p><p><strong>Branch:</strong> ${displayBranch}</p><p><strong>Sold To:</strong> ${buyerName}</p><p><strong>Sales Agent:</strong> ${agent}</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Subtotal:</strong> UGX ${subtotal.toLocaleString()}</p><p><strong>VAT (18%):</strong> UGX ${vat.toLocaleString()}</p><p><strong>Total:</strong> UGX ${total.toLocaleString()}</p></div></body></html>`;

  const win = window.open('', '', 'width=500,height=750');
  if (!win) return;
  win.document.write(receiptHtml);
  win.document.close();
  win.print();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  setDefaults();
  fetchStock();
  updateCartUI();

  const checkoutBtn = document.getElementById('checkoutBtn');
  // Checkout finalizes all cart rows and then refreshes stock state.
  if (checkoutBtn) checkoutBtn.addEventListener('click', processCheckout);
});
