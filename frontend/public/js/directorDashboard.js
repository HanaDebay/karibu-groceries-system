// Sidebar toggle
document.getElementById("toggleBtn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});

// Sales by branch chart
new Chart(document.getElementById("branchSalesChart"), {
  type: "bar",
  data: {
    labels: ["Matugga", "Maganjo"],
    datasets: [{
      label: "Sales (UGX)",
      data: [145000000, 100000000],
      backgroundColor: "#2c3e50"
    }]
  },
  options: {
    responsive: true
  }
});

// Credit vs Cash chart
new Chart(document.getElementById("creditChart"), {
  type: "doughnut",
  data: {
    labels: ["Cash Sales", "Credit Sales"],
    datasets: [{
      data: [226600000, 18400000],
      backgroundColor: ["#2c3e50", "#fc7b7b"]
    }]
  },
  options: {
    responsive: true
  }
});
