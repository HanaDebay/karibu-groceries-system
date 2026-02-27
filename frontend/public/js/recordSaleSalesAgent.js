// ===== Toast =====
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
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

// ===== Global State & Init =====
let availableStock = [];
let cart = []; // Store items for the current transaction
const token = localStorage.getItem("token");
const branch = localStorage.getItem("branch");
const userName = localStorage.getItem("userName");

document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Auto-fill Agent Name
  document.querySelectorAll(".agent-name").forEach(input => {
    input.value = userName || "Sales Agent";
  });

  // Set default date
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.value = today;
  });

  fetchStock();

  // Checkout Listener
  document.getElementById('checkoutBtn').addEventListener('click', processCheckout);
  // Hide cart initially
  updateCartUI();
});

async function fetchStock() {
  try {
    // Fetching procurement to calculate available stock
    const response = await fetch('/api/procurement', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const resData = await response.json();
      const procurements = resData.data || [];

      // Aggregate stock by produce name for this branch
      const stockMap = {};
      procurements.forEach(item => {
        if (item.branch === branch && item.stock > 0) {
          if (!stockMap[item.produceName]) {
            stockMap[item.produceName] = {
              name: item.produceName,
              type: item.produceType,
              totalStock: 0,
              price: item.sellingPrice || 0
            };
          }
          stockMap[item.produceName].totalStock += item.stock;
        }
      });

      availableStock = Object.values(stockMap);
      populateProduceSelects();
    }
  } catch (error) {
    console.error("Error fetching stock:", error);
    showToast("Failed to load stock data", "error");
  }
}

function populateProduceSelects() {
  const selects = document.querySelectorAll(".produce-select");
  selects.forEach(select => {
    select.innerHTML = '<option value="">Select Produce</option>';
    availableStock.forEach(item => {
      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = `${item.name} (${item.totalStock}kg avail)`;
      option.dataset.price = item.price;
      option.dataset.type = item.type;
      select.appendChild(option);
    });
    
    // Add change listener for auto-filling details
    select.addEventListener("change", (e) => {
      const selected = e.target.options[e.target.selectedIndex];
      const form = e.target.closest("form");
      
      // Auto-fill Type
      const typeInput = form.querySelector('input[name="produceType"]') || form.querySelector('input[name="type"]');
      if (typeInput && selected.dataset.type) typeInput.value = selected.dataset.type;

      // Auto-calc Amount
      const price = selected.dataset.price;
      const tonnageInput = form.querySelector('input[name="tonnage"]');
      const amountInput = form.querySelector('input[name="amountPaid"]') || form.querySelector('input[name="amountDue"]');
      
      if (price && tonnageInput && amountInput) {
        const calc = () => {
           if(tonnageInput.value) amountInput.value = tonnageInput.value * price;
        };
        tonnageInput.oninput = calc;
        calc();
      }
    });
  });
}

// ===== Validation Helpers =====
const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/;
const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/;
const ninRegex = /^(CM|CF)[A-Z0-9]{12}$/; //e.g. CM123456789012 or CF123456789012

function isValidAmount(amount) {
  return !isNaN(amount) && amount.toString().length >= 5;
}

// ===== Add to Cart (Cash) =====
cashForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(cashForm);
  const data = Object.fromEntries(formData.entries());
  
  // Add system fields
  data.branch = branch;
  data.salesAgent = userName;
  data.saleType = 'cash';
  
  // Find selected stock to get type if not in form
  const stockItem = availableStock.find(s => s.name === data.produceName);
  if(stockItem) data.produceType = stockItem.type;

  if (!data.produceName || !data.tonnage || !data.amountPaid || !data.buyerName) {
    return showToast("All fields are required", "error");
  }

  if (Number(data.tonnage) <= 0) {
    return showToast("Invalid tonnage, it must be greater than 0", "error");
  }
  
  // Check stock availability
  if (stockItem && Number(data.tonnage) > stockItem.totalStock) {
      return showToast(`Insufficient stock. Only ${stockItem.totalStock}kg available.`, "error");
  }

  if (!isValidAmount(data.amountPaid)) {
    return showToast(
      "Invalid amount paid, it must be at least 5 digits long",
      "error",
    );
  }

  if (!alphaNumRegex.test(data.buyerName)) {
    return showToast(
      "Invalid buyer name, it has to be at least 2 characters long",
      "error",
    );
  }

  // Add to Cart
  addToCart(data);
  cashForm.reset();
  // Re-populate defaults
  document.querySelector('#cashSaleForm .agent-name').value = userName;
});

