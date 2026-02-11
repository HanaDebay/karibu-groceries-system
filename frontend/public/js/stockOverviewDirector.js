const stockData = [
  {
    id: 1,
    produce: "Beans",
    type: "Red",
    branch: "Matugga",
    quantity: 4200,
    buyingPrice: 3000,
    sellingPrice: 3500
  },
  {
    id: 2,
    produce: "Maize",
    type: "Grain",
    branch: "Maganjo",
    quantity: 800,
    buyingPrice: 1000,
    sellingPrice: 1200
  },
  {
    id: 3,
    produce: "Soybeans",
    type: "Yellow",
    branch: "Matugga",
    quantity: 0,
    buyingPrice: 3500,
    sellingPrice: 4000
  }
];

const tableBody = document.querySelector("#stockTable tbody");
const stockSearch = document.getElementById("stockSearch");

let filterText = "";

function getStatus(kg) {
  if (kg === 0) return "out";
  if (kg <= 1000) return "low";
  return "available";
}

function renderStock() {
  tableBody.innerHTML = "";

  stockData
    .filter(item =>
      item.produce.toLowerCase().includes(filterText) ||
      item.branch.toLowerCase().includes(filterText)
    )
    .forEach(item => {

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

stockSearch.addEventListener("input", e => {
  filterText = e.target.value.toLowerCase();
  renderStock();
});

renderStock();
