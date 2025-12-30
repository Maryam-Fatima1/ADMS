/* =========================================================
   Velvet Brew | checkout.js
   Cart Page Logic:
   - Render cart items from localStorage
   - Qty +/- (instant totals)
   - Remove item
   - Fulfillment toggle (pickup/delivery)
   - Order notes saved
   - Upsell suggestions
   - Empty cart state

   Upgrades in this version:
   - Uses a unique LINE ID per cart row so customized items do not clash
   - Backward compatible with older cart items
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const CART_KEY = "velvetbrew_cart_v1";
  const NOTES_KEY = "velvetbrew_order_notes_v1";
  const FULFILL_KEY = "velvetbrew_fulfillment_v1";

  // Elements
  const cartList = document.getElementById("cartList");
  const emptyCart = document.getElementById("emptyCart");

  const sumSubtotal = document.getElementById("sumSubtotal");
  const sumTax = document.getElementById("sumTax");
  const sumFee = document.getElementById("sumFee");
  const sumTotal = document.getElementById("sumTotal");

  const checkoutBtn = document.getElementById("checkoutBtn");

  const orderNotes = document.getElementById("orderNotes");

  const pickupBtn = document.getElementById("pickupBtn");
  const deliveryBtn = document.getElementById("deliveryBtn");

  const upsellRow = document.getElementById("upsellRow");

  // Load state
  let cart = readJSON(CART_KEY, []);
  let fulfillment = readJSON(FULFILL_KEY, "pickup"); // "pickup" | "delivery"

  // Notes restore
  if (orderNotes) {
    orderNotes.value = readJSON(NOTES_KEY, "");
    orderNotes.addEventListener("input", () => {
      localStorage.setItem(NOTES_KEY, JSON.stringify(orderNotes.value));
    });
  }

  // Fulfillment restore + click handlers
  function applyFulfillmentUI() {
    if (!pickupBtn || !deliveryBtn) return;

    if (fulfillment === "delivery") {
      pickupBtn.classList.remove("active");
      deliveryBtn.classList.add("active");
    } else {
      deliveryBtn.classList.remove("active");
      pickupBtn.classList.add("active");
    }
  }

  if (pickupBtn) {
    pickupBtn.addEventListener("click", () => {
      fulfillment = "pickup";
      localStorage.setItem(FULFILL_KEY, JSON.stringify(fulfillment));
      applyFulfillmentUI();
      renderAll();
    });
  }

  if (deliveryBtn) {
    deliveryBtn.addEventListener("click", () => {
      fulfillment = "delivery";
      localStorage.setItem(FULFILL_KEY, JSON.stringify(fulfillment));
      applyFulfillmentUI();
      renderAll();
    });
  }

  applyFulfillmentUI();

  // Checkout button (front-end only for now)
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      if (!cart || cart.length === 0) {
        toast("Your cart is empty");
        return;
      }
      window.location.href = "place-order.html";

      // later: window.location.href = "place-order.html";
    });
  }

  // Render everything
  renderAll();

  // Events: qty, remove, upsell add (event delegation)
  document.addEventListener("click", (e) => {
    const minusBtn = e.target.closest("[data-action='minus']");
    const plusBtn = e.target.closest("[data-action='plus']");
    const removeBtn = e.target.closest("[data-action='remove']");
    const upsellBtn = e.target.closest("[data-action='upsell-add']");

    if (minusBtn) {
      const lineId = minusBtn.dataset.lineid || "";
      changeQty(lineId, -1);
      return;
    }

    if (plusBtn) {
      const lineId = plusBtn.dataset.lineid || "";
      changeQty(lineId, +1);
      return;
    }

    if (removeBtn) {
      const lineId = removeBtn.dataset.lineid || "";
      removeItem(lineId);
      return;
    }

    if (upsellBtn) {
      const itemId = upsellBtn.dataset.id;
      addUpsell(itemId);
      return;
    }
  });

  /* ===================== RENDER ===================== */

  function renderAll() {
    cart = normalizeCart(readJSON(CART_KEY, []));
    writeJSON(CART_KEY, cart);

    renderCart();
    renderSummary();
    renderUpsell();

    if (typeof window.refreshCartBadge === "function") window.refreshCartBadge();
  }

  function renderCart() {
    if (!cartList || !emptyCart) return;

    if (!cart || cart.length === 0) {
      cartList.innerHTML = "";
      emptyCart.style.display = "block";
      return;
    }

    emptyCart.style.display = "none";

    cartList.innerHTML = cart
      .map((item) => {
        const qty = Number(item.qty || 1);
        const unit = Number(item.price || 0);
        const line = qty * unit;

        const custom = getCustomizationText(item);

        return `
          <article class="cart-item">
            <div class="cart-item-left">
              <div class="cart-thumb">
                <img src="${escapeHtml(item.image || "assets/images/items/beans.png")}" alt="${escapeHtml(item.name || "Item")}" />
              </div>

              <div class="cart-info">
                <h3 class="cart-name">${escapeHtml(item.name || "Item")}</h3>

                ${
                  custom
                    ? `<p class="cart-custom">${escapeHtml(custom)}</p>`
                    : `<p class="cart-custom muted">Default recipe</p>`
                }

                <button class="cart-remove" data-action="remove" data-lineid="${escapeHtml(item.id)}" type="button">
                  Remove
                </button>
              </div>
            </div>

            <div class="cart-item-right">
              <div class="qty">
                <button class="qty-btn" data-action="minus" data-lineid="${escapeHtml(item.id)}" type="button" aria-label="Decrease">−</button>
                <span class="qty-num">${qty}</span>
                <button class="qty-btn" data-action="plus" data-lineid="${escapeHtml(item.id)}" type="button" aria-label="Increase">+</button>
              </div>

              <div class="cart-prices">
                <span class="cart-unit muted">$${unit.toFixed(2)}</span>
                <span class="cart-line">$${line.toFixed(2)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderSummary() {
    if (!sumSubtotal || !sumTax || !sumFee || !sumTotal) return;

    const subtotal = calcSubtotal(cart);

    // Simple estimate rules (change later)
    const taxRate = 0.08; // 8% estimate
    const tax = subtotal * taxRate;

    // Fee differs for delivery vs pickup
    const fee = fulfillment === "delivery" && subtotal > 0 ? 1.5 : 0;

    const total = subtotal + tax + fee;

    sumSubtotal.textContent = money(subtotal);
    sumTax.textContent = money(tax);
    sumFee.textContent = money(fee);
    sumTotal.textContent = money(total);
  }

  function renderUpsell() {
    if (!upsellRow) return;

    // curated upsell list
    const upsells = [
      {
        id: "upsell-croissant",
        name: "Butter Croissant",
        price: 3.8,
        image: "assets/images/items/croissant.png",
        hint: "Flaky + warm",
      },
      {
        id: "upsell-vanilla",
        name: "Vanilla Cream Blend",
        price: 6.1,
        image: "assets/images/items/vanilla.png",
        hint: "Sweet + cold",
      },
      {
        id: "upsell-beans",
        name: "Velvet House Blend (250g)",
        price: 12.5,
        image: "assets/images/items/beans.png",
        hint: "Take it home",
      },
    ];

    upsellRow.innerHTML = upsells
      .map((u) => {
        return `
          <div class="upsell-card">
            <div class="upsell-img">
              <img src="${escapeHtml(u.image)}" alt="${escapeHtml(u.name)}" />
            </div>
            <div class="upsell-info">
              <p class="upsell-name">${escapeHtml(u.name)}</p>
              <p class="upsell-hint">${escapeHtml(u.hint)}</p>
            </div>
            <div class="upsell-actions">
              <span class="upsell-price">${money(u.price)}</span>
              <button class="btn btn-ghost small" data-action="upsell-add" data-id="${escapeHtml(u.id)}" type="button">Add</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  /* ===================== CART OPS ===================== */

  function changeQty(lineId, delta) {
    if (!lineId) return;

    cart = normalizeCart(readJSON(CART_KEY, []));
    const item = cart.find((x) => x.id === lineId);
    if (!item) return;

    const current = Number(item.qty || 1);
    const next = current + delta;

    if (next <= 0) {
      cart = cart.filter((x) => x.id !== lineId);
      writeJSON(CART_KEY, cart);
      renderAll();
      toast("Item removed");
      return;
    }

    item.qty = next;
    writeJSON(CART_KEY, cart);
    renderAll();
  }

  function removeItem(lineId) {
    if (!lineId) return;
    cart = normalizeCart(readJSON(CART_KEY, []));
    cart = cart.filter((x) => x.id !== lineId);
    writeJSON(CART_KEY, cart);
    renderAll();
    toast("Item removed");
  }

  function addUpsell(upsellId) {
    // Map upsell to real cart item
    const map = {
      "upsell-croissant": {
        productId: "butter-croissant",
        name: "Butter Croissant",
        price: 3.8,
        image: "assets/images/items/croissant.png",
        options: { size: "", milk: "", extras: [] },
      },
      "upsell-vanilla": {
        productId: "vanilla-cream-blend",
        name: "Vanilla Cream Blend",
        price: 6.1,
        image: "assets/images/items/vanilla.png",
        options: { size: "", milk: "", extras: [] },
      },
      "upsell-beans": {
        productId: "velvet-house-blend-250g",
        name: "Velvet House Blend (250g)",
        price: 12.5,
        image: "assets/images/items/beans.png",
        options: { size: "", milk: "", extras: [] },
      },
    };

    const base = map[upsellId];
    if (!base) return;

    // default line id
    const lineId = makeLineId(base.productId, base.options, "");

    cart = normalizeCart(readJSON(CART_KEY, []));
    const existing = cart.find((x) => x.id === lineId);

    if (existing) {
      existing.qty = Number(existing.qty || 1) + 1;
    } else {
      cart.push({
        id: lineId,
        productId: base.productId,
        name: base.name,
        price: Number(base.price),
        image: base.image,
        qty: 1,
        options: base.options,
      });
    }

    writeJSON(CART_KEY, cart);
    renderAll();
    toast("Added to cart");
  }

  /* ===================== HELPERS ===================== */

  function normalizeCart(cartArr) {
    if (!Array.isArray(cartArr)) return [];

    return cartArr.map((item) => {
      const safe = item && typeof item === "object" ? item : {};

      const productId = safe.productId || safe.productID || safe.baseId || safe.sku || safe.id || "";
      const name = safe.name || "Item";
      const price = Number(safe.price || 0);
      const image = safe.image || "assets/images/items/beans.png";
      const qty = Number(safe.qty || 1);

      const options = safe.options && typeof safe.options === "object"
        ? {
            size: safe.options.size || "",
            milk: safe.options.milk || "",
            extras: Array.isArray(safe.options.extras) ? safe.options.extras : [],
          }
        : { size: "", milk: "", extras: [] };

      // If optionsText already exists, keep it
      const optionsText = typeof safe.optionsText === "string" ? safe.optionsText : "";

      // Ensure item has a true line id
      // If it already looks like a line id, keep it.
      // Else create one using productId + options.
      const id = typeof safe.id === "string" && safe.id.includes("|")
        ? safe.id
        : makeLineId(productId, options, optionsText);

      return {
        id,
        productId,
        name,
        price,
        image,
        qty,
        options,
        optionsText,
      };
    });
  }

  function getCustomizationText(item) {
    if (!item || typeof item !== "object") return "";

    // Prefer saved optionsText
    if (item.optionsText && String(item.optionsText).trim()) {
      return String(item.optionsText).trim();
    }

    // Else build from options object
    const opt = item.options;
    if (!opt || typeof opt !== "object") return "";

    const parts = [];
    if (opt.size) parts.push(opt.size);
    if (opt.milk) parts.push(opt.milk);
    if (Array.isArray(opt.extras) && opt.extras.length) parts.push(opt.extras.join(", "));

    return parts.join(", ");
  }

  function makeLineId(productId, options, optionsText) {
    const pid = String(productId || "").trim() || "unknown";

    const txt = String(optionsText || "").trim();
    if (txt) return `${pid}|${txt}`;

    const opt = options && typeof options === "object" ? options : {};
    const parts = [];

    if (opt.size) parts.push(opt.size);
    if (opt.milk) parts.push(opt.milk);
    if (Array.isArray(opt.extras) && opt.extras.length) parts.push(opt.extras.join(", "));

    const built = parts.join(", ");
    return `${pid}|${built || "default"}`;
  }

  function calcSubtotal(cartArr) {
    if (!Array.isArray(cartArr)) return 0;
    return cartArr.reduce((sum, item) => {
      const qty = Number(item.qty || 1);
      const price = Number(item.price || 0);
      return sum + qty * price;
    }, 0);
  }

  function money(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* ===================== TOAST ===================== */

  function toast(message) {
    let wrap = document.getElementById("toastWrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toastWrap";
      wrap.style.position = "fixed";
      wrap.style.right = "16px";
      wrap.style.bottom = "16px";
      wrap.style.display = "grid";
      wrap.style.gap = "10px";
      wrap.style.zIndex = "9999";
      document.body.appendChild(wrap);
    }

    const t = document.createElement("div");
    t.textContent = message;
    t.style.padding = "12px 14px";
    t.style.borderRadius = "14px";
    t.style.background = "rgba(10,10,12,0.85)";
    t.style.border = "1px solid rgba(255,255,255,0.10)";
    t.style.backdropFilter = "blur(12px)";
    t.style.color = "rgba(255,255,255,0.92)";
    t.style.fontWeight = "800";
    t.style.maxWidth = "320px";

    wrap.appendChild(t);

    setTimeout(() => {
      t.remove();
      if (wrap.childElementCount === 0) wrap.remove();
    }, 2200);
  }
});
