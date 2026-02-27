document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const branch = localStorage.getItem("branch");
  const userName = localStorage.getItem("userName");
  const userRole = localStorage.getItem("role");

  let availableStock = [];
  let cart = [];

  // --- UI helpers ---
  function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function setDefaults() {
    const agentName = userName || userRole || "Manager";
    document.querySelectorAll(".agent-name").forEach((input) => {
      input.value = agentName;
    });

    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.querySelector('input[name="date"]');
    const dispatchDateInput = document.querySelector('input[name="dispatchDate"]');

    if (dateInput && !dateInput.value) dateInput.value = today;
    if (dispatchDateInput && !dispatchDateInput.value) dispatchDateInput.value = today;
  }

  if (branch) {
    const branchDisplay = document.getElementById("branchDisplay") || document.querySelector(".topbar span");
    if (branchDisplay) {
      branchDisplay.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${branch} Branch`;
    }
  }

  window.showTab = (tabId) => {
    document.querySelectorAll(".tab-content").forEach((el) => {
      el.style.display = "none";
    });
    document.querySelectorAll(".sale-type-toggle button").forEach((el) => {
      el.classList.remove("active");
    });

    const tab = document.getElementById(tabId);
    const btn = document.getElementById(`btn-${tabId}`);
    if (tab) tab.style.display = "block";
    if (btn) btn.classList.add("active");
  };

  function ensureCartUI() {
    if (document.getElementById("cartSection")) return;

    const formContainer = document.querySelector(".form-container");
    if (!formContainer) return;

    const cartSection = document.createElement("section");
    cartSection.id = "cartSection";
    cartSection.style.display = "none";
    cartSection.style.background = "#fff";
    cartSection.style.borderRadius = "10px";
    cartSection.style.padding = "16px";
    cartSection.style.marginTop = "16px";
    cartSection.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)";

    cartSection.innerHTML = `
      <h4 style="margin-top:0; margin-bottom:12px;">Sales Cart</h4>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Type</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Item</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Qty (KG)</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Amount (UGX)</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Buyer</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Action</th>
            </tr>
          </thead>
          <tbody id="cartTableBody"></tbody>
        </table>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; gap:8px; flex-wrap:wrap;">
        <strong id="cartTotal">Total: UGX 0</strong>
        <button id="checkoutBtn" type="button" class="submit-btn">Complete Sale & Print Receipt</button>
      </div>
    `;

    formContainer.appendChild(cartSection);
  }

  function getReservedInCart(produceName) {
    return cart
      .filter((item) => item.produceName === produceName)
      .reduce((sum, item) => sum + Number(item.tonnage || 0), 0);
  }

  // --- Stock ---
  async function fetchStock() {
    try {
      const response = await fetch("/api/procurement", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch stock");

      const resData = await response.json();
      const procurements = resData.data || [];

      const stockMap = {};
      procurements.forEach((item) => {
        if (item.stock <= 0) return;
        if (branch && item.branch !== branch) return;

        if (!stockMap[item.produceName]) {
          stockMap[item.produceName] = {
            name: item.produceName,
            type: item.produceType,
            totalStock: 0,
            price: item.sellingPrice || 0,
          };
        }

        stockMap[item.produceName].totalStock += Number(item.stock || 0);
      });

      availableStock = Object.values(stockMap);
      populateDropdowns();
    } catch (error) {
      console.error("Error fetching stock:", error);
      showToast("Failed to load stock data", "error");
    }
  }

  function populateDropdowns() {
    document.querySelectorAll(".produce-select").forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Select Produce</option>';

      availableStock.forEach((item) => {
        const reserved = getReservedInCart(item.name);
        const remaining = Math.max(0, item.totalStock - reserved);
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = `${item.name} (${remaining}kg avail)`;
        option.dataset.price = String(item.price || 0);
        option.dataset.type = item.type || "";
        option.dataset.remaining = String(remaining);
        option.disabled = remaining <= 0;
        select.appendChild(option);
      });

      if (currentValue) select.value = currentValue;

      if (!select.dataset.bound) {
        select.addEventListener("change", (e) => {
          const selected = e.target.options[e.target.selectedIndex];
          const form = e.target.closest("form");
          if (!form) return;

          const typeInput = form.querySelector('input[name="produceType"]');
          if (typeInput && selected.dataset.type) typeInput.value = selected.dataset.type;

          const price = Number(selected.dataset.price || 0);
          const tonnageInput = form.querySelector('input[name="tonnage"]');
          const amountInput =
            form.querySelector('input[name="amountPaid"]') ||
            form.querySelector('input[name="amountDue"]');

          if (tonnageInput && amountInput && price > 0) {
            const calc = () => {
              if (!tonnageInput.value) return;
              amountInput.value = Number(tonnageInput.value) * price;
            };
            tonnageInput.oninput = calc;
            calc();
          }
        });
        select.dataset.bound = "true";
      }
    });
  }

  // --- Validation ---
  const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/;
  const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/;
  const ninRegex = /^(CM|CF)[A-Z0-9]{12}$/i;

  function isValidAmount(amount) {
    return !Number.isNaN(Number(amount)) && String(Math.trunc(Number(amount))).length >= 5;
  }

  // --- Cart ---
  function addToCart(item) {
    cart.push(item);
    updateCartUI();
    populateDropdowns();
    showToast("Item added to cart");
  }

  function updateCartUI() {
    const cartSection = document.getElementById("cartSection");
    const tbody = document.getElementById("cartTableBody");
    const totalLabel = document.getElementById("cartTotal");

    if (!cartSection || !tbody || !totalLabel) return;

    if (cart.length === 0) {
      cartSection.style.display = "none";
      tbody.innerHTML = "";
      totalLabel.textContent = "Total: UGX 0";
      return;
    }

    cartSection.style.display = "block";
    tbody.innerHTML = "";

    let total = 0;
    cart.forEach((item, index) => {
      const amount = Number(item.amountPaid || item.amountDue || 0);
      total += amount;

      tbody.innerHTML += `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #eee; text-transform:capitalize;">${item.saleType}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${item.produceName}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${item.tonnage}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${amount.toLocaleString()}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${item.buyerName}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">
            <button type="button" onclick="removeFromCart(${index})" style="color:#d62828; border:none; background:none; cursor:pointer;">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    totalLabel.textContent = `Total: UGX ${total.toLocaleString()}`;
  }

  window.removeFromCart = (index) => {
    cart.splice(index, 1);
    updateCartUI();
    populateDropdowns();
  };

  async function processCheckout() {
    if (cart.length === 0) {
      showToast("Cart is empty", "error");
      return;
    }

    const checkoutBtn = document.getElementById("checkoutBtn");
    if (!checkoutBtn) return;

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Processing...";

    const successfulItems = [];
    const failedItems = [];

    for (const item of cart) {
      try {
        const endpoint = item.saleType === "cash" ? "/api/sales/cash" : "/api/sales/credit";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item),
        });

        if (res.ok) {
          successfulItems.push(item);
        } else {
          failedItems.push(item.produceName);
        }
      } catch (_err) {
        failedItems.push(item.produceName);
      }
    }

    if (successfulItems.length > 0) {
      printBatchReceipt(successfulItems);
      cart = cart.filter((item) => !successfulItems.includes(item));
      updateCartUI();
      await fetchStock();
      showToast(`Successfully recorded ${successfulItems.length} sale(s).`);
    }

    if (failedItems.length > 0) {
      showToast(`Failed to record: ${failedItems.join(", ")}`, "error");
    }

    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Complete Sale & Print Receipt";
  }

  function printBatchReceipt(items) {
    const receiptBranch = branch || "N/A";
    const agent = userName || userRole || "Manager";
    const date = new Date().toLocaleDateString("en-GB");
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const buyerName = items.length > 0 ? items[0].buyerName : "N/A";

    let totalAmount = 0;
    const rows = items
      .map((item) => {
        const amount = Number(item.amountPaid || item.amountDue || 0);
        totalAmount += amount;

        return `
          <tr>
            <td>${item.produceName}</td>
            <td>${item.tonnage} KG</td>
            <td style="text-transform:capitalize;">${item.saleType}</td>
            <td>${amount.toLocaleString()}</td>
          </tr>
        `;
      })
      .join("");

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
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            width: 100%;
            max-width: 480px;
            margin: auto;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.08);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .header img {
            max-width: 120px;
            max-height: 60px;
            object-fit: contain;
            margin-bottom: 6px;
          }
          .header h2 {
            margin: 2px 0;
            font-size: 22px;
            color: #2c3e50;
          }
          .header p {
            margin: 0;
            font-size: 12px;
            color: #666;
          }
          .details p, .totals p {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
          }
          th {
            background: #f6f6f6;
          }
          .totals {
            border-top: 2px solid #f0f0f0;
            margin-top: 12px;
            padding-top: 8px;
          }
          .grand-total {
            font-weight: 700;
            font-size: 16px;
          }
          .footer {
            text-align: center;
            margin-top: 18px;
            font-size: 12px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <img src="/images/logo.png" alt="Karibu Groceries Logo" onerror="this.style.display='none';">
            <h2>Karibu Groceries Ltd</h2>
            <p>Your Trusted Partner for Fresh Produce</p>
          </div>

          <div class="details">
            <p><strong>Date:</strong><span>${date} ${time}</span></p>
            <p><strong>Branch:</strong><span>${receiptBranch}</span></p>
            <p><strong>Sold To:</strong><span>${buyerName}</span></p>
            <p><strong>Sales Agent:</strong><span>${agent}</span></p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Type</th>
                <th>Amount (UGX)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <p><span>Subtotal:</span><span>UGX ${totalAmount.toLocaleString()}</span></p>
            <p><span>VAT (18%):</span><span>UGX ${taxAmount.toLocaleString()}</span></p>
            <p class="grand-total"><span>Total:</span><span>UGX ${grandTotal.toLocaleString()}</span></p>
          </div>

          <div class="footer">
            <p>Thank you for your business.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "", "width=520,height=760");
    if (!win) {
      showToast("Unable to open print window. Please allow popups.", "error");
      return;
    }

    win.document.open();
    win.document.write(receiptHtml);
    win.document.close();

    const tryPrint = () => {
      win.focus();
      win.print();
    };

    const logo = win.document.querySelector("img");
    if (logo && !logo.complete) {
      logo.onload = tryPrint;
      logo.onerror = tryPrint;
      setTimeout(tryPrint, 800);
    } else {
      setTimeout(tryPrint, 200);
    }
  }

  // --- Form handlers (Add to Cart only) ---
  const cashSaleForm = document.getElementById("cashSaleForm");
  if (cashSaleForm) {
    cashSaleForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(e.target).entries());
      data.saleType = "cash";
      data.branch = branch;
      data.salesAgent = userName || userRole || "Manager";
      data.time = new Date().toLocaleTimeString("en-GB", { hour12: false });

      const stockItem = availableStock.find((s) => s.name === data.produceName);
      if (stockItem && !data.produceType) data.produceType = stockItem.type;

      if (!data.produceName || !data.tonnage || !data.amountPaid || !data.buyerName || !data.date) {
        showToast("All fields are required", "error");
        return;
      }

      if (Number(data.tonnage) <= 0) {
        showToast("Tonnage must be greater than 0", "error");
        return;
      }

      if (!isValidAmount(data.amountPaid)) {
        showToast("Amount paid must be at least 5 digits", "error");
        return;
      }

      if (!alphaNumRegex.test(data.buyerName)) {
        showToast("Buyer name must be at least 2 alphanumeric characters", "error");
        return;
      }

      if (!stockItem) {
        showToast("Selected produce is not available in stock", "error");
        return;
      }

      const remaining = stockItem.totalStock - getReservedInCart(data.produceName);
      if (Number(data.tonnage) > remaining) {
        showToast(`Insufficient stock. Only ${remaining}kg available.`, "error");
        return;
      }

      addToCart(data);
      e.target.reset();
      setDefaults();
    });
  }

  const creditSaleForm = document.getElementById("creditSaleForm");
  if (creditSaleForm) {
    creditSaleForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(e.target).entries());
      data.saleType = "credit";
      data.branch = branch;
      data.salesAgent = userName || userRole || "Manager";
      data.time = new Date().toLocaleTimeString("en-GB", { hour12: false });

      const stockItem = availableStock.find((s) => s.name === data.produceName);
      if (stockItem && !data.produceType) data.produceType = stockItem.type;

      const dispatch = new Date(data.dispatchDate || new Date());
      const due = new Date(data.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (
        !data.buyerName ||
        !data.nationalId ||
        !data.location ||
        !data.contact ||
        !data.amountDue ||
        !data.produceName ||
        !data.tonnage ||
        !data.dispatchDate ||
        !data.dueDate
      ) {
        showToast("All fields are required", "error");
        return;
      }

      if (!alphaNumRegex.test(data.buyerName)) {
        showToast("Buyer name must be at least 2 alphanumeric characters", "error");
        return;
      }

      if (!ninRegex.test(data.nationalId)) {
        showToast("Invalid NIN format (use CM/CF + 12 characters)", "error");
        return;
      }

      if (!alphaNumRegex.test(data.location)) {
        showToast("Location must be at least 2 alphanumeric characters", "error");
        return;
      }

      if (!ugPhoneRegex.test(data.contact)) {
        showToast("Invalid Ugandan phone number", "error");
        return;
      }

      if (Number(data.tonnage) <= 0) {
        showToast("Tonnage must be greater than 0", "error");
        return;
      }

      if (!isValidAmount(data.amountDue)) {
        showToast("Amount due must be at least 5 digits", "error");
        return;
      }

      if (due < today) {
        showToast("Due date cannot be in the past", "error");
        return;
      }

      if (due <= dispatch) {
        showToast("Due date must be after dispatch date", "error");
        return;
      }

      if (!stockItem) {
        showToast("Selected produce is not available in stock", "error");
        return;
      }

      const remaining = stockItem.totalStock - getReservedInCart(data.produceName);
      if (Number(data.tonnage) > remaining) {
        showToast(`Insufficient stock. Only ${remaining}kg available.`, "error");
        return;
      }

      addToCart(data);
      e.target.reset();
      setDefaults();
    });
  }

  // --- init ---
  setDefaults();
  ensureCartUI();

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", processCheckout);
  }

  fetchStock();

  const cashBtn = document.getElementById("btn-cashSale");
  if (cashBtn) {
    showTab("cashSale");
  } else {
    const cashForm = document.getElementById("cashSale");
    if (cashForm) cashForm.style.display = "block";
  }
});
