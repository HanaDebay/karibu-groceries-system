document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html"; // Redirect to login if not authenticated
  }

  // ===== Toast Notification =====
  function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ===== Tab Switching Logic =====
  const addProduceBtn = document.getElementById("addProduce-btn");
  const viewProduceBtn = document.getElementById("viewProduce-btn");
  const addProduceTab = document.getElementById("addProduce");
  const viewProduceTab = document.getElementById("viewProduce");

  window.showTab = function (tabName) {
    if (tabName === "addProduce") {
      addProduceTab.style.display = "block";
      viewProduceTab.style.display = "none";
      addProduceBtn.classList.add("active");
      viewProduceBtn.classList.remove("active");
    } else {
      addProduceTab.style.display = "none";
      viewProduceTab.style.display = "block";
      addProduceBtn.classList.remove("active");
      viewProduceBtn.classList.add("active");
      // Fetch procurements, respecting any existing search term
      fetchAndDisplayProcurements(document.getElementById('procureSearch').value.trim());
    }
  };

  // ===== Populate Branch From Logged-In User Data =====
  const branchInput = document.getElementById("branch");
  const topbarBranch = document.querySelector(".topbar span");
  const procureForm = document.getElementById("procureForm");
  const tonnageInput = document.getElementById("tonnage");
  const costInput = document.getElementById("cost");
  const costPerKgInput = document.getElementById("costPerKg");

  function updateCostPerKg() {
    // Display-only helper: keeps per-KG cost visible while user types.
    const tonnage = Number(tonnageInput?.value || 0);
    const cost = Number(costInput?.value || 0);
    if (!costPerKgInput) return;
    if (!tonnage || !cost) {
      costPerKgInput.value = "";
      return;
    }
    costPerKgInput.value = (cost / tonnage).toFixed(2);
  }

  if (tonnageInput) tonnageInput.addEventListener("input", updateCostPerKg);
  if (costInput) costInput.addEventListener("input", updateCostPerKg);

  try {
    const branch = localStorage.getItem("branch");
    if (branch) {
      branchInput.value = branch;
      topbarBranch.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${branch} Branch`;
    } else {
      throw new Error("Branch information not found. Please log in again.");
    }
  } catch (error) {
    showToast(error.message, "error");
    procureForm.style.display = "none"; // Hide form if no user context
  }

  // ===== Validation Helpers =====
  const alphaNumRegex = /^[a-zA-Z0-9 ]{2,}$/;
  const alphaRegex = /^[a-zA-Z ]{2,}$/;
  const ugPhoneRegex = /^(?:\+256|0)7\d{8}$/;

  // ===== Form Submission Logic =====
  procureForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(procureForm);
    const formProps = Object.fromEntries(formData.entries());

    // Map frontend form names to backend model names and keep legacy field compatibility.
    const data = {
      produceName: formProps.name,
      produceType: formProps.type,
      date: formProps.date,
      tonnage: formProps.tonnage,
      cost: formProps.cost,
      dealerName: formProps.dealer,
      contact: formProps.contact,
      sellingPricePerKg: formProps.sellingPricePerKg,
      sellingPrice: formProps.sellingPricePerKg,
      costPerKg: Number(formProps.tonnage || 0) > 0 ? Number(formProps.cost || 0) / Number(formProps.tonnage || 1) : 0,
      branch: formProps.branch, // This is from the readonly input
      time: formProps.time,
    };

    // --- Validation based on business rules ---
    if (!data.produceName || !data.produceType || !data.date || !data.tonnage || !data.cost || !data.dealerName || !data.contact || !data.sellingPricePerKg) {
      return showToast("All fields are required.", "error");
    }
    if (!alphaNumRegex.test(data.produceName)) {
      return showToast("Invalid produce name (alphanumeric, >= 2 chars).", "error");
    }
    if (!alphaRegex.test(data.produceType)) {
      return showToast("Invalid produce type (alphabetic, >= 2 chars).", "error");
    }
    if (parseInt(data.tonnage, 10) < 1000) {
      return showToast("Tonnage must be at least 1000 KG.", "error");
    }
    if (String(data.cost).length < 5 || isNaN(data.cost)) {
      return showToast("Total cost must be a number of at least 5 digits.", "error");
    }
    if (!alphaNumRegex.test(data.dealerName)) {
      return showToast("Invalid dealer name (alphanumeric, >= 2 chars).", "error");
    }
    if (!ugPhoneRegex.test(data.contact)) {
      return showToast("Please use a valid Ugandan phone number.", "error");
    }
    if (isNaN(data.sellingPricePerKg) || parseInt(data.sellingPricePerKg, 10) <= 0) {
      return showToast("Please enter a valid selling price per KG.", "error");
    }
    if (Number(data.sellingPricePerKg) < Number(data.costPerKg || 0)) {
      return showToast("Selling price per KG should be at least cost per KG.", "error");
    }

    // --- Backend Integration ---
    try {
      const response = await fetch('/api/procurement/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record procurement. Check console for details.');
      }

      showToast("Produce procured successfully!");
      procureForm.reset();
      // Repopulate readonly/computed fields after form reset.
      branchInput.value = localStorage.getItem("branch");
      updateCostPerKg();
      fetchAndDisplayProcurements(); // Refresh the list

    } catch (error) {
      console.error("Procurement Error:", error);
      showToast(error.message, "error");
    }
  });

  // ===== Search, Fetch, and Print Logic =====
  const procureSearch = document.getElementById('procureSearch');
  const printBtn = document.getElementById('printBtn');
  let searchTimeout;

  procureSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchAndDisplayProcurements(procureSearch.value.trim());
    }, 300); // Debounce to avoid excessive API calls
  });

  if (printBtn) {
    printBtn.addEventListener('click', async () => {
        const printTbody = document.querySelector("#printTbody");
        printTbody.innerHTML = '<tr><td colspan="8">Generating report...</td></tr>';

        const searchTerm = procureSearch.value.trim();
        // Always fetch all relevant data for printing, no limit
        const printUrl = searchTerm 
            ? `/api/procurement?search=${encodeURIComponent(searchTerm)}` 
            : '/api/procurement';

        try {
            const response = await fetch(printUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not fetch full report for printing.');
            
            const responseData = await response.json();
            const procurements = responseData.data || [];

            if (procurements.length === 0) {
                printTbody.innerHTML = '<tr><td colspan="8">No data to print.</td></tr>';
                showToast("No data found to generate a report.", "error");
                return;
            }

            // Populate the hidden print-only tbody
            printTbody.innerHTML = procurements.map(item => `
                <tr>
                  <td>${item.produceName}</td><td>${item.produceType}</td><td>${new Date(item.date).toLocaleDateString()}</td>
                  <td>${item.tonnage.toLocaleString()}</td><td>${(item.cost || 0).toLocaleString()}</td>
                  <td>${item.dealerName}</td><td>${item.branch}</td><td>${item.contact}</td>
                </tr>`).join('');
            
            // Now trigger the print dialog
            window.print();

        } catch (error) {
            showToast(error.message, "error");
            console.error("Print Error:", error);
            printTbody.innerHTML = `<tr><td colspan="8" class="error">${error.message}</td></tr>`;
        }
    });
  }

  async function fetchAndDisplayProcurements(searchTerm = "") {
    const tableBody = document.querySelector("#displayTbody");
    tableBody.innerHTML = '<tr><td colspan="8">Loading procurements...</td></tr>';

    let url = '/api/procurement?';
    if (searchTerm) {
      url += `search=${encodeURIComponent(searchTerm)}`;
    } else {
      url += 'limit=10';
    }

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch procurements.');
      }

      const responseData = await response.json();
      // Backend response shape: { success, data, message }
      const procurements = responseData.data || [];

      if (!procurements || procurements.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No procurements found for this branch.</td></tr>';
        return;
      }

      tableBody.innerHTML = procurements.map(item => `
        <tr>
          <td>${item.produceName}</td><td>${item.produceType}</td><td>${new Date(item.date).toLocaleDateString()}</td>
          <td>${item.tonnage.toLocaleString()}</td><td>${(item.cost || 0).toLocaleString()}</td>
          <td>${item.dealerName}</td><td>${item.branch}</td><td>${item.contact}</td>
        </tr>`).join('');
    } catch (error) {
      console.error("Fetch Procurements Error:", error);
      tableBody.innerHTML = `<tr><td colspan="8" class="error">${error.message}</td></tr>`;
    }
  }

  // Initially show the add produce tab
  showTab('addProduce');
});
