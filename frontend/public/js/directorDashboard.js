// Sidebar toggle
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});

let branchSalesChart;
let stockDistributionChart;

function initCharts() {
    const branchSalesCtx = document.getElementById("branchSalesChart");
    if (branchSalesCtx) {
        branchSalesChart = new Chart(branchSalesCtx, {
            type: "bar",
            data: {
                labels: [],
                datasets: [{
                    label: "Sales (UGX)",
                    data: [],
                    backgroundColor: "#2c3e50"
                }]
            },
            options: { responsive: true }
        });
    }

    const stockDistributionCtx = document.getElementById("stockDistributionChart");
    if (stockDistributionCtx) {
        stockDistributionChart = new Chart(stockDistributionCtx, {
            type: "pie",
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ["#2c3e50", "#8e44ad", "#16a085", "#f39c12", "#c0392b", "#2980b9"]
                }]
            },
            options: { responsive: true }
        });
    }
}

async function fetchDirectorDashboardData() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const headers = { Authorization: `Bearer ${token}` };

        const [summaryRes, procurementRes, branchRes] = await Promise.all([
            fetch('/api/sales/director-summary', { headers }),
            fetch('/api/procurement', { headers }),
            fetch('/api/branches', { headers })
        ]);

        // Sales Summary
        if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            const summary = summaryData.data || {};

            const totalSales = Number(summary.totalSales || 0);
            const creditOutstanding = Number(summary.creditOutstanding || 0);
            const salesByBranch = Array.isArray(summary.salesByBranch) ? summary.salesByBranch : [];

            const totalSalesEl = document.getElementById('totalSales');
            const creditOutstandingEl = document.getElementById('creditOutstanding');

            if (totalSalesEl) totalSalesEl.textContent = `UGX ${totalSales.toLocaleString()}`;
            if (creditOutstandingEl) creditOutstandingEl.textContent = `UGX ${creditOutstanding.toLocaleString()}`;

            if (branchSalesChart) {
                branchSalesChart.data.labels = salesByBranch.map(item => item.branch);
                branchSalesChart.data.datasets[0].data = salesByBranch.map(item => Number(item.totalRevenue || 0));
                branchSalesChart.update();
            }
        } else {
            console.error("Failed to fetch sales summary:", summaryRes.status, summaryRes.statusText);
        }

        // Procurement / Stock
        if (procurementRes.ok) {
            const procurementData = await procurementRes.json();
            const procurements = procurementData.data || [];

            let totalStock = 0;
            const stockMap = {};

            procurements.forEach(item => {
                const stock = Number(item.stock || 0);
                if (stock > 0) {
                    totalStock += stock;
                    stockMap[item.produceName] = (stockMap[item.produceName] || 0) + stock;
                }
            });

            const totalStockEl = document.getElementById('totalStock');
            if (totalStockEl) totalStockEl.textContent = `${totalStock.toLocaleString()} KG`;

            if (stockDistributionChart) {
                stockDistributionChart.data.labels = Object.keys(stockMap);
                stockDistributionChart.data.datasets[0].data = Object.values(stockMap);
                stockDistributionChart.update();
            }
        } else {
            console.error("Failed to fetch procurement data:", procurementRes.status, procurementRes.statusText);
        }

        // Branches
        if (branchRes.ok) {
            const branchData = await branchRes.json();
            const branches = branchData.data || [];
            const activeCount = branches.filter(b => b.status === 'Active').length;

            const activeBranchesEl = document.getElementById('activeBranches');
            if (activeBranchesEl) activeBranchesEl.textContent = activeCount.toString();
        } else {
            console.error("Failed to fetch branches:", branchRes.status, branchRes.statusText);
        }
    } catch (error) {
        console.error("Error loading director dashboard data:", error);
    }
}

// Display Logged In User Name
document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName');
    const userDisplay = document.getElementById('loggedInUser');
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    if (userName && userDisplay) {
        userDisplay.innerHTML = `<i class="fa-solid fa-user-tie"></i> ${userName}`;
    }

    initCharts();
    fetchDirectorDashboardData();
});
