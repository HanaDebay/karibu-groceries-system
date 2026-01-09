const salesData = [
  {
    date: "2026-01-05",
    branch: "Matugga",
    agent: "John",
    buyer: "Kato Traders",
    produce: "Beans",
    type: "Yellow",
    tonnage: 500,
    amount: "12,500,000",
    payment: "Cash"
  },
  {
    date: "2026-01-06",
    branch: "Maganjo",
    agent: "Sarah",
    buyer: "Musa Stores",
    produce: "Maize",
    type: "Grain",
    tonnage: 800,
    amount: "18,200,000",
    payment: "Credit"
  }
];

const tbody = document.querySelector("#salesTable tbody");
const searchInput = document.getElementById("searchInput");

function renderTable(data) {
  tbody.innerHTML = "";

  data.forEach(sale => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${sale.date}</td>
      <td>${sale.branch}</td>
      <td>${sale.agent}</td>
      <td>${sale.buyer}</td>
      <td>${sale.produce}</td>
      <td>${sale.type}</td>
      <td>${sale.tonnage}</td>
      <td>${sale.amount}</td>
      <td class="${sale.payment === "Cash" ? "cash" : "credit"}">
        ${sale.payment}
      </td>
    `;

    tbody.appendChild(row);
  });
}

searchInput.addEventListener("input", () => {
  const value = searchInput.value.toLowerCase();

  const filtered = salesData.filter(sale =>
    Object.values(sale).some(v =>
      v.toString().toLowerCase().includes(value)
    )
  );

  renderTable(filtered);
});

renderTable(salesData);
