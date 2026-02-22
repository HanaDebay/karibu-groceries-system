// Sidebar toggle
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});

// Sales by Branch Chart
new Chart(document.getElementById("branchSalesChart"), {
    type: "bar",
    data: {
        labels: ["Matugga", "Maganjo"],
        datasets: [{
            label: "Sales (UGX)",
            data: [52000000, 34300000],
        }]
    }
});

// Stock Distribution Chart
new Chart(document.getElementById("stockDistributionChart"), {
    type: "pie",
    data: {
        labels: ["Beans", "Maize", "G-nuts", "Soybeans", "Cow Peas"],
        datasets: [{
            data: [12000, 15000, 6000, 5000, 4500],
        }]
    }
});

// Display Logged In User Name
document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName');
    const userDisplay = document.getElementById('loggedInUser');
    if (userName && userDisplay) {
        userDisplay.innerHTML = `<i class="fa-solid fa-user-tie"></i> ${userName}`;
    }
});
