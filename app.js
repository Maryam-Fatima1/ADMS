/* =========================================================
   Velvet Brew | app.js
   Purpose:
   1) Mobile navbar toggle (open/close)
   2) Auto footer year
   3) Cart badge count from localStorage
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 1) MOBILE NAV TOGGLE
  // =========================
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });

    // Close the menu when clicking a link (mobile UX)
    navLinks.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList && target.classList.contains("nav-link")) {
        navLinks.classList.remove("open");
      }
    });

    // Close menu if user clicks outside nav (clean, professional behavior)
    document.addEventListener("click", (e) => {
      const clickedInsideNav = navLinks.contains(e.target);
      const clickedToggle = navToggle.contains(e.target);

      if (!clickedInsideNav && !clickedToggle) {
        navLinks.classList.remove("open");
      }
    });
  }

  // =========================
  // 2) FOOTER YEAR
  // =========================
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // =========================
  // 3) CART BADGE
  // =========================
  updateCartBadge();
});

/**
 * Reads cart from localStorage and updates the cart badge number.
 * Storage key is flexible: it tries a few common names.
 */
function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;

  // Try multiple keys so it works even if you used a different name earlier
  const possibleKeys = [
    "velvetbrew_cart_v1",
    "cafebrand_cart_v1",
    "cart",
    "vb_cart"
  ];

  let cart = [];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cart = parsed;
          break;
        }
      } catch (err) {
        // If parsing fails, ignore and continue
      }
    }
  }

  // Count total quantity if it exists, otherwise count items
  let total = 0;
  cart.forEach((item) => {
    const qty = Number(item.qty || item.quantity || 1);
    total += isNaN(qty) ? 1 : qty;
  });

  badge.textContent = total;

  // Hide badge if empty (more professional)
  if (total <= 0) {
    badge.style.display = "none";
  } else {
    badge.style.display = "grid";
  }
}

/**
 * Optional helper you can call after adding/removing cart items on other pages.
 * Example: window.refreshCartBadge();
 */
window.refreshCartBadge = updateCartBadge;





