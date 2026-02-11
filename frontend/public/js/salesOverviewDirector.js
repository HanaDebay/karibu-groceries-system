const salesData = [
  {
    id: 1,
    produce: "Beans",
    type: "Red",
    branch: "Matugga",
    agent: "Sarah",
    saleType: "Cash",
    quantity: 800,
    amount: 2800000,
    date: "10 Feb 2026",
    status: "Paid"
  },
  {
    id: 2,
    produce: "Maize",
    type: "Grain",
    branch: "Maganjo",
    agent: "John",
    saleType: "Credit",
    quantity: 1500,
    amount: 1800000,
    date: "9 Feb 2026",
    status: "Pending"
  }
];

const tableBody = document.querySelector("#salesTable tbody");
const salesSearch = document.getElementById("salesSearch");

let filterText = "";

function renderSales() {
  tableBody.innerHTML = "";

  salesData
    .filter(item =>
      item.produce.toLowerCase().includes(filterText) ||
      item.agent.toLowerCase().includes(filterText) ||
      item.branch.toLowerCase().includes(filterText)
    )
    .forEach(item => {

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
        <td>UGX ${item.amount.toLocaleString()}</td>
        <td>${item.date}</td>
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

salesSearch.addEventListener("input", e => {
  filterText = e.target.value.toLowerCase();
  renderSales();
});

renderSales();