// ===== Add to Cart (Credit) =====
creditForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(creditForm);
  const data = Object.fromEntries(formData.entries());
  
  data.branch = branch;
  data.salesAgent = userName;
  data.saleType = 'credit';
  data.time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  
  // Ensure dates are valid
  const dispatch = new Date(data.dispatchDate || new Date());
  const due = new Date(data.dueDate);
  const today = new Date();
  today.setHours(0,0,0,0);

  // ===== Validation checks =====

  if (
    !data.buyerName ||
    !data.nationalId ||
    !data.location ||
    !data.contact ||
    !data.amountDue ||
    !data.produceName ||
    !data.tonnage ||
    !data.dueDate ||
    !data.dispatchDate
  ) {
    return showToast("All fields are required", "error");
  }

  if (!alphaNumRegex.test(data.buyerName)) {
    return showToast(
      "Invalid buyer name, it has to be at least 2 characters long",
      "error",
    );
  }

  if (!ninRegex.test(data.nationalId)) {
    return showToast(
      "Invalid National ID (NIN), it must be in the format CMXXXXXXXXXXXX or CFXXXXXXXXXXXX",
      "error",
    );
  }

  if (!alphaNumRegex.test(data.location)) {
    return showToast(
      "Invalid location, it has to be at least 2 characters long",
      "error",
    );
  }

  if (!ugPhoneRegex.test(data.contact)) {
    return showToast(
      "Invalid phone number, it must be a valid Ugandan phone number",
      "error",
    );
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

  // Add to Cart
  addToCart(data);
  creditForm.reset();
  // Re-populate defaults
  document.querySelector('#creditSaleForm .agent-name').value = userName;
});

// ===== Cart Functions =====
function addToCart(item) {
    cart.push(item);
    updateCartUI();
    showToast("Item added to cart");
}

