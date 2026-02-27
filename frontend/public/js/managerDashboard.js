// Sidebar Toggle
const toggleBtn = document.getElementById('toggleBtn');
const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    if(sidebar.classList.contains('collapsed')){
        main.style.marginLeft = '80px';
    } else {
        main.style.marginLeft = '250px';
    }
});

// Global Chart Instances
let stockChart, salesChart;

function initCharts() {
    // Stock Chart
    const stockCtx = document.getElementById("stockChart");
    if (stockCtx) {
        stockChart = new Chart(stockCtx, {
            type: "bar",
            data: {
                labels: [], // Dynamic
                datasets: [{
                    label: "Stock (KG)",
                    data: [], // Dynamic
                    backgroundColor: "#2c3e50"
                }]
            },
            options: { responsive: true }
        });
    }

    // Sales Chart
    const salesCtx = document.getElementById("salesChart");
    if (salesCtx) {
        salesChart = new Chart(salesCtx, {
            type: "line",
            data: {
                labels: [], // Dynamic
                datasets: [{
                    label: "Sales (UGX)",
                    data: [], // Dynamic
                    borderColor: "#2c3e50",
                    tension: 0.4,
                    fill: false
                }]
            },
            options: { responsive: true }
        });
    }
}

async function fetchDashboardData() {
    const token = localStorage.getItem("token");
    const branch = localStorage.getItem("branch");
    if (!token) return;

    try {
        // 1. Fetch Stock Data
        const stockRes = await fetch('/api/procurement', { headers: { 'Authorization': `Bearer ${token}` } });
        if (stockRes.ok) {
            const resData = await stockRes.json();
            const procurements = resData.data || [];
            
            // --- Summary Cards: Stock & Produce Type ---
            let totalStock = 0;
            const uniqueProduce = new Set();

            // Aggregate stock by produce name for this branch
            const stockMap = {};
            procurements.forEach(item => {
                if (item.branch === branch) {
                    if (item.stock > 0) {
                        totalStock += item.stock;
                        uniqueProduce.add(item.produceName);
                    }
                    stockMap[item.produceName] = (stockMap[item.produceName] || 0) + item.stock;
                }
            });

            // Update DOM for Stock Cards
            const totalProduceEl = document.getElementById('totalProduce'); // Ensure this ID exists in HTML
            const totalStockEl = document.getElementById('totalStock');     // Ensure this ID exists in HTML
            
            if (totalProduceEl) totalProduceEl.textContent = uniqueProduce.size;
            else console.warn("Element with ID 'totalProduce' not found in HTML");

            if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString() + " KG";
            else console.warn("Element with ID 'totalStock' not found in HTML");

            if (stockChart) {
                stockChart.data.labels = Object.keys(stockMap);
                stockChart.data.datasets[0].data = Object.values(stockMap);
                stockChart.update();
            }
        }

        // 2. Fetch Sales Data
        const salesRes = await fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } });
        if (salesRes.ok) {
            const resData = await salesRes.json();
            const sales = resData.data || [];
            console.log("Sales Data Fetched:", sales); // Debugging log

            // --- Summary Cards: Today's Sales & Credit Due ---
            // Use local date string (YYYY-MM-DD) to match user's timezone
            const now = new Date();
            const localToday = now.toLocaleDateString('en-CA'); 
            
            let todaysSalesTotal = 0;
            let totalCreditDue = 0;

            // --- FIX: Initialize weekly sales data for correct order ---
            const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const weeklySalesData = {
                'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
            };

            // Sort by date ascending
            sales.sort((a, b) => new Date(a.date || a.dispatchDate) - new Date(b.date || b.dispatchDate));
 
            sales.forEach(sale => {
                // Filter by branch (backend handles this, but double check doesn't hurt)
                if (!sale.branch || sale.branch === branch) {
                    
                    // Use date or dispatchDate (for credit sales)
                    const effectiveDate = sale.date || sale.dispatchDate;
                    if (!effectiveDate) return;

                    // Normalize sale date to YYYY-MM-DD
                    let saleDateStr = effectiveDate;
                    if (saleDateStr && saleDateStr.includes('T')) {
                        saleDateStr = saleDateStr.split('T')[0];
                    }

                    // Calculate Today's Sales (Cash + Credit Value)
                    if (saleDateStr === localToday) {
                        todaysSalesTotal += Number(sale.amount || 0);
                    }

                    // Calculate Total Credit Due (Outstanding)
                    if (sale.type === 'credit' && Number(sale.amountDue) > 0) {
                        totalCreditDue += Number(sale.amountDue);
                    }

                    // Use short weekday name (e.g., "Mon", "Tue")
                    const dateObj = new Date(effectiveDate);
                    if (isNaN(dateObj.getTime())) return; // Skip invalid dates

                    const dateLabel = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
                    const amount = Number(sale.amount) || 0;
                    
                    // Populate the pre-defined weekly data object
                    if (weeklySalesData.hasOwnProperty(dateLabel)) {
                        weeklySalesData[dateLabel] += Number(amount);
                    }
                }
            });

            // Update DOM for Sales Cards
            const todaySalesEl = document.getElementById('todaySales'); // Ensure this ID exists in HTML
            const creditDueEl = document.getElementById('creditDue');   // Ensure this ID exists in HTML
            
            if (todaySalesEl) todaySalesEl.textContent = "UGX " + todaysSalesTotal.toLocaleString();
            else console.warn("Element with ID 'todaySales' not found in HTML");

            if (creditDueEl) creditDueEl.textContent = "UGX " + totalCreditDue.toLocaleString();
            else console.warn("Element with ID 'creditDue' not found in HTML");

            if (salesChart) {
                salesChart.data.labels = weekDays;
                salesChart.data.datasets[0].data = weekDays.map(day => weeklySalesData[day]);
                salesChart.update();
            }
        } else {
            console.error("Failed to fetch sales data:", salesRes.status, salesRes.statusText);
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
