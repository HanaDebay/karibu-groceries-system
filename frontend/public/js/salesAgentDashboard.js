// Sidebar toggle
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

// Weekly Sales Chart
const weeklySalesCtx = document.getElementById("weeklySalesChart");

new Chart(weeklySalesCtx, {
  type: "line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [{
      label: "Sales (UGX)",
      data: [200000, 350000, 150000, 400000, 250000, 300000],
      borderColor: "#2c3e50",  
      backgroundColor: "#2c3e50", 
      borderWidth: 3,
      tension: 0.4,
      pointBackgroundColor: "#2c3e50", 
      pointBorderColor: "#2c3e50" 
    }]
  }
});


// Produce Breakdown Chart
const produceCtx = document.getElementById("produceChart");

new Chart(produceCtx, {
  type: "bar",
  data: {
    labels: ["Beans", "Maize", "Soybeans", "G-Nuts", "Cow Peas"],
    datasets: [{
      label: "KG Sold",
      data: [800, 500, 300, 200, 300],
      borderWidth: 1,
      backgroundColor: "#2c3e50"
    }]
  }
});
