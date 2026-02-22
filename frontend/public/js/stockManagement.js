let stockData = []; // Initialize empty array

const tableBody = document.querySelector("#stockTable tbody");
const stockSearch = document.getElementById('stockSearch');

let currentFilter = '';

// Modal elements
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');

const editForm = document.getElementById('editForm');
const editName = document.getElementById('editName');
const editType = document.getElementById('editType');
const editBranch = document.getElementById('editBranch');
const editTonnage = document.getElementById('editTonnage');
const editPrice = document.getElementById('editPrice');

const editClose = document.getElementById('editClose');
const editCancel = document.getElementById('editCancel');

const deleteMessage = document.getElementById('deleteMessage');
const deleteConfirm = document.getElementById('deleteConfirm');
const deleteCancel = document.getElementById('deleteCancel');
const deleteClose = document.getElementById('deleteClose');

function getStatus(tonnage) {
  if (tonnage <= 10) return "out";
  if (tonnage <= 1000) return "low";
  return "available";
}

function renderStock() {
  tableBody.innerHTML = "";

  const list = stockData.filter(item => {
    if (!currentFilter) return true;
    const q = currentFilter.toLowerCase();
    return (
      String(item.name).toLowerCase().includes(q) ||
      String(item.type).toLowerCase().includes(q) ||
      String(item.branch).toLowerCase().includes(q) ||
      String(item.price).toLowerCase().includes(q) ||
      String(item.tonnage).toLowerCase().includes(q)
    );
  });

  list.forEach(item => {
    const status = getStatus(item.tonnage);

    const row = document.createElement("tr");
    row.className = status === "available" ? "" : status;

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.type}</td>
      <td>${item.branch}</td>
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
      <td class="actions">
        <button class="btn edit" onclick="editStock(${item.id})">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn delete" onclick="deleteStock(${item.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function editStock(id) {
  openEditModal(id);
}

function deleteStock(id) {
  openDeleteModal(id);
}

// --- Edit modal handlers ---
function openEditModal(id) {
  const item = stockData.find(i => i.id === id);
  if (!item) return;
  editForm.dataset.id = id;
  editName.value = item.name;
  editType.value = item.type;
  editBranch.value = item.branch;
  editTonnage.value = item.tonnage;
  editPrice.value = item.price;
  editModal.classList.add('open');
}

function closeEditModal() {
  editModal.classList.remove('open');
  delete editForm.dataset.id;
}

editClose.addEventListener('click', closeEditModal);
editCancel.addEventListener('click', closeEditModal);

editForm.addEventListener('submit', function (e) {
  e.preventDefault();
  const id = parseInt(editForm.dataset.id, 10);
  const idx = stockData.findIndex(i => i.id === id);
  if (idx === -1) return closeEditModal();

  stockData[idx].name = editName.value;
  stockData[idx].type = editType.value;
  stockData[idx].branch = editBranch.value;
  stockData[idx].tonnage = Number(editTonnage.value);
  stockData[idx].price = Number(editPrice.value);

  renderStock();
  closeEditModal();
});

// --- Delete modal handlers ---
let deleteTargetId = null;
function openDeleteModal(id) {
  const item = stockData.find(i => i.id === id);
  if (!item) return;
  deleteTargetId = id;
  deleteMessage.textContent = `Delete "${item.name}"? This cannot be undone.`;
  deleteModal.classList.add('open');
}

function closeDeleteModal() {
  deleteModal.classList.remove('open');
  deleteTargetId = null;
}

deleteClose.addEventListener('click', closeDeleteModal);
deleteCancel.addEventListener('click', closeDeleteModal);

deleteConfirm.addEventListener('click', function () {
  if (deleteTargetId == null) return closeDeleteModal();
  const index = stockData.findIndex(i => i.id === deleteTargetId);
  if (index !== -1) stockData.splice(index, 1);
  renderStock();
  closeDeleteModal();
});

// Fetch Stock Data from Backend
async function fetchStock() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/procurement', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      // Map backend data to frontend structure
      stockData = data.map(item => ({
        id: item._id,
        name: item.produceName,
        type: item.produceType,
        branch: item.branch,
        tonnage: item.tonnage,
        price: item.sellingPrice || 0 // Ensure price exists
      }));
      renderStock();
    }
  } catch (error) {
    console.error("Error loading stock:", error);
  }
}

// Initial load
document.addEventListener('DOMContentLoaded', fetchStock);

// wire search
if (stockSearch) {
  stockSearch.addEventListener('input', function (e) {
    currentFilter = e.target.value.trim();
    renderStock();
  });
}
