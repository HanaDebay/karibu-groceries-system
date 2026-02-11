let users = [
  { name: "Sarah", role: "Sales Agent", branch: "Matugga", status: "Active" },
  { name: "James", role: "Manager", branch: "Maganjo", status: "Active" }
];

let branches = [
  { name: "Matugga", location: "Matugga Town", manager: "Sarah", status: "Active" },
  { name: "Maganjo", location: "Maganjo Town", manager: "James", status: "Active" }
];


function renderUsers() {
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

  users.forEach((user, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.role}</td>
      <td>${user.branch}</td>
      <td><span class="badge active">${user.status}</span></td>
      <td>
        <button class="btn edit" onclick="editUser(${index})">Edit</button>
        <button class="btn delete" onclick="deleteUser(${index})">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function renderBranches() {
  const tbody = document.querySelector("#branchTable tbody");
  tbody.innerHTML = "";

  branches.forEach((branch, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${branch.name}</td>
      <td>${branch.location}</td>
      <td>${branch.manager}</td>
      <td><span class="badge active">${branch.status}</span></td>
      <td>
        <button class="btn edit" onclick="editBranch(${index})">Edit</button>
        <button class="btn delete" onclick="deleteBranch(${index})">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function addUser() {
  alert("Open Add User Modal (To be implemented with form)");
}

function deleteUser(index) {
  users.splice(index, 1);
  renderUsers();
}

function addBranch() {
  alert("Open Add Branch Modal (To be implemented)");
}

function deleteBranch(index) {
  branches.splice(index, 1);
  renderBranches();
}

renderUsers();
renderBranches();

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
