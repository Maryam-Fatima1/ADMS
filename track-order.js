/* =========================================================
   Velvet Brew | track-order.js
   Demo now, API later:
   Later you will replace mockFetchOrder() with:
   fetch(`/api/orders/track?orderId=...&phone=...`)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const trackForm = document.getElementById("trackForm");
  const orderIdInput = document.getElementById("orderId");
  const phoneInput = document.getElementById("phone");

  const statusCard = document.getElementById("statusCard");
  const trackError = document.getElementById("trackError");
  const tryAgainBtn = document.getElementById("tryAgainBtn");

  const statusTitle = document.getElementById("statusTitle");
  const statusLine = document.getElementById("statusLine");

  const progressSteps = document.getElementById("progressSteps");

  const callBranchBtn = document.getElementById("callBranchBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const refreshSpinner = document.getElementById("refreshSpinner");
  const refreshText = document.getElementById("refreshText");

  const branchName = document.getElementById("branchName");
  const riderName = document.getElementById("riderName");
  const itemsList = document.getElementById("itemsList");
  const detailsMeta = document.getElementById("detailsMeta");

  let currentOrder = null;

  const steps = [
    { key: "confirmed", label: "Confirmed", sub: "Order received", icon: "🧾" },
    { key: "preparing", label: "Preparing", sub: "Barista crafting", icon: "☕" },
    { key: "out", label: "Out for delivery", sub: "On the way", icon: "🛵" },
    { key: "delivered", label: "Delivered", sub: "Enjoy", icon: "✅" }
  ];

  const statusCopy = {
    confirmed: {
      title: "Confirmed",
      line: "We received your order and it is queued for preparation."
    },
    preparing: {
      title: "Preparing",
      line: "Your barista is crafting your drink."
    },
    out: {
      title: "Out for delivery",
      line: "Your rider is on the way with your order."
    },
    delivered: {
      title: "Delivered",
      line: "Your order has arrived. Enjoy your Velvet Brew."
    }
  };

  function normalizePhone(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function showLoading(isLoading) {
    if (!refreshBtn) return;

    refreshBtn.disabled = isLoading;
    if (refreshSpinner) refreshSpinner.style.display = isLoading ? "inline-block" : "none";
    if (refreshText) refreshText.textContent = isLoading ? "Refreshing" : "Refresh Status";
  }

  function showError() {
    if (statusCard) statusCard.style.display = "none";
    if (trackError) trackError.style.display = "block";
  }

  function showResult() {
    if (trackError) trackError.style.display = "none";
    if (statusCard) statusCard.style.display = "block";
  }

  function renderSteps(activeKey) {
    if (!progressSteps) return;
    progressSteps.innerHTML = "";

    const activeIndex = steps.findIndex((s) => s.key === activeKey);

    steps.forEach((s, idx) => {
      const div = document.createElement("div");
      div.className = "step pending";

      if (idx < activeIndex) div.className = "step done";
      if (idx === activeIndex) div.className = "step active";

      div.innerHTML = `
        <div class="icon">${s.icon}</div>
        <div class="label">${s.label}</div>
        <div class="sub">${s.sub}</div>
      `;

      progressSteps.appendChild(div);
    });
  }

  function renderDetails(order) {
    if (!order) return;

    if (branchName) branchName.textContent = order.branch || "Velvet Brew";
    if (riderName) riderName.textContent = order.rider || "Not assigned";

    if (callBranchBtn) {
      // Use tel link if you have a branch phone number
      const phone = order.branchPhone || "";
      callBranchBtn.href = phone ? `tel:${phone}` : "#";
      callBranchBtn.style.opacity = phone ? "1" : "0.65";
      callBranchBtn.style.pointerEvents = phone ? "auto" : "none";
    }

    if (itemsList) {
      itemsList.innerHTML = "";
      order.items.forEach((it) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="item-left">
            <div class="item-name">${it.name} <span style="opacity:0.8;">x${it.qty}</span></div>
            <div class="item-opts">${it.optionsText || ""}</div>
          </div>
          <div class="item-right">${money(it.price * it.qty)}</div>
        `;
        itemsList.appendChild(li);
      });
    }

    if (detailsMeta) {
      const count = order.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
      detailsMeta.textContent = `${count} items`;
    }
  }

  function renderStatus(order) {
    const key = order.status;
    const copy = statusCopy[key] || statusCopy.confirmed;

    if (statusTitle) statusTitle.textContent = copy.title;
    if (statusLine) statusLine.textContent = copy.line;

    renderSteps(key);
    renderDetails(order);
  }

  function money(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  async function loadOrder(orderId, phone) {
    showLoading(true);

    try {
      const order = await mockFetchOrder(orderId, phone);
      if (!order) {
        showError();
        return;
      }

      currentOrder = order;
      showResult();
      renderStatus(order);
    } finally {
      showLoading(false);
    }
  }

  // FORM SUBMIT
  if (trackForm) {
    trackForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const oid = String(orderIdInput?.value || "").trim();
      const phone = normalizePhone(phoneInput?.value || "");

      loadOrder(oid, phone);
    });
  }

  // TRY AGAIN
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener("click", () => {
      if (trackError) trackError.style.display = "none";
      if (orderIdInput) orderIdInput.focus();
    });
  }

  // REFRESH
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      if (!currentOrder) return;

      showLoading(true);
      try {
        // Demo behavior: move to next status
        const next = nextStatus(currentOrder.status);
        currentOrder.status = next;

        // Demo: assign rider when out
        if (next === "out" && !currentOrder.rider) currentOrder.rider = "Adeel";
        if (next === "delivered") currentOrder.rider = currentOrder.rider || "Adeel";

        renderStatus(currentOrder);
      } finally {
        showLoading(false);
      }
    });
  }

  function nextStatus(s) {
    if (s === "confirmed") return "preparing";
    if (s === "preparing") return "out";
    if (s === "out") return "delivered";
    return "delivered";
  }

  // =========================================================
  // MOCK API (replace later with real fetch)
  // =========================================================
  async function mockFetchOrder(orderId, phone) {
    await wait(650);

    // Demo order
    const demoId = "VB-10294";
    const demoPhone = "03001234567";

    if (String(orderId).toUpperCase() !== demoId) return null;
    if (normalizePhone(phone) !== normalizePhone(demoPhone)) return null;

    return {
      orderId: demoId,
      phone: demoPhone,
      status: "preparing",
      branch: "Velvet Brew, Gulberg",
      branchPhone: "03001230000",
      rider: "",
      items: [
        { name: "Velvet Latte", qty: 1, price: 5.90, optionsText: "Large, Oat Milk, Extra Shot" },
        { name: "Butter Croissant", qty: 1, price: 3.80, optionsText: "Warmed" }
      ]
    };
  }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
});
