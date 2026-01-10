// Sidebar Toggle
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  sidebar.classList.toggle("active");
});

// Sales Line Chart
const ctx = document.getElementById("mySalesChart");

new Chart(ctx, {
  type: "line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [
      {
        label: "Sales (UGX)",
        data: [800000, 950000, 700000, 1100000, 1200000, 1550000],
        borderColor: "#2f855a",
        backgroundColor: "rgba(47,133,90,0.1)",
        tension: 0.4,
        fill: true,
        borderWidth: 2
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});
