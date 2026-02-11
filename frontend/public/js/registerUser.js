document.getElementById("userForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const user = {
        fullName: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        role: document.getElementById("role").value,
        branch: document.getElementById("branch").value,
        password: document.getElementById("password").value
    };

    console.log("User Registered:", user);

    alert("User registered successfully!");

    this.reset();
});
