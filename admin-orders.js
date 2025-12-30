/* =========================================================
   Velvet Brew | admin-orders.js
   Admin Orders Page
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";
  const TOKEN_KEY = "velvetbrew_admin_token";

  // Protect page
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  // Match IDs from admin-orders.html
  const ordersWrap = document.getElementById("ordersList");
  const ordersEmpty = document.getElementById("ordersEmpty");
  const refreshBtn = document.getElementById("refreshOrders");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!ordersWrap) {
    console.error("ordersList element not found in admin-orders.html");
    return;
  }

  if (refreshBtn) refreshBtn.addEventListener("click", loadOrders);

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "admin-login.html";
    });
  }

  loadOrders();

  async function loadOrders() {
    ordersWrap.innerHTML = `<div class="admin-loading">Loading orders...</div>`;
    if (ordersEmpty) ordersEmpty.style.display = "none";

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "GET"
        // If you later protect orders route, enable this:
        // headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET /api/orders failed (${res.status}) ${text}`);
      }

      const json = await res.json().catch(() => ({}));
      const orders = Array.isArray(json.data) ? json.data : [];

      if (!orders.length) {
        ordersWrap.innerHTML = "";
        if (ordersEmpty) ordersEmpty.style.display = "block";
        return;
      }

      if (ordersEmpty) ordersEmpty.style.display = "none";
      ordersWrap.innerHTML = orders.map(renderOrder).join("");
    } catch (err) {
      console.error(err);
      ordersWrap.innerHTML = `<div class="admin-error">Failed to fetch orders</div>`;
      if (ordersEmpty) ordersEmpty.style.display = "none";
    }
  }

  function renderOrder(o) {
    const orderId = escapeHtml(o.orderId || o._id || "ORDER");
    const created = o.createdAt ? new Date(o.createdAt).toLocaleString() : "";
    const status = escapeHtml(o.status || "Placed");

    const customerName = escapeHtml(o.customerName || "Customer");
    const phone = escapeHtml(o.phone || "");
    const type = escapeHtml(o.type || "");
    const address = escapeHtml(o.address || "");
    const branch = escapeHtml(o.branch || "");

    const items = Array.isArray(o.items) ? o.items : [];
    const itemsHtml = items.length
      ? items.map((it) => {
          const name = escapeHtml(it.name || "Item");
          const qty = Number(it.qty || 1);
          const price = Number(it.price || 0).toFixed(2);
          const options = escapeHtml(it.optionsText || "");
          return `
            <li class="order-item">
              <div class="order-item-left">
                <div class="order-item-name">${name}</div>
                ${options ? `<div class="order-item-opt">${options}</div>` : ""}
              </div>
              <div class="order-item-right">
                <span class="order-item-qty">x${qty}</span>
                <span class="order-item-price">$${price}</span>
              </div>
            </li>
          `;
        }).join("")
      : `<li class="order-item">No items found</li>`;

    const subtotal = Number(o.subtotal || 0).toFixed(2);
    const tax = Number(o.tax || 0).toFixed(2);
    const total = Number(o.total || 0).toFixed(2);

    return `
      <article class="order-card">
        <div class="order-top">
          <div class="order-top-left">
            <div class="order-title">Order</div>
            <div class="order-id">${orderId}</div>
            <div class="order-date">${escapeHtml(created)}</div>
          </div>

          <div class="order-top-right">
            <div class="order-status">${status}</div>
            <div class="order-total">$${total}</div>
          </div>
        </div>

        <div class="order-customer">
          <div class="order-customer-name">${customerName}</div>
          ${phone ? `<div class="order-customer-line">📞 ${phone}</div>` : ""}
          ${type ? `<div class="order-customer-line">🧾 ${type}</div>` : ""}
          ${branch ? `<div class="order-customer-line">🏬 ${branch}</div>` : ""}
          ${address ? `<div class="order-customer-line">📍 ${address}</div>` : ""}
        </div>

        <ul class="order-items">
          ${itemsHtml}
        </ul>

        <div class="order-summary">
          <div>Subtotal: <strong>$${subtotal}</strong></div>
          <div>Tax: <strong>$${tax}</strong></div>
          <div>Total: <strong>$${total}</strong></div>
        </div>
      </article>
    `;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
