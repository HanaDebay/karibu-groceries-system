// Sidebar Toggle
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  sidebar.classList.toggle("active");
});

// Stock Chart
new Chart(document.getElementById("stockChart"), {
  type: "bar",
  data: {
    labels: ["Beans", "Maize", "Cow Peas", "G-Nuts", "Soybeans"],
    datasets: [{
      label: "Stock (KG)",
      data: [2000, 5000, 3000, 1500, 7000],
      backgroundColor: "#2f855a"
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
      data: [800000, 650000, 900000, 700000, 1100000, 950000],
      borderColor: "#2f855a",
      tension: 0.4,
      fill: false
    }]
  },
  options: { responsive: true }
});
