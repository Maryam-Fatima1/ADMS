/* =========================================================
   Velvet Brew | order-success.js
   Reads last order data from localStorage and renders receipt.
   For now (frontend): we create a demo receipt if none exists.
   Later (backend): set velvetbrew_last_order after POST /api/orders
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const LAST_ORDER_KEY = "velvetbrew_last_order";

  const receiptEmpty = document.getElementById("receiptEmpty");
  const receiptGrid = document.querySelector(".receipt-grid");

  const orderTypeChip = document.getElementById("orderTypeChip");
  const orderIdText = document.getElementById("orderIdText");
  const etaText = document.getElementById("etaText");
  const branchText = document.getElementById("branchText");

  const addressRow = document.getElementById("addressRow");
  const addressText = document.getElementById("addressText");

  const receiptItems = document.getElementById("receiptItems");

  const subtotalText = document.getElementById("subtotalText");
  const taxText = document.getElementById("taxText");
  const totalText = document.getElementById("totalText");

  const trackBtn = document.getElementById("trackBtn");

  // 1) Load last order (or create demo)
  const order = readLastOrder() || createDemoOrder();

  // 2) If still no order (should not happen), show empty state
  if (!order) {
    if (receiptGrid) receiptGrid.style.display = "none";
    if (receiptEmpty) receiptEmpty.style.display = "block";
    return;
  }

  // 3) Render
  render(order);

  // =========================================================
  // Helpers
  // =========================================================

  function readLastOrder() {
    try {
      const raw = localStorage.getItem(LAST_ORDER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function render(o) {
    const type = (o.type || "Delivery").toLowerCase();
    const isDelivery = type === "delivery";

    if (orderTypeChip) orderTypeChip.textContent = isDelivery ? "Delivery" : "Pickup";
    if (orderIdText) orderIdText.textContent = o.orderId || "VB-00000";
    if (etaText) etaText.textContent = o.eta || (isDelivery ? "30–45 mins" : "15–25 mins");
    if (branchText) branchText.textContent = o.branch || "Velvet Brew";

    // Address
    if (addressRow && addressText) {
      if (isDelivery && o.address) {
        addressRow.style.display = "flex";
        addressText.textContent = o.address;
      } else {
        addressRow.style.display = "none";
      }
    }

    // Items
    if (receiptItems) {
      receiptItems.innerHTML = "";
      const items = Array.isArray(o.items) ? o.items : [];

      items.forEach((it) => {
        const li = document.createElement("li");

        const opts = it.optionsText || formatOptions(it.options);
        const qty = Number(it.qty || 1);
        const price = Number(it.price || 0);

        li.innerHTML = `
          <div class="r-left">
            <div class="r-name">${escapeHtml(it.name || "Item")} <span style="opacity:0.8;">x${qty}</span></div>
            <div class="r-opts">${escapeHtml(opts)}</div>
          </div>
          <div class="r-right">${money(price * qty)}</div>
        `;

        receiptItems.appendChild(li);
      });
    }

    // Totals
    const totals = calcTotals(o);
    if (subtotalText) subtotalText.textContent = money(totals.subtotal);
    if (taxText) taxText.textContent = money(totals.tax);
    if (totalText) totalText.textContent = money(totals.total);

    // Track button: prefill params (for later)
    // Track page currently uses manual inputs, but this is still helpful for future.
    if (trackBtn) {
      const oid = encodeURIComponent(o.orderId || "");
      const phone = encodeURIComponent((o.phone || "").replace(/\D/g, ""));
      trackBtn.href = `track-order.html?orderId=${oid}&phone=${phone}`;
    }
  }

  function calcTotals(o) {
    const items = Array.isArray(o.items) ? o.items : [];
    const subtotal = items.reduce((sum, it) => {
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      return sum + (price * qty);
    }, 0);

    // Simple tax for frontend demo (you can change later)
    const taxRate = typeof o.taxRate === "number" ? o.taxRate : 0.08;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      subtotal: round2(subtotal),
      tax: round2(tax),
      total: round2(total)
    };
  }

  function formatOptions(options) {
    if (!options || typeof options !== "object") return "";

    const parts = [];
    if (options.size) parts.push(options.size);
    if (options.milk) parts.push(options.milk);

    if (Array.isArray(options.extras) && options.extras.length) {
      parts.push(options.extras.join(", "));
    }

    return parts.join(", ");
  }

  function money(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  function round2(n) {
    return Number(Number(n || 0).toFixed(2));
  }

  function createDemoOrder() {
    // If user opens receipt page directly without checkout,
    // this demo keeps the page looking "real" for now.
    return {
      orderId: "VB-10294",
      phone: "03001234567",
      type: "Delivery",
      eta: "25–35 mins",
      branch: "Velvet Brew, Gulberg",
      address: "Block C, Gulberg, Lahore",
      taxRate: 0.08,
      items: [
        { name: "Velvet Latte", qty: 1, price: 6.90, optionsText: "Large, Oat Milk, Extra Shot" },
        { name: "Butter Croissant", qty: 1, price: 3.80, optionsText: "Warmed" }
      ]
    };
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
