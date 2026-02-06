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




const form = document.getElementById("procureForm");
const toast = document.getElementById("toast");

/* Show Toast */
function showToast(message, type) {
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

/* Validation Helpers */
function isAlpha(text) {
  return /^[A-Za-z ]+$/.test(text);
}

function isAlphaNumeric(text) {
  return /^[A-Za-z0-9 ]+$/.test(text);
}

function isValidPhone(phone) {
  return /^07\d{8}$/.test(phone);
}

/* Tabs */
function showTab(tabName) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.style.display = "none";
  });

  document.getElementById(tabName).style.display = "block";

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.getElementById(tabName + "-btn").classList.add("active");
}


/* Form Validation */
form.addEventListener("submit", function (e) {
  e.preventDefault();
  

  const name = document.getElementById("name").value.trim();
  const type = document.getElementById("type").value.trim();
  const date = document.getElementById("date").value; 
  const time = document.getElementById("time").value;
  const tonnage = document.getElementById("tonnage").value;
  const cost = document.getElementById("cost").value;
  const dealer = document.getElementById("dealer").value.trim();
  const branch = document.getElementById("branch").value;
  const contact = document.getElementById("contact").value.trim();
  const price = document.getElementById("price").value;


  // Validation checks
  if(!name || !type || !date || !time || !tonnage || !cost || !dealer || !branch || !contact || !price) {
    return showToast("All fields are required", "error");
  }

  if (name.length < 2)
    return showToast("Produce name must be at least 2 characters", "error");

  if (type.length < 2)
    return showToast("Produce Type must be at least 2 characters", "error");

  if (!date)
    return showToast("Date is required", "error");

  if (!time)
    return showToast("Time is required", "error");

  if (isNaN(tonnage) || tonnage < 100)
    return showToast("Tonnage must be at least 100 KG", "error");

  if (isNaN(cost) || cost < 10000)
    return showToast("Cost must be at least UGX 10,000", "error");

  if (!isAlphaNumeric(dealer) || dealer.length < 2)
    return showToast("Invalid dealer name", "error");

  if (!branch)
    return showToast("Select a branch", "error");

  if (!isValidPhone(contact))
    return showToast("Invalid phone number (07XXXXXXXX)", "error");

  if (isNaN(price) || price > cost )
    return showToast(`Selling price must be less than cost (${cost})`, "error");

  // SUCCESS
  showToast("Produce recorded successfully", "success");
  form.reset();
});

