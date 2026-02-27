const tableBody = document.querySelector("#stockTable tbody");
const stockSearch = document.getElementById("stockSearch");
const printStockBtn = document.getElementById("printStockBtn");

let stockData = [];
let filterText = "";

function getStatus(kg) {
  if (kg === 0) return "out";
  if (kg < 1000) return "low";
  return "available";
}

function getSearchableText(item) {
  return [item.produce, item.type, item.branch]
    .map(value => String(value || "").toLowerCase())
    .join(" ");
}

function getFilteredStock() {
  if (!filterText) return stockData;
  return stockData.filter(item => getSearchableText(item).includes(filterText));
}

function renderStock() {
  tableBody.innerHTML = "";

  const filtered = getFilteredStock();
  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="8">No stock found.</td></tr>';
    return;
  }

  filtered.forEach(item => {
    const status = getStatus(item.quantity);
    const stockValue = item.quantity * item.sellingPrice;

    const row = document.createElement("tr");
    if (status !== "available") row.classList.add(status);

    row.innerHTML = `
      <td>${item.produce}</td>
      <td>${item.type}</td>
      <td>${item.branch}</td>
      <td>${item.quantity}</td>
      <td>UGX ${item.buyingPrice.toLocaleString()}</td>
      <td>UGX ${item.sellingPrice.toLocaleString()}</td>
      <td>UGX ${stockValue.toLocaleString()}</td>
      <td>
        ${
          status === "available"
            ? `<span class="badge success">Available</span>`
            : status === "low"
            ? `<span class="badge warning">Low Stock</span>`
            : `<span class="badge danger">Out of Stock</span>`
        }
      </td>
    `;

    tableBody.appendChild(row);
  });
}

async function fetchStockOverview() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    tableBody.innerHTML = '<tr><td colspan="8">Loading stock...</td></tr>';
    const response = await fetch("/api/procurement", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error("Failed to fetch stock overview:", response.status);
      tableBody.innerHTML = '<tr><td colspan="8">Failed to load stock.</td></tr>';
      return;
    }

    const data = await response.json();
    const procurements = Array.isArray(data.data) ? data.data : [];

    const grouped = new Map();
    procurements.forEach(item => {
      const key = `${item.produceName}||${item.produceType}||${item.branch}`;
      const tonnage = Number(item.tonnage || 0);
      const cost = Number(item.cost || 0);
      const sellingPrice = Number(item.sellingPrice || 0);
      const stock = Number(item.stock || 0);

      if (!grouped.has(key)) {
        grouped.set(key, {
          produce: item.produceName,
          type: item.produceType,
          branch: item.branch,
          quantity: 0,
          totalTonnage: 0,
          totalCost: 0,
          totalSellingValue: 0
        });
      }

      const group = grouped.get(key);
      group.quantity += stock;
      group.totalTonnage += tonnage;
      group.totalCost += cost;
      group.totalSellingValue += sellingPrice * tonnage;
    });

    stockData = Array.from(grouped.values()).map(group => {
      const buyingPrice = group.totalTonnage > 0 ? group.totalCost / group.totalTonnage : 0;
      const sellingPrice = group.totalTonnage > 0 ? group.totalSellingValue / group.totalTonnage : 0;
      return {
        produce: group.produce,
        type: group.type,
        branch: group.branch,
        quantity: Math.max(0, Math.round(group.quantity)),
        buyingPrice: Math.round(buyingPrice),
        sellingPrice: Math.round(sellingPrice)
      };
    });

    renderStock();
  } catch (error) {
    console.error("Error loading stock overview:", error);
    tableBody.innerHTML = '<tr><td colspan="8">Failed to load stock.</td></tr>';
  }
}

stockSearch.addEventListener("input", e => {
  filterText = e.target.value.toLowerCase();
  renderStock();
});

document.addEventListener("DOMContentLoaded", () => {
  fetchStockOverview();
});

if (printStockBtn) {
  printStockBtn.addEventListener("click", () => {
    const filtered = getFilteredStock();
    if (!filtered.length) return;

    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) return;

    const rowsHtml = filtered.map(item => {
      const status = getStatus(item.quantity);
      const statusLabel =
        status === "available" ? "Available" : status === "low" ? "Low Stock" : "Out of Stock";
      const stockValue = item.quantity * item.sellingPrice;

      return `
        <tr>
          <td>${item.produce}</td>
          <td>${item.type}</td>
          <td>${item.branch}</td>
          <td>${item.quantity}</td>
          <td>UGX ${item.buyingPrice.toLocaleString()}</td>
          <td>UGX ${item.sellingPrice.toLocaleString()}</td>
          <td>UGX ${stockValue.toLocaleString()}</td>
          <td>${statusLabel}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Stock Overview Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #2c3e50; color: #d4af37; }
          </style>
        </head>
        <body>
          <h2>Stock Overview Report</h2>
          <table>
            <thead>
              <tr>
                <th>Produce</th>
                <th>Type</th>
                <th>Branch</th>
                <th>Available (KG)</th>
                <th>Buying Price</th>
                <th>Selling Price</th>
                <th>Stock Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  });
}
