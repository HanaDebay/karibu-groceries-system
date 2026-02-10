const stockData = [
  { id: 1, name: "Beans", type: "Red", tonnage: 4200, price: 3500 },
  { id: 2, name: "Maize", type: "Grain", tonnage: 600, price: 1200 },
  { id: 3, name: "Soybeans", type: "Yellow", tonnage: 0, price: 4000 }
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
      item.name.toLowerCase().includes(filterText) ||
      item.type.toLowerCase().includes(filterText)
    )
    .forEach(item => {

      const status = getStatus(item.tonnage);
      const row = document.createElement("tr");
      if (status !== "available") row.classList.add(status);

      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.type}</td>
        <td>${item.tonnage}</td>
        <td>UGX ${item.price.toLocaleString()}</td>
        <td>
          ${
            status === "available"
              ? `<span class="badge success">Available</span>`
              : status === "low"
              ? `<span class="badge warning">Low Stock</span>`
              : `<span class="badge danger">Out of Stock</span>`
          }
        </td>
        <td>
          ${
            status === "out"
              ? `<button class="btn disabled" disabled>Sell</button>`
              : `<button class="btn sell" onclick="sellProduce(${item.id})">
                   <i class="fa-solid fa-cart-shopping"></i> Sell
                 </button>`
          }
        </td>
      `;

      tableBody.appendChild(row);
    });
}

function sellProduce(id) {
  const item = stockData.find(i => i.id === id);
  if (!item) return;
  alert(`Proceed to sell ${item.name}`);
  // later → redirect to record sale page with item pre-selected
}

stockSearch.addEventListener("input", e => {
  filterText = e.target.value.toLowerCase();
  renderStock();
});

renderStock();
