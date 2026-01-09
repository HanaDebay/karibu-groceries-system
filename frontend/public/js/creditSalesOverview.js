// High-risk credit data (example)
const highRiskCredits = [
  {
    buyer: "John Mugisha",
    branch: "Matugga",
    amount: 2500000,
    days: 45,
    agent: "Sarah",
    contact: "0778123456"
  },
  {
    buyer: "Kato Traders",
    branch: "Maganjo",
    amount: 1800000,
    days: 62,
    agent: "Peter",
    contact: "0709123456"
  }
];

// Populate table
const table = document.getElementById("riskTable");

highRiskCredits.forEach(c => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${c.buyer}</td>
    <td>${c.branch}</td>
    <td>${c.amount.toLocaleString()}</td>
    <td>${c.days}</td>
    <td>${c.agent}</td>
    <td>${c.contact}</td>
  `;
  table.appendChild(row);
});

// Credit Aging Chart
new Chart(document.getElementById("agingChart"), {
  type: "doughnut",
  data: {
    labels: ["0-7 Days", "8-30 Days", "31-60 Days", "60+ Days"],
    datasets: [{
      data: [5200000, 4800000, 3200000, 5200000]
    }]
  }
});

// Branch Credit Chart
new Chart(document.getElementById("branchCreditChart"), {
  type: "bar",
  data: {
    labels: ["Matugga", "Maganjo"],
    datasets: [{
      label: "Credit Outstanding (UGX)",
      data: [11400000, 7000000]
    }]
  }
});
