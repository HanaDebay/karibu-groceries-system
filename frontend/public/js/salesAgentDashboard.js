// Sidebar toggle
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

// Global Chart Instances
let weeklySalesChart, produceChart;

function initCharts() {
  // Weekly Sales Chart
  const weeklySalesCtx = document.getElementById("weeklySalesChart");
  if (weeklySalesCtx) {
    weeklySalesChart = new Chart(weeklySalesCtx, {
      type: "line",
      data: {
        labels: [], // Dynamic
        datasets: [{
          label: "Sales (UGX)",
          data: [], // Dynamic
          borderColor: "#2c3e50",
          backgroundColor: "#2c3e50",
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: "#2c3e50",
          pointBorderColor: "#2c3e50"
        }]
      }
    });
  }

  // Produce Breakdown Chart
  const produceCtx = document.getElementById("produceChart");
  if (produceCtx) {
    produceChart = new Chart(produceCtx, {
      type: "bar",
      data: {
        labels: [], // Dynamic
        datasets: [{
          label: "KG Sold",
          data: [], // Dynamic
          borderWidth: 1,
          backgroundColor: "#2c3e50"
        }]
      }
    });
  }
}

async function fetchDashboardData() {
  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName"); // Agent's name
  const userBranch = localStorage.getItem("branch");
  if (!token || !userName) return;

  try {
    // Fetch all sales data
    const salesRes = await fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } });
    if (salesRes.ok) {
      const resData = await salesRes.json();
      const allSales = resData.data || [];

      // Filter sales for the current agent
      const mySales = allSales.filter(sale => (sale.salesAgent === userName || sale.recordedBy === userName));

      // --- Initialize data for charts & cards ---
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weeklySalesData = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
      const produceSoldMap = {};
      
      let todaySalesTotal = 0;
      let totalProduceSold = 0;
      let totalCreditSales = 0;

      // Use local date for "Today" to avoid timezone issues (UTC vs Local)
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');


      mySales.forEach(sale => {
        const saleAmount = Number(sale.amount || sale.amountPaid || sale.amountDue || 0);
        const saleTonnage = Number(sale.tonnage || 0);
        
        // --- Aggregate for Summary Cards ---
        // 1. Total Produce Sold
        totalProduceSold += saleTonnage;

        // 2. Credit Sales (Accumulate if it's a credit sale)
        if (sale.saleType === 'credit' || sale.amountDue > 0) {
            totalCreditSales += saleAmount;
        }

        // --- Aggregate for Weekly Sales Chart ---
        const effectiveDate = sale.date || sale.dispatchDate;
        if (effectiveDate) {
          const dateObj = new Date(effectiveDate);
          if (!isNaN(dateObj.getTime())) {
            const dateLabel = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
            if (weeklySalesData.hasOwnProperty(dateLabel)) {
              weeklySalesData[dateLabel] += Number(sale.amount || 0);
            }
            
            // 3. Today's Sales
            // Compare date strings to check if it's today
            // Assuming sale.date is YYYY-MM-DD from the input field
            const saleDateStr = effectiveDate.split('T')[0]; 
            if (saleDateStr === todayStr || dateObj.toLocaleDateString('en-CA') === todayStr) {
                todaySalesTotal += saleAmount;
            }
          }
        }

        // --- Aggregate for Produce Breakdown Chart ---
        const produceName = sale.produceName;
        if (produceName && saleTonnage > 0) {
          produceSoldMap[produceName] = (produceSoldMap[produceName] || 0) + saleTonnage;
        }
      });

      // --- Update Summary Cards (Sales Data) ---
      document.getElementById('todaySales').textContent = `UGX ${todaySalesTotal.toLocaleString()}`;
      document.getElementById('produceSold').textContent = `${totalProduceSold.toLocaleString()} KG`;
      document.getElementById('creditSales').textContent = `UGX ${totalCreditSales.toLocaleString()}`;

      // --- Update Charts ---
      if (weeklySalesChart) {
        weeklySalesChart.data.labels = weekDays;
        weeklySalesChart.data.datasets[0].data = weekDays.map(day => weeklySalesData[day]);
        weeklySalesChart.update();
      }

      if (produceChart) {
        produceChart.data.labels = Object.keys(produceSoldMap);
        produceChart.data.datasets[0].data = Object.values(produceSoldMap);
        produceChart.update();
      }
    } else {
      console.error("Failed to fetch sales data:", salesRes.status);
    }

    // --- Fetch Procurement for "Available Produce" Card ---
    // We calculate stock from procurement because /api/stock might not exist or be up to date
    const stockRes = await fetch('/api/procurement', { headers: { 'Authorization': `Bearer ${token}` } });
    if (stockRes.ok) {
        const stockData = await stockRes.json();
        const procurements = stockData.data || [];
        
        // Filter stock by the agent's branch and ensure it has stock > 0
        const availableItems = new Set();
        procurements.forEach(item => {
            if (item.branch === userBranch && item.stock > 0) {
                availableItems.add(item.produceName);
            }
        });
        
        // Count unique produce types available
        const uniqueProduceCount = availableItems.size;
        
        document.getElementById('availableProduce').textContent = `${uniqueProduceCount} Types`;
    } else {
        console.error("Failed to fetch stock data");
    }

  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

// Display Logged In User Name and Branch
document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName');
    const branch = localStorage.getItem('branch');
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const welcomeMsg = document.getElementById('welcome-msg');
    const branchInfo = document.getElementById('branch-info');

    if (userName && welcomeMsg) {
        welcomeMsg.textContent = `Welcome, ${userName}`;
    } else {
        console.log("User name not found in localStorage");
    }
    if (branch && branchInfo) {
        branchInfo.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${branch} Branch`;
    }

    initCharts();
    fetchDashboardData();
});
