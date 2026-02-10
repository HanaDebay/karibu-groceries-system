// ===== Toast =====
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===== Toggle Forms =====
const cashBtn = document.getElementById("cashBtn");
const creditBtn = document.getElementById("creditBtn");
const cashForm = document.getElementById("cashSaleForm");
const creditForm = document.getElementById("creditSaleForm");

cashBtn.onclick = () => {
  cashForm.classList.remove("hidden");
  creditForm.classList.add("hidden");
  cashBtn.classList.add("active");
  creditBtn.classList.remove("active");
};

creditBtn.onclick = () => {
  creditForm.classList.remove("hidden");
  cashForm.classList.add("hidden");
  creditBtn.classList.add("active");
  cashBtn.classList.remove("active");
};

// ===== Validation Helpers =====
const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/;
const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/;
const ninRegex = /^(CM|CF)[A-Z0-9]{12}$/; //e.g. CM123456789012 or CF123456789012

function isEmpty(value) {
  return !value || value.trim() === "";
}

function isValidAmount(amount) {
  return !isNaN(amount) && amount.toString().length >= 5;
}

// ===== Submit Cash Sale =====
cashForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const form = e.target;
  const produceName = form.produceName.value.trim();
  const tonnage = form.tonnage.value.trim();
  const amountPaid = form.amountPaid.value.trim();
  const buyerName = form.buyerName.value.trim();

  if (!produceName || !tonnage || !amountPaid || !buyerName) {
    return showToast("All fields are required", "error");
  }

  if (!alphaNumRegex.test(produceName)) {
    return showToast(
      "Invalid produce name, it has to be at least 2 characters long",
      "error",
    );
  }

  if (tonnage <= 0) {
    return showToast("Invalid tonnage, it must be greater than 0", "error");
  }

  if (!isValidAmount(amountPaid)) {
    return showToast(
      "Invalid amount paid, it must be at least 5 digits long",
      "error",
    );
  }

  if (!alphaNumRegex.test(buyerName)) {
    return showToast(
      "Invalid buyer name, it has to be at least 2 characters long",
      "error",
    );
  }

  showToast("Cash sale recorded successfully!");
  cashForm.reset();
});

// ===== Submit Credit Sale =====
creditForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const form = e.target;

  const buyerName = form.buyerName.value.trim();
  const nin = form.nationalId.value.trim();
  const location = form.location.value.trim();
  const contact = form.contact.value.trim();
  const amountDue = form.amountDue.value.trim();
  const produceName = form.produceName.value.trim();
  const type = form.type.value.trim();
  const tonnage = form.tonnage.value.trim();
  const dueDate = form.dueDate.value;
  const salesAgent = "Logged-in Agent";
  const dispatchDate = new Date().toISOString().split("T")[0];

  const dispatch = new Date(dispatchDate);
  const due = new Date(dueDate);
  const today = new Date();

  dispatch.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // ===== Validation checks =====

  if (
    !buyerName ||
    !nin ||
    !location ||
    !contact ||
    !amountDue ||
    !produceName ||
    !type ||
    !tonnage ||
    !dueDate
  ) {
    return showToast("All fields are required", "error");
  }

  if (!alphaNumRegex.test(buyerName)) {
    return showToast(
      "Invalid buyer name, it has to be at least 2 characters long",
      "error",
    );
  }

  if (!ninRegex.test(nin)) {
    return showToast(
      "Invalid National ID (NIN), it must be in the format CMXXXXXXXXXXXX or CFXXXXXXXXXXXX",
      "error",
    );
  }

  if (!alphaNumRegex.test(location)) {
    return showToast(
      "Invalid location, it has to be at least 2 characters long",
      "error",
    );
  }

  if (!ugPhoneRegex.test(contact)) {
    return showToast(
      "Invalid phone number, it must be a valid Ugandan phone number",
      "error",
    );
  }

  if (!alphaNumRegex.test(produceName)) {
    return showToast(
      "Invalid produce name, it has to be at least 2 characters long",
      "error",
    );
  }

  if (tonnage <= 1000) {
    return showToast(
      "Invalid tonnage, it must be greater than 1000KG",
      "error",
    );
  }

  if (!isValidAmount(amountDue)) {
    return showToast("Amount due must be at least 5 digits", "error");
  }

  if (due < today) {
    return showToast("Due date cannot be in the past", "error");
  }

  if (isEmpty(type)) {
    return showToast("Produce type is required", "error");
  }

  if (due <= dispatch) {
    return showToast("Due date must be after the dispatch date", "error");
  }

  // ===== Passed all validations =====
  showToast("Credit sale recorded successfully!");
  creditForm.reset();
});
