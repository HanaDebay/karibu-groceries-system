// credit sales data
const creditSales = [
  {
    buyer: "Alice",
    nin: "NIN12345678",
    location: "Matugga",
    contact: "0770123456",
    amountDue: 150000,
    agent: "John Doe",
    dueDate: "2026-01-15",
    produceName: "Beans",
    produceType: "Grain",
    tonnage: 200,
    dispatchDate: "2026-01-01",
    branch: "Matugga"
  },
  {
    buyer: "Bob",
    nin: "NIN87654321",
    location: "Matugga",
    contact: "0700123456",
    amountDue: 250000,
    agent: "Jane Smith",
    dueDate: "2026-01-20",
    produceName: "Maize",
    produceType: "Grain",
    tonnage: 300,
    dispatchDate: "2026-01-02",
    branch: "Matugga"
  },
  {
    buyer: "Charlie",
    nin: "NIN11223344",
    location: "Entebbe",
    contact: "0750123456",
    amountDue: 180000,
    agent: "Mike Johnson",
    dueDate: "2026-01-25",
    produceName: "Cow Peas",
    produceType: "Legume",
    tonnage: 150,
    dispatchDate: "2026-01-03",
    branch: "Entebbe"
  }
];

// Manager branch
const managerBranch = "Matugga";

// Filter branch sales
let branchSales = creditSales.filter(sale => sale.branch === managerBranch);

// Render table
function renderTable(data) {
  const tbody = document.querySelector("#creditSalesTable tbody");
  tbody.innerHTML = "";

  data.forEach(sale => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sale.buyer}</td>
      <td>${sale.amountDue.toLocaleString()}</td>
      <td>${sale.agent}</td>
      <td>${sale.dueDate}</td>
      <td>${sale.produceName}</td>
      <td>${sale.produceType}</td>
      <td>${sale.tonnage}</td>
      <td>${sale.dispatchDate}</td>
    `;
    tbody.appendChild(tr);
  });

  // Show alert if no sales
  const alertBox = document.getElementById("alertBox");
  if (data.length === 0) {
    alertBox.textContent = "No credit sales found for your branch.";
    alertBox.style.display = "block";
  } else {
    alertBox.style.display = "none";
  }
}

// Initial render
renderTable(branchSales);

// Search functionality 
document.getElementById("searchInput").addEventListener("keyup", function() {
  const term = this.value.toLowerCase();

  const filtered = branchSales.filter(sale => 
    Object.values(sale).some(value => 
      String(value).toLowerCase().includes(term)
    )
  );

  renderTable(filtered);
});
