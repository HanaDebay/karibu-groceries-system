// c:\Users\USER\Documents\Ready4IT\karibu-groceries-system-local-version\frontend\public\js\registerUser.js

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Capture form values
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const role = document.getElementById('role').value;
    const branch = document.getElementById('branch').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 2. Basic Validation
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    const formData = {
        fullName,
        email,
        role,
        password
    };

    // Only add branch if it is provided (Director might not have one)
    if (branch) {
        formData.branch = branch;
    }

    try {
        // 3. Send data to Backend
        // Use relative path so it works on any port (5000, 7000, etc.)
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        // 4. Handle Response
        if (response.ok) {
            alert('User registered successfully!');
            // Optional: Redirect to login page
            // window.location.href = '/login.html'; 
            document.getElementById('userForm').reset();
        } else {
            alert('Error: ' + (result.message || 'Registration failed'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Is the backend server running?');
    }
});
