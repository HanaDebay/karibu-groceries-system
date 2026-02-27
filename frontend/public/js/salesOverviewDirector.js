const tableBody = document.querySelector("#salesTable tbody");
const salesSearch = document.getElementById("salesSearch");
const printSalesBtn = document.getElementById("printSalesBtn");

let salesData = [];
let filterText = "";

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getSearchableText(item) {
  return [
    item.produce,
    item.type,
    item.branch,
    item.agent,
    item.saleType,
    item.status,
    formatDate(item.date)
  ]
    .map(value => String(value || "").toLowerCase())
    .join(" ");
}

function getFilteredSales() {
  if (!filterText) return salesData;
  return salesData.filter(item => getSearchableText(item).includes(filterText));
}

function renderSales() {
  tableBody.innerHTML = "";

  const filtered = getFilteredSales();
  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="9">No sales found.</td></tr>';
    return;
  }

  filtered.forEach(item => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${item.produce}</td>
        <td>${item.type}</td>
        <td>${item.branch}</td>
        <td>${item.agent}</td>
        <td>
          ${
            item.saleType === "Cash"
              ? `<span class="badge success">Cash</span>`
              : `<span class="badge warning">Credit</span>`
          }
        </td>
        <td>${item.quantity}</td>
        <td>UGX ${Number(item.amount || 0).toLocaleString()}</td>
        <td>${formatDate(item.date)}</td>
        <td>
          ${
            item.status === "Paid"
              ? `<span class="badge success">Paid</span>`
              : `<span class="badge warning">Pending</span>`
          }
        </td>
      `;

      tableBody.appendChild(row);
    });
}

async function fetchSalesOverview() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    tableBody.innerHTML = '<tr><td colspan="9">Loading sales...</td></tr>';
    const response = await fetch("/api/sales/director-overview", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error("Failed to fetch director sales overview:", response.status);
      return;
    }

    const data = await response.json();
    salesData = Array.isArray(data.data) ? data.data : [];
    renderSales();
  } catch (error) {
    console.error("Error loading sales overview:", error);
    tableBody.innerHTML = '<tr><td colspan="9">Failed to load sales.</td></tr>';
  }
}

salesSearch.addEventListener("input", e => {
  filterText = e.target.value.toLowerCase();
  renderSales();
});

document.addEventListener("DOMContentLoaded", () => {
  fetchSalesOverview();
});

if (printSalesBtn) {
  printSalesBtn.addEventListener("click", () => {
    const filtered = getFilteredSales();
    if (!filtered.length) return;

    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) return;

    const rowsHtml = filtered.map(item => `
      <tr>
        <td>${item.produce}</td>
        <td>${item.type}</td>
        <td>${item.branch}</td>
        <td>${item.agent}</td>
        <td>${item.saleType}</td>
        <td>${item.quantity}</td>
        <td>UGX ${Number(item.amount || 0).toLocaleString()}</td>
        <td>${formatDate(item.date)}</td>
        <td>${item.status}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Overview Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #2c3e50; color: #d4af37; }
          </style>
        </head>
        <body>
          <h2>Sales Overview Report</h2>
          <table>
            <thead>
              <tr>
                <th>Produce</th>
                <th>Type</th>
                <th>Branch</th>
                <th>Agent</th>
                <th>Sale Type</th>
                <th>Quantity (KG)</th>
                <th>Amount (UGX)</th>
                <th>Date</th>
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
