// Dummy data for demonstration
const cashSales = [
  { date: '2026-02-05', time: '09:30', produce: 'Beans', type: 'Red', tonnage: 1000, buyer: 'John Doe', amount: 1500000, agent: 'Alice' },
  { date: '2026-02-05', time: '11:15', produce: 'Maize', type: 'Grain', tonnage: 500, buyer: 'Mary Jane', amount: 800000, agent: 'Bob' },
  { date: '2026-02-05', time: '14:20', produce: 'G-nuts', type: 'White', tonnage: 300, buyer: 'Michael', amount: 600000, agent: 'Alice' }
];

const creditSales = [
  { date: '2026-02-05', time: '10:00', produce: 'Cow peas', type: 'Black', tonnage: 200, buyer: 'James', amount: 400000, agent: 'Bob' },
  { date: '2026-02-05', time: '13:30', produce: 'Soybeans', type: 'Yellow', tonnage: 150, buyer: 'Linda', amount: 300000, agent: 'Alice' }
];

let currentSales = cashSales;

// Elements
const salesBody = document.getElementById('salesBody');
const cashBtn = document.getElementById('cashBtn');
const creditBtn = document.getElementById('creditBtn');
const searchInput = document.getElementById('searchInput');

// Render table
function renderTable(sales) {
  salesBody.innerHTML = '';
  sales.forEach(sale => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sale.date}</td>
      <td>${sale.time}</td>
      <td>${sale.produce}</td>
      <td>${sale.type}</td>
      <td>${sale.tonnage}</td>
      <td>${sale.buyer}</td>
      <td>${sale.amount.toLocaleString()}</td>
      <td>${sale.agent}</td>
    `;
    salesBody.appendChild(row);
  });
}

// Search functionality
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = currentSales.filter(sale => 
    sale.produce.toLowerCase().includes(searchTerm) || 
    sale.buyer.toLowerCase().includes(searchTerm) || 
    sale.agent.toLowerCase().includes(searchTerm) ||
    sale.type.toLowerCase().includes(searchTerm)
    
  );
  renderTable(filtered);
});

// Button toggles
cashBtn.addEventListener('click', () => {
  currentSales = cashSales;
  renderTable(currentSales);
  cashBtn.classList.add('active');
  creditBtn.classList.remove('active');
  searchInput.value = '';
});

creditBtn.addEventListener('click', () => {
  currentSales = creditSales;
  renderTable(currentSales);
  creditBtn.classList.add('active');
  cashBtn.classList.remove('active');
  searchInput.value = '';
});

// Initial render
renderTable(currentSales);
