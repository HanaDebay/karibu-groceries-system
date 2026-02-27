const tableBody = document.querySelector("#creditTable tbody");
const searchInput = document.getElementById("creditSearch");
const printCreditBtn = document.getElementById("printCreditBtn");

const totalCreditEl = document.getElementById("totalCredit");
const overdueAmountEl = document.getElementById("overdueAmount");
const pendingAmountEl = document.getElementById("pendingAmount");

let creditData = [];
let filterText = "";

function getStatus(item) {
  const today = new Date();
  const due = new Date(item.dueDate);

  if (item.amountDue === 0) return "paid";
  if (today > due) return "overdue";
  return "pending";
}

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
  return [item.buyer, item.branch, item.agent, item.produce, formatDate(item.dueDate)]
    .map(value => String(value || "").toLowerCase())
    .join(" ");
}

function getFilteredCredits() {
  if (!filterText) return creditData;
  return creditData.filter(item => getSearchableText(item).includes(filterText));
}

function renderCredits() {
  tableBody.innerHTML = "";

  let totalCredit = 0;
  let overdueAmount = 0;
  let pendingAmount = 0;

  const filtered = getFilteredCredits();
  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="7">No credit sales found.</td></tr>';
  } else {
    filtered.forEach(item => {
      const status = getStatus(item);
      totalCredit += item.amountDue;

      if (status === "overdue") overdueAmount += item.amountDue;
      if (status === "pending") pendingAmount += item.amountDue;

      const row = document.createElement("tr");
      if (status === "overdue") row.classList.add("overdue");

      row.innerHTML = `
        <td>${item.buyer}</td>
        <td>${item.branch}</td>
        <td>${item.agent}</td>
        <td>${item.produce}</td>
        <td>UGX ${item.amountDue.toLocaleString()}</td>
        <td>${formatDate(item.dueDate)}</td>
        <td>
          ${
            status === "paid"
              ? `<span class="badge success">Paid</span>`
              : status === "overdue"
              ? `<span class="badge danger">Overdue</span>`
              : `<span class="badge warning">Pending</span>`
          }
        </td>
      `;

      tableBody.appendChild(row);
    });
  }

  totalCreditEl.textContent = "UGX " + totalCredit.toLocaleString();
  overdueAmountEl.textContent = "UGX " + overdueAmount.toLocaleString();
  pendingAmountEl.textContent = "UGX " + pendingAmount.toLocaleString();
}

async function fetchCredits() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    tableBody.innerHTML = '<tr><td colspan="7">Loading credit sales...</td></tr>';
    const response = await fetch("/api/sales/credit-overview", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error("Failed to fetch credit sales:", response.status);
      tableBody.innerHTML = '<tr><td colspan="7">Failed to load credit sales.</td></tr>';
      return;
    }

    const data = await response.json();
    creditData = Array.isArray(data.data) ? data.data : [];
    renderCredits();
  } catch (error) {
    console.error("Error loading credit overview:", error);
    tableBody.innerHTML = '<tr><td colspan="7">Failed to load credit sales.</td></tr>';
  }
}

if (searchInput) {
  searchInput.addEventListener("input", e => {
    filterText = e.target.value.trim().toLowerCase();
    renderCredits();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchCredits();
});

if (printCreditBtn) {
  printCreditBtn.addEventListener("click", () => {
    const filtered = getFilteredCredits();
    if (!filtered.length) return;

    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) return;

    const rowsHtml = filtered.map(item => {
      const status = getStatus(item);
      const statusLabel =
        status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Pending";

      return `
        <tr>
          <td>${item.buyer}</td>
          <td>${item.branch}</td>
          <td>${item.agent}</td>
          <td>${item.produce}</td>
          <td>UGX ${item.amountDue.toLocaleString()}</td>
          <td>${formatDate(item.dueDate)}</td>
          <td>${statusLabel}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Credit Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #2c3e50; color: #d4af37; }
          </style>
        </head>
        <body>
          <h2>Credit Overview Report</h2>
          <table>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Branch</th>
                <th>Agent</th>
                <th>Produce</th>
                <th>Amount Due</th>
                <th>Due Date</th>
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
