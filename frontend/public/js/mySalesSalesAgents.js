// Example sales data
const salesData = [
  { date: "2026-02-08", produce: "Beans", kg: 500, buyer: "John Traders", amount: 1250000 },
  { date: "2026-02-08", produce: "Maize", kg: 300, buyer: "Grace Stores", amount: 750000 },
  { date: "2026-02-09", produce: "Soybeans", kg: 200, buyer: "Alpha Millers", amount: 600000 },
  { date: "2026-02-09", produce: "G-Nuts", kg: 100, buyer: "Beta Traders", amount: 400000 }
];

const tableBody = document.querySelector("#salesTable tbody");
const totalKgEl = document.getElementById("totalKg");
const totalAmountEl = document.getElementById("totalAmount");
const salesSearch = document.getElementById("salesSearch");

let filterText = "";

// Render table
function renderSales() {
  tableBody.innerHTML = "";

  let totalKg = 0;
  let totalAmount = 0;

  salesData
    .filter(item =>
      item.produce.toLowerCase().includes(filterText) ||
      item.buyer.toLowerCase().includes(filterText) ||
      item.date.includes(filterText)
    )
    .forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.date}</td>
        <td>${item.produce}</td>
        <td>${item.kg}</td>
        <td>${item.buyer}</td>
        <td>UGX ${item.amount.toLocaleString()}</td>
      `;
      tableBody.appendChild(row);

      totalKg += item.kg;
      totalAmount += item.amount;
    });

  totalKgEl.textContent = totalKg.toLocaleString();
  totalAmountEl.textContent = totalAmount.toLocaleString();
}

// Search functionality
salesSearch.addEventListener("input", (e) => {
  filterText = e.target.value.toLowerCase();
  renderSales();
});

renderSales();
