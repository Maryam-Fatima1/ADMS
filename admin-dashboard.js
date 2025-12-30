document.addEventListener("DOMContentLoaded", () => {
  const TOKEN_KEY = "velvetbrew_admin_token";
  const token = localStorage.getItem(TOKEN_KEY);

  // If no token, force back to login
  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "admin-login.html";
    });
  }
});