function updateCartUI() {
    const cartSection = document.getElementById('cartSection');
    const tbody = document.getElementById('cartTableBody');
    
    if (cart.length === 0) {
        cartSection.style.display = 'none';
        return;
    }
    
    cartSection.style.display = 'block';
    tbody.innerHTML = '';
    
    cart.forEach((item, index) => {
        const amount = item.amountPaid || item.amountDue;
        const row = `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${item.produceName}</td>
                <td style="padding: 10px;">${item.tonnage}</td>
                <td style="padding: 10px;">${Number(amount).toLocaleString()}</td>
                <td style="padding: 10px;"><button onclick="removeFromCart(${index})" style="color: red; border: none; background: none; cursor: pointer;"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    updateCartUI();
};

async function processCheckout() {
    if (cart.length === 0) return;

    const checkoutBtn = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Processing...";

    let successCount = 0;
    const failedItems = [];

    // Process each item individually (to maintain backend compatibility)
    for (const item of cart) {
        try {
            const endpoint = item.saleType === 'cash' ? '/api/sales/cash' : '/api/sales/credit';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(item)
            });

            if (res.ok) {
                successCount++;
            } else {
                failedItems.push(item.produceName);
            }
        } catch (err) {
            failedItems.push(item.produceName);
        }
    }

    if (successCount > 0) {
        printBatchReceipt(cart); // Print receipt for all items attempted
        cart = []; // Clear cart
        updateCartUI();
        fetchStock(); // Refresh stock
        showToast(`Successfully recorded ${successCount} sales.`);
    }

    if (failedItems.length > 0) {
        showToast(`Failed to record: ${failedItems.join(', ')}`, 'error');
    }

    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Complete Sale & Print Receipt";
}

function printBatchReceipt(items) {
    const branch = localStorage.getItem('branch') || 'N/A';
    const agent = localStorage.getItem('userName') || 'Sales Agent';
    const date = new Date().toLocaleDateString('en-GB');
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Get buyer name from the first item, assuming all items in cart are for the same buyer.
    const buyerName = items.length > 0 ? items[0].buyerName : 'N/A';
    
    let totalAmount = 0;
    const rows = items.map(item => {
        const amount = Number(item.amountPaid || item.amountDue || 0);
        totalAmount += amount;
        // Using 'KG' for clarity
        return `<tr>
                    <td>${item.produceName}</td>
                    <td>${item.tonnage} KG</td>
                    <td>${amount.toLocaleString()}</td>
                </tr>`;
    }).join('');

    // Tax Calculation (Example: 18% VAT)
    const taxRate = 0.18;
    const taxAmount = totalAmount * taxRate;
    const grandTotal = totalAmount + taxAmount;

    const receiptHtml = `
        <html>
        <head>
            <title>Sales Receipt</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 15px; 
                    background-color: #f9f9f9;
                    -webkit-print-color-adjust: exact; /* For Chrome, Safari */
                    color-adjust: exact; /* Standard */
                }
                .receipt-container { 
                    width: 100%; 
                    max-width: 450px; 
                    margin: auto; 
                    background: #fff; 
                    padding: 25px; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 20px; 
                    border-bottom: 2px solid #f0f0f0;
                    padding-bottom: 15px;
                }
                .header img {
                    max-width: 120px; /* Adjust logo size as needed */
                    margin-bottom: 10px;
                }
                .header h2 { 
                    margin: 0; 
                    color: #2c3e50; 
                    font-size: 24px;
                }
                .header p { margin: 2px 0; font-size: 13px; color: #555; }
                .details, .totals {
                    margin-top: 20px;
                    font-size: 14px;
                }
                .details p, .totals p {
                    margin: 6px 0;
                    display: flex;
                    justify-content: space-between;
                }
                .details p strong, .totals p strong {
                    color: #333;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                }
                th, td { 
                    text-align: left; 
                    padding: 10px; 
                    border-bottom: 1px solid #eee;
                    font-size: 14px;
                }
                th {
                    background-color: #f7f7f7;
                    color: #333;
                    font-weight: 600;
                }
                .totals {
                    border-top: 2px solid #f0f0f0;
                    padding-top: 10px;
                }
                .totals .grand-total {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2c3e50;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 25px; 
                    font-size: 12px; 
                    color: #888; 
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <img src="/images/logo.png" alt="Company Logo">
                    <h2>Karibu Groceries Ltd</h2>
                    <p>Your Trusted Partner for Fresh Produce</p>
                </div>
                <div class="details">
                    <p><strong>Date:</strong> <span>${date} ${time}</span></p>
                    <p><strong>Branch:</strong> <span>${branch}</span></p>
                    <p><strong>Sold To:</strong> <span>${buyerName}</span></p>
                    <p><strong>Sales Agent:</strong> <span>${agent}</span></p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Amount (UGX)</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="totals">
                    <p>Subtotal: <span>UGX ${totalAmount.toLocaleString()}</span></p>
                    <p>VAT (18%): <span>UGX ${taxAmount.toLocaleString()}</span></p>
                    <p class="grand-total"><strong>Total:</strong> <span>UGX ${grandTotal.toLocaleString()}</span></p>
                </div>
                <div class="footer">
                    <p>Thank you for your business!</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '', 'width=500,height=750');
    win.document.write(receiptHtml);
    win.document.close();
    win.print();
}
