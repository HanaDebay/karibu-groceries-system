// Sample stock data am going to replace with DB fetch
let stockData = [
  { produce: "Beans", type: "Red", tonnage: 500, cost: 1500000, price: 2000000, branch: "Maganjo", status:"active"},
  { produce: "Maize", type: "Grain", tonnage: 50, cost: 1000000, price: 1500000, branch: "Matugga",status:"active" },
  { produce: "Soybeans", type: "Yellow", tonnage: 300, cost: 1200000, price: 1800000, branch: "Maganjo",status:"inactive" }
];

const stockTable = document.getElementById("stockTable").getElementsByTagName("tbody")[0];
const lowStockAlert = document.getElementById("lowStockAlert");
const modal = document.getElementById("updateModal");
const closeModal = document.querySelector(".close");
const updateForm = document.getElementById("updateForm");

let selectedIndex = null;

function renderTable() {
  stockTable.innerHTML = "";
  let lowStockItems = [];

  stockData.forEach((item, index) => {
    if(item.status !== "active") return
    
    const tr = document.createElement("tr");
    if (item.tonnage < 100) {
      tr.classList.add("low-stock");
      lowStockItems.push(item.produce);
    }

    tr.innerHTML = `
      <td>${item.produce}</td>
      <td>${item.type}</td>
      <td>${item.tonnage}</td>
      <td>${item.cost}</td>
      <td>${item.price}</td>
      <td>${item.branch}</td>
      <td>
        <button class="edit" onclick="openModal(${index})">
          <i class="fas fa-pen"></i> Edit
        </button>
        <button class="deactivate" onclick="openDeactivate(${index})">
          <i class="fas fa-ban"></i> Deactivate
        </button>
      </td>`;
    stockTable.appendChild(tr);
  });

  if (lowStockItems.length > 0) {
    lowStockAlert.textContent = "Low Stock Alert: " + lowStockItems.join(", ");
  } else {
    lowStockAlert.textContent = "";
  }
}

// Modal
function openModal(index) {
  selectedIndex = index;
  const item = stockData[index];
  document.getElementById("updateProduce").value = item.produce;
  document.getElementById("updateTonnage").value = item.tonnage;
  document.getElementById("updatePrice").value = item.price;
  modal.style.display = "block";
}

closeModal.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

updateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const tonnage = Number(document.getElementById("updateTonnage").value);
  const price = Number(document.getElementById("updatePrice").value);

  stockData[selectedIndex].tonnage = tonnage;
  stockData[selectedIndex].price = price;

  modal.style.display = "none";
  renderTable();
});

// deactivate logic
const deactivateModal = document.getElementById("deactivateModal");
const confirmDeactivate = document.getElementById("confirmDeactivate");

let deactivateIndex = null;

window.openDeactivate = (index) => {
  deactivateIndex = index;
  deactivateModal.style.display = "block";
};

window.closeDeactivate = () => {
  deactivateModal.style.display = "none";
};

confirmDeactivate.onclick = () => {
  stockData[deactivateIndex].status = "inactive";
  deactivateModal.style.display = "none";
  renderTable();
};

renderTable();
