/* =========================================================
   Velvet Brew | menu.js
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";
  const CART_KEY = "velvetbrew_cart_v1";

  // =========================
  // ELEMENTS
  // =========================
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearch");

  const filterCaffeineFree = document.getElementById("filterCaffeineFree");
  const filterVegan = document.getElementById("filterVegan");
  const filterBest = document.getElementById("filterBest");

  const emptyState = document.getElementById("emptyState");
  const viewAllBtn = document.getElementById("viewAllBtn");

  // =========================
  // CART HELPERS
  // =========================
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    if (typeof window.refreshCartBadge === "function") {
      window.refreshCartBadge();
    }
  }

  function addToCart(item) {
    const cart = readCart();
    const existing = cart.find((c) => c.id === item.id);
    if (existing) existing.qty += 1;
    else cart.push(item);
    saveCart(cart);
    toast(`Added: ${item.name}`);
  }

  // =========================
  // SEARCH + FILTER EVENTS
  // =========================
  if (searchInput) searchInput.addEventListener("input", applySearchAndFilters);
  if (clearSearchBtn)
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      applySearchAndFilters();
    });

  if (filterCaffeineFree)
    filterCaffeineFree.addEventListener("change", applySearchAndFilters);
  if (filterVegan)
    filterVegan.addEventListener("change", applySearchAndFilters);
  if (filterBest)
    filterBest.addEventListener("change", applySearchAndFilters);

  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterCaffeineFree.checked = false;
      filterVegan.checked = false;
      filterBest.checked = false;
      applySearchAndFilters();
    });
  }

  // =========================
  // LOAD MENU FROM BACKEND
  // =========================
  async function loadMenuFromBackend() {
    const grids = {
      espresso: document.getElementById("grid-espresso"),
      iceblended: document.getElementById("grid-iceblended"),
      teas: document.getElementById("grid-teas"),
      pastries: document.getElementById("grid-pastries"),
      beans: document.getElementById("grid-beans"),
    };

    Object.values(grids).forEach((g) => g && (g.innerHTML = ""));

    try {
      const res = await fetch(`${API_BASE}/api/menu`);
      const json = await res.json();
      const items = Array.isArray(json.data) ? json.data : [];

      if (!items.length) {
        emptyState.style.display = "block";
        return;
      }

      items.forEach((it) => {
        const key = mapCategory(it.category);
        const grid = grids[key];
        if (grid) grid.insertAdjacentHTML("beforeend", renderMenuCard(it));
      });

      applySearchAndFilters();
    } catch (e) {
      console.error(e);
      emptyState.style.display = "block";
    }
  }

  function mapCategory(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("espresso") || c.includes("latte") || c.includes("coffee")) return "espresso";
    if (c.includes("ice") || c.includes("blend")) return "iceblended";
    if (c.includes("tea")) return "teas";
    if (c.includes("pastry") || c.includes("bakery")) return "pastries";
    if (c.includes("bean")) return "beans";
    return "espresso";
  }

  function renderMenuCard(it) {
    const name = escapeHtml(it.name);
    const price = Number(it.price || 0).toFixed(2);
    const image = it.image.startsWith("http") ? it.image : `${API_BASE}${it.image}`;
    const id = makeIdFromName(it.name || it._id);

    return `
      <article class="item-card"
        data-name="${escapeAttr(it.name)}"
        data-tags=""
        data-vegan="false"
        data-caffeinefree="false"
        data-price="${price}"
        data-calories="0"
        data-allergens="None"
      >
        <div class="item-media">
          <img src="${image}" alt="${name}">
          <button class="quick-add"
            data-id="${id}"
            data-name="${escapeAttr(it.name)}"
            data-price="${price}"
            data-image="${image}"
          >
            Quick Add
          </button>
        </div>

        <div class="item-body">
          <div class="item-top">
            <h3>${name}</h3>
            <span class="item-price">$${price}</span>
          </div>
          <p class="item-desc">${escapeHtml(it.description || "Freshly crafted, Velvet Brew style.")}</p>
        </div>
      </article>
    `;
  }

  // =========================
  // FILTER FUNCTION
  // =========================
  function applySearchAndFilters() {
    const cards = document.querySelectorAll(".item-card");
    let visible = 0;
    cards.forEach((card) => {
      const name = card.dataset.name.toLowerCase();
      const q = searchInput.value.toLowerCase();
      const show = name.includes(q);
      card.style.display = show ? "block" : "none";
      if (show) visible++;
    });
    emptyState.style.display = visible === 0 ? "block" : "none";
  }

  // =========================
  // QUICK ADD
  // =========================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".quick-add");
    if (!btn) return;

    addToCart({
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: Number(btn.dataset.price),
      image: btn.dataset.image,
      qty: 1,
    });
  });

  // =========================
  // UTILITIES
  // =========================
  function makeIdFromName(name) {
    return String(name).toLowerCase().replace(/\s+/g, "-");
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[m]);
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, "&#096;");
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.bottom = "20px";
    t.style.right = "20px";
    t.style.background = "#111";
    t.style.color = "#fff";
    t.style.padding = "12px 16px";
    t.style.borderRadius = "12px";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  // =========================
  // INIT
  // =========================
  loadMenuFromBackend();
});
