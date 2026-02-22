const loginForm = document.getElementById('loginForm');

// Toast Helper
function showToast(message, type = 'error') {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const btnLogin = document.getElementById('btn-login');

  // Basic validation
  if (!email || !password) {
    return showToast("Please enter both email and password.", "error");
  }

  // Show loading state
  const originalBtnText = btnLogin.innerHTML;
  btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
  btnLogin.disabled = true;

  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const responseData = await response.json();

    if (response.ok) {
      // Handle nested structure: { success: true, data: { token: ..., user: ... } }
      const authData = responseData.data || responseData;

      // Save token and user details to localStorage
      localStorage.setItem('token', authData.token);
      
      // Access role and branch from the user object in the response
      // Check both nested 'user' object and top-level properties
      let userRole = (authData.user && authData.user.role) ? authData.user.role : authData.role;
      const userBranch = (authData.user && authData.user.branch) ? authData.user.branch : authData.branch;
      
      // Try to find name in various properties (fullName, name, or username)
      const userObj = authData.user || authData;
      const userName = userObj.fullName || userObj.name || userObj.username;

      console.log("Login Response:", responseData); // Debugging: Check console (F12) to see backend data
      console.log("Extracted Role:", userRole);
      console.log("Extracted Name:", userName);

      if (userRole) userRole = userRole.trim(); // Remove any accidental whitespace

      if (userName) localStorage.setItem('userName', userName);
      localStorage.setItem('role', userRole);
      
      if (userBranch) localStorage.setItem('branch', userBranch);

      // Redirect based on role
      if (userRole === 'Director') {
        window.location.href = 'directorDashboard.html';
      } else if (userRole === 'Manager') {
        window.location.href = 'managerDashboard.html';
      } else if (userRole === 'Sales Agent') {
        window.location.href = 'salesAgentDashboard.html';
      } else {
        showToast(`Unknown user role: "${userRole}". Please contact support.`, 'error');
      }
    } else {
      showToast(responseData.message || 'Invalid credentials', 'error');
    }
  } catch (error) {
    console.error('Login Error:', error);
    showToast('Something went wrong. Please try again later.', 'error');
  } finally {
    // Reset button state
    btnLogin.innerHTML = originalBtnText;
    btnLogin.disabled = false;
  }
});