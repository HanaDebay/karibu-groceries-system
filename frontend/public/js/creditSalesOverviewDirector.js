const creditData = [
  {
    buyer: "Kato Traders",
    branch: "Matugga",
    agent: "Sarah",
    produce: "Beans",
    amountDue: 2000000,
    dueDate: "2026-02-05"
  },
  {
    buyer: "Moses Ltd",
    branch: "Maganjo",
    agent: "James",
    produce: "Maize",
    amountDue: 1500000,
    dueDate: "2026-02-20"
  },
  {
    buyer: "Amina Stores",
    branch: "Matugga",
    agent: "Grace",
    produce: "Soybeans",
    amountDue: 0,
    dueDate: "2026-02-01"
  }
];

const tableBody = document.querySelector("#creditTable tbody");
const searchInput = document.getElementById("creditSearch");

const totalCreditEl = document.getElementById("totalCredit");
const overdueAmountEl = document.getElementById("overdueAmount");
const pendingAmountEl = document.getElementById("pendingAmount");

let filterText = "";

function getStatus(item) {
  const today = new Date();
  const due = new Date(item.dueDate);

  if (item.amountDue === 0) return "paid";
  if (today > due) return "overdue";
  return "pending";
}

function renderCredits() {
  tableBody.innerHTML = "";

  let totalCredit = 0;
  let overdueAmount = 0;
  let pendingAmount = 0;

  creditData
    .filter(item =>
      item.buyer.toLowerCase().includes(filterText) ||
      item.branch.toLowerCase().includes(filterText) ||
      item.agent.toLowerCase().includes(filterText)
    )
    .forEach(item => {

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
        <td>${item.dueDate}</td>
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

  totalCreditEl.textContent = "UGX " + totalCredit.toLocaleString();
  overdueAmountEl.textContent = "UGX " + overdueAmount.toLocaleString();
  pendingAmountEl.textContent = "UGX " + pendingAmount.toLocaleString();
}

searchInput.addEventListener("input", e => {
  filterText = e.target.value.toLowerCase();
  renderCredits();
});

renderCredits();
