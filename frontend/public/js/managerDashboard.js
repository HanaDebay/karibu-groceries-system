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


// Stock Chart
new Chart(document.getElementById("stockChart"), {
  type: "bar",
  data: {
    labels: ["Beans", "Maize", "Cow Peas", "G-Nuts", "Soybeans"],
    datasets: [{
      label: "Stock (KG)",
      data: [2000, 5000, 3000, 1500, 7000],
      backgroundColor: "#2c3e50"
    }]
  },
  options: { responsive: true }
});

// Sales Chart
new Chart(document.getElementById("salesChart"), {
  type: "line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [{
      label: "Sales (UGX)",
      data: [900000, 650000, 900000, 700000, 1100000, 950000],
      borderColor: "#2c3e50",
      tension: 0.4,
      fill: false
    }]
  },
  options: { responsive: true }
});
