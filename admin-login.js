document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const errEl = document.getElementById("loginError");

  const TOKEN_KEY = "velvetbrew_admin_token";

  if (errEl) errEl.textContent = "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errEl) errEl.textContent = "";

    const email = (emailEl.value || "").trim();
    const password = passEl.value || "";

    try {
      const res = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save token
      localStorage.setItem(TOKEN_KEY, data.token);

      // Go to dashboard (we will build next)
      window.location.href = "admin-dashboard.html";
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
    }
  });
});
