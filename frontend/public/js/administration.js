let users = [];
let branches = [];

const token = localStorage.getItem('token');
let selectedUserId = null;
let userFilterText = "";
let branchFilterText = "";

// Toast Helper
function showToast(message, type = 'success') {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// --- Fetch Data ---
async function fetchData() {
  try {
    // Fetch Users
    const userRes = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
    if (userRes.ok) {
        const userData = await userRes.json();
        // Handle if backend returns { data: [...] } or just [...]
        users = Array.isArray(userData) ? userData : (userData.data || []);
    }

    // Fetch Branches
    const branchRes = await fetch('/api/branches', { headers: { 'Authorization': `Bearer ${token}` } });
    if (branchRes.ok) {
        const branchData = await branchRes.json();
        // Handle if backend returns { data: [...] } or just [...]
        branches = Array.isArray(branchData) ? branchData : (branchData.data || []);
    } else {
        console.warn("Branches fetch failed or not implemented yet");
    }

    renderUsers();
    renderBranches();
    populateBranchSelect();
  } catch (error) {
    console.error("Error fetching data:", error);
    showToast("Failed to load data", "error");
  }
}

// --- Render Functions ---
function renderUsers() {
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

  if (!Array.isArray(users)) return; // Safety check

  const filteredUsers = users.filter(user => {
    const text = [
      user.fullName,
      user.role,
      user.branch,
      user.email
    ].map(value => String(value || "").toLowerCase()).join(" ");
    return text.includes(userFilterText);
  });

  filteredUsers.forEach((user, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${user.fullName}</td>
      <td>${user.role}</td>
      <td>${user.branch || '-'}</td>
      <td><span class="badge active">Active</span></td>
      <td>
        <button class="btn secondary" onclick="openUpdateUserModal('${user._id}', '${user.email || ""}')">
          <i class="fa-solid fa-key"></i>
        </button>
        <button class="btn delete" onclick="deleteUser('${user._id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function renderBranches() {
  const tbody = document.querySelector("#branchTable tbody");
  tbody.innerHTML = "";

  if (!Array.isArray(branches)) return; // Safety check

  const filteredBranches = branches.filter(branch => {
    const text = [branch.name, branch.location, branch.manager]
      .map(value => String(value || "").toLowerCase()).join(" ");
    return text.includes(branchFilterText);
  });

  filteredBranches.forEach((branch, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${branch.name}</td>
      <td>${branch.location}</td>
      <td>${branch.manager || '-'}</td>
      <td><span class="badge active">Active</span></td>
      <td>
        <button class="btn delete" onclick="deleteBranch('${branch._id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function populateBranchSelect() {
  const select = document.getElementById('userBranch');
  select.innerHTML = '<option value="">Select Branch</option>';
  
  if (!Array.isArray(branches)) return; // Safety check

  branches.forEach(b => {
    const option = document.createElement('option');
    option.value = b.name;
    option.textContent = b.name;
    select.appendChild(option);
  });
}

// --- Modal Functions ---
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function openUpdateUserModal(id, email) {
  selectedUserId = id;
  const emailInput = document.getElementById("updateUserEmail");
  const passwordInput = document.getElementById("updateUserPassword");
  if (emailInput) emailInput.value = email || "";
  if (passwordInput) passwordInput.value = "";
  openModal("updateUserModal");
}

// --- Form Submissions ---

// Add User
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    fullName: document.getElementById('userName').value,
    email: document.getElementById('userEmail').value,
    role: document.getElementById('userRole').value,
    branch: document.getElementById('userBranch').value,
    password: document.getElementById('userPassword').value
  };

  try {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (res.ok) {
      showToast("User registered successfully");
      closeModal('userModal');
      e.target.reset();
      fetchData(); // Refresh list
    } else {
      showToast(data.message || "Registration failed", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
});

// Update User (Email/Password)
document.getElementById('updateUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedUserId) {
    showToast("No user selected", "error");
    return;
  }

  const email = document.getElementById('updateUserEmail').value.trim();
  const password = document.getElementById('updateUserPassword').value.trim();

  if (!email && !password) {
    showToast("Provide email or password to update", "error");
    return;
  }

  const payload = {};
  if (email) payload.email = email;
  if (password) payload.password = password;

  try {
    const res = await fetch(`/api/users/${selectedUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      showToast("User updated successfully");
      closeModal('updateUserModal');
      e.target.reset();
      fetchData();
    } else {
      showToast(data.message || "Update failed", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
});

// Add Branch
document.getElementById('addBranchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('branchName').value,
    location: document.getElementById('branchLocation').value
  };

  try {
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      showToast("Branch added successfully");
      closeModal('branchModal');
      e.target.reset();
      fetchData(); // Refresh list
    } else {
      showToast("Failed to add branch", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
});

// --- Delete Placeholders ---
async function deleteUser(id) {
  if(!confirm("Are you sure?")) return;
  try {
    await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchData();
    showToast("User deleted");
  } catch(e) { showToast("Error deleting user", "error"); }
}

async function deleteBranch(id) {
  if(!confirm("Are you sure?")) return;
  // Assuming delete endpoint exists
  showToast("Delete functionality requires backend endpoint", "error");
}

// Initialize
document.addEventListener('DOMContentLoaded', fetchData);

const userSearchInput = document.getElementById("userSearch");
if (userSearchInput) {
  userSearchInput.addEventListener("input", (e) => {
    userFilterText = e.target.value.trim().toLowerCase();
    renderUsers();
  });
}

const branchSearchInput = document.getElementById("branchSearch");
if (branchSearchInput) {
  branchSearchInput.addEventListener("input", (e) => {
    branchFilterText = e.target.value.trim().toLowerCase();
    renderBranches();
  });
}

function switchAdminView(view) {
  const usersSection = document.getElementById("usersSection");
  const branchesSection = document.getElementById("branchesSection");

  const usersBtn = document.getElementById("usersBtn");
  const branchesBtn = document.getElementById("branchesBtn");

  if (view === "users") {
    usersSection.style.display = "block";
    branchesSection.style.display = "none";

    usersBtn.classList.add("active");
    branchesBtn.classList.remove("active");
  } else {
    usersSection.style.display = "none";
    branchesSection.style.display = "block";

    branchesBtn.classList.add("active");
    usersBtn.classList.remove("active");
  }
}
