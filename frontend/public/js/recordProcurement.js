// Tabs functionality
const addBtn = document.getElementById("addProduce-btn");
const viewBtn = document.getElementById("viewProduce-btn");
const addTab = document.getElementById("addProduce");
const viewTab = document.getElementById("viewProduce");

addBtn.addEventListener("click", () => {
  addTab.style.display = "block";
  viewTab.style.display = "none";
  addBtn.classList.add("active");
  viewBtn.classList.remove("active");
});

viewBtn.addEventListener("click", () => {
  viewTab.style.display = "block";
  addTab.style.display = "none";
  viewBtn.classList.add("active");
  addBtn.classList.remove("active");
});

function showTab(tabName) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => (tab.style.display = "none"));

  document.getElementById(tabName).style.display = "block";

  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));
  document.getElementById(tabName + "-btn").classList.add("active");
}
window.onload = () => showTab("addProduce"); // Default tab
