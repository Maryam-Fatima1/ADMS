/* =========================================================
   Velvet Brew | checkout.js
   Frontend checkout flow:
   - Reads cart from localStorage (velvetbrew_cart_v1)
   - Renders items with options
   - Quantity +/- updates totals live
   - Delivery/Pickup toggle controls address field
   - Place order saves velvetbrew_last_order + clears cart
   - Redirects to order-success.html
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const CART_KEY = "velvetbrew_cart_v1";

  const LAST_ORDER_KEY = "velvetbrew_last_order";

  // Elements
  const cartEmpty = document.getElementById("cartEmpty");
  const checkoutGrid = document.getElementById("checkoutGrid");

  const modeDelivery = document.getElementById("modeDelivery");
  const modePickup = document.getElementById("modePickup");

  const deliveryHead = document.getElementById("deliveryHead");
  const addressField = document.getElementById("addressField");
  const addressInput = document.getElementById("address");

  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutItems = document.getElementById("checkoutItems");

  const summaryCount = document.getElementById("summaryCount");
  const sumSubtotal = document.getElementById("sumSubtotal");
  const sumTax = document.getElementById("sumTax");
  const sumTotal = document.getElementById("sumTotal");

  const placeOrderBtn = document.getElementById("placeOrderBtn");
  const placeOrderMobile = document.getElementById("placeOrderMobile");

  const branchSelect = document.getElementById("branch");
  const etaInput = document.getElementById("eta");

  const upsellRow = document.getElementById("upsellRow");

  let mode = "delivery"; // delivery | pickup
  let cart = readCart();

  // Init
  if (!cart.length) {
    showEmpty();
    return;
  }
  showCheckout();
  renderAll();

  // Mode toggle
  if (modeDelivery) {
    modeDelivery.addEventListener("click", () => setMode("delivery"));
  }
  if (modePickup) {
    modePickup.addEventListener("click", () => setMode("pickup"));
  }

  // Place order (right button)
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", () => {
      if (checkoutForm) checkoutForm.requestSubmit();
    });
  }

  // Form submit (mobile button inside form)
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      placeOrder();
    });
  }

  // Quantity +/- and remove
  document.addEventListener("click", (e) => {
    const plus = e.target.closest("[data-action='plus']");
    const minus = e.target.closest("[data-action='minus']");
    const remove = e.target.closest("[data-action='remove']");
    const upsellAdd = e.target.closest("[data-action='upsell-add']");

    if (plus) {
      const id = plus.dataset.id;
      const optKey = plus.dataset.optkey;
      updateQty(id, optKey, +1);
    }

    if (minus) {
      const id = minus.dataset.id;
      const optKey = minus.dataset.optkey;
      updateQty(id, optKey, -1);
    }

    if (remove) {
      const id = remove.dataset.id;
      const optKey = remove.dataset.optkey;
      removeItem(id, optKey);
    }

    if (upsellAdd) {
      addUpsell(upsellAdd.dataset.item || "");
    }
  });

  // Branch change affects ETA slightly (simple professional touch)
  if (branchSelect && etaInput) {
    branchSelect.addEventListener("change", () => {
      const b = branchSelect.value || "";
      etaInput.value = b.includes("Gulberg") ? "25–35 mins" : "30–45 mins";
    });
  }

  // =========================================================
  // Functions
  // =========================================================

  function showEmpty() {
    if (cartEmpty) cartEmpty.style.display = "block";
    if (checkoutGrid) checkoutGrid.style.display = "none";
  }

  function showCheckout() {
    if (cartEmpty) cartEmpty.style.display = "none";
    if (checkoutGrid) checkoutGrid.style.display = "grid";
  }

  function setMode(next) {
    mode = next;

    if (modeDelivery) {
      modeDelivery.classList.toggle("active", mode === "delivery");
      modeDelivery.setAttribute("aria-selected", mode === "delivery" ? "true" : "false");
    }
    if (modePickup) {
      modePickup.classList.toggle("active", mode === "pickup");
      modePickup.setAttribute("aria-selected", mode === "pickup" ? "true" : "false");
    }

    const isDelivery = mode === "delivery";

    if (deliveryHead) deliveryHead.style.display = isDelivery ? "block" : "none";
    if (addressField) addressField.style.display = isDelivery ? "block" : "none";

    if (addressInput) {
      addressInput.required = isDelivery;
      if (!isDelivery) addressInput.value = "";
    }
  }

  function renderAll() {
    // If someone opens checkout directly and cart is empty
    cart = readCart();
    if (!cart.length) {
      showEmpty();
      return;
    }

    renderItems();
    renderSummary();
    renderUpsell();

    if (typeof window.refreshCartBadge === "function") {
      window.refreshCartBadge();
    }
  }

  function renderItems() {
    if (!checkoutItems) return;
    checkoutItems.innerHTML = "";

    cart.forEach((it) => {
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      const optKey = buildOptKey(it.options);

      const li = document.createElement("li");
      li.className = "ci";

      li.innerHTML = `
        <div class="ci-top">
          <div>
            <div class="ci-name">${escapeHtml(it.name || "Item")}</div>
            <div class="ci-opts">${escapeHtml(optionsText(it))}</div>
          </div>
          <div class="ci-right">${money(price * qty)}</div>
        </div>

        <div class="ci-bottom">
          <div class="qty" aria-label="Quantity controls">
            <button type="button" data-action="minus" data-id="${escapeAttr(it.id)}" data-optkey="${escapeAttr(optKey)}" aria-label="Decrease">−</button>
            <span>${qty}</span>
            <button type="button" data-action="plus" data-id="${escapeAttr(it.id)}" data-optkey="${escapeAttr(optKey)}" aria-label="Increase">+</button>
          </div>

          <button type="button" class="remove-btn" data-action="remove" data-id="${escapeAttr(it.id)}" data-optkey="${escapeAttr(optKey)}">Remove</button>
        </div>
      `;

      checkoutItems.appendChild(li);
    });
  }

  function renderSummary() {
    const totals = calcTotals();

    if (summaryCount) summaryCount.textContent = `${totals.count} items`;
    if (sumSubtotal) sumSubtotal.textContent = money(totals.subtotal);
    if (sumTax) sumTax.textContent = money(totals.tax);
    if (sumTotal) sumTotal.textContent = money(totals.total);
  }

  function renderUpsell() {
    if (!upsellRow) return;

    // Simple static upsell list (you can make smart later)
    const suggestions = [
      { name: "Butter Croissant", price: 3.80, note: "Flaky, buttery, perfect with espresso" },
      { name: "Chocolate Cookie", price: 2.40, note: "Warm, rich, sweet finish" }
    ];

    upsellRow.innerHTML = "";
    suggestions.forEach((s) => {
      const div = document.createElement("div");
      div.className = "upsell";
      div.innerHTML = `
        <div class="upsell-left">
          <div class="upsell-name">${escapeHtml(s.name)}</div>
          <div class="upsell-sub">${escapeHtml(s.note)}</div>
        </div>
        <button type="button" data-action="upsell-add" data-item="${escapeAttr(s.name)}">Add</button>
      `;
      upsellRow.appendChild(div);
    });
  }

  function addUpsell(name) {
    if (!name) return;

    // If item exists in cart, just qty++
    const existing = cart.find((x) => (x.name || "").toLowerCase() === name.toLowerCase() && !x.options);
    if (existing) {
      existing.qty = Number(existing.qty || 1) + 1;
      writeCart(cart);
      renderAll();
      return;
    }

    // Add new simple item
    const price = name.toLowerCase().includes("croissant") ? 3.80 : 2.40;

    cart.push({
      id: makeIdFromName(name),
      name,
      price,
      qty: 1,
      options: null
    });

    writeCart(cart);
    renderAll();
  }

  function updateQty(id, optKey, delta) {
    const idx = cart.findIndex((x) => x.id === id && buildOptKey(x.options) === optKey);
    if (idx === -1) return;

    const next = Number(cart[idx].qty || 1) + delta;
    if (next <= 0) {
      cart.splice(idx, 1);
    } else {
      cart[idx].qty = next;
    }

    writeCart(cart);
    renderAll();
  }

  function removeItem(id, optKey) {
    cart = cart.filter((x) => !(x.id === id && buildOptKey(x.options) === optKey));
    writeCart(cart);
    renderAll();
  }

 async function placeOrder() {
  cart = readCart();
  if (!cart.length) {
    showEmpty();
    return;
  }

  // Validate basics
  const fullName = document.getElementById("fullName")?.value?.trim() || "";
  const phone = normalizePhone(document.getElementById("phone")?.value || "");
  const branch = branchSelect?.value || "Velvet Brew";

  if (!fullName || !phone) {
    alert("Please enter your name and phone number.");
    return;
  }

  const isDelivery = mode === "delivery";
  const address = document.getElementById("address")?.value?.trim() || "";
  if (isDelivery && !address) {
    alert("Please enter your delivery address.");
    return;
  }

  const notes = document.getElementById("notes")?.value?.trim() || "";
  const eta = etaInput?.value || (isDelivery ? "30–45 mins" : "15–25 mins");

  const totals = calcTotals();
  const orderId = generateOrderId();

  // Build payload EXACTLY matching your MongoDB Order schema
  const payload = {
    orderId, // required
    customerName: fullName, // required
    phone, // required

    type: isDelivery ? "Delivery" : "Pickup", // required
    address: isDelivery ? address : "",
    branch,
    notes,

    status: "Placed",

    subtotal: totals.subtotal, // required
    tax: totals.tax, // required
    total: totals.total, // required

    items: cart.map((it) => ({
      name: it.name, // required
      qty: Number(it.qty || 1), // required
      price: Number(it.price || 0), // required
      optionsText: optionsText(it) // optional in schema but we store it
    }))
  };

  // Disable button to prevent double clicks
  if (placeOrderBtn) placeOrderBtn.disabled = true;
  if (placeOrderMobile) placeOrderMobile.disabled = true;

  try {
    // 1) SAVE TO MONGODB (THIS IS THE MISSING PART)
    const res = await fetch("http://localhost:5000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to place order");
    }

    // 2) SAVE RECEIPT LOCALLY (keep your receipt page working)
    const lastOrder = {
      orderId,
      phone,
      customerName: fullName,
      type: payload.type,
      eta,
      branch,
      address: payload.address,
      notes,
      taxRate: totals.taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      items: payload.items
    };

    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(lastOrder));

    // 3) CLEAR CART + REDIRECT
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    if (typeof window.refreshCartBadge === "function") window.refreshCartBadge();

    window.location.href = "order-success.html";
  } catch (err) {
    console.error(err);
    alert(err.message);

    // re-enable buttons if failed
    if (placeOrderBtn) placeOrderBtn.disabled = false;
    if (placeOrderMobile) placeOrderMobile.disabled = false;
  }
}


  function calcTotals() {
    const subtotal = cart.reduce((sum, it) => {
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      return sum + (qty * price);
    }, 0);

    const count = cart.reduce((sum, it) => sum + Number(it.qty || 0), 0);

    const taxRate = 0.08; // frontend demo
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      subtotal: round2(subtotal),
      tax: round2(tax),
      total: round2(total),
      count,
      taxRate
    };
  }

  function optionsText(it) {
    // If you already store optionsText, use it
    if (it.optionsText) return it.optionsText;

    const o = it.options;
    if (!o || typeof o !== "object") return "Standard";

    const parts = [];
    if (o.size) parts.push(o.size);
    if (o.milk) parts.push(o.milk);
    if (Array.isArray(o.extras) && o.extras.length) parts.push(o.extras.join(", "));

    return parts.length ? parts.join(", ") : "Standard";
  }

  function buildOptKey(options) {
    // Stable string to identify same option set
    if (!options) return "";
    try {
      return JSON.stringify({
        size: options.size || "",
        milk: options.milk || "",
        extras: Array.isArray(options.extras) ? options.extras.slice().sort() : []
      });
    } catch {
      return "";
    }
  }

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCart(nextCart) {
    localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
  }

  function normalizePhone(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function generateOrderId() {
    // Looks like a real store receipt ID
    const n = Math.floor(10000 + Math.random() * 89999);
    return `VB-${n}`;
  }

  function money(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  function round2(n) {
    return Number(Number(n || 0).toFixed(2));
  }

  function makeIdFromName(name) {
    return String(name || "item")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("`", "&#096;");
  }
}); 
