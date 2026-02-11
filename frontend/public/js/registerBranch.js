document.getElementById("branchForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const branch = {
        branchName: document.getElementById("branchName").value,
        location: document.getElementById("location").value,
        manager: document.getElementById("manager").value,
        contact: document.getElementById("contact").value
    };

    console.log("Branch Registered:", branch);

    alert("Branch registered successfully!");

    this.reset();
});
