document.addEventListener("DOMContentLoaded", () => {
  const TOKEN_KEY = "velvetbrew_admin_token";
  const token = localStorage.getItem(TOKEN_KEY);

  // Protect page
  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  const API_BASE = "http://localhost:5000";

  // =========================
  // EDIT MODAL ELEMENTS
  // =========================
  const editModal = document.getElementById("editModal");
  const editOverlay = document.getElementById("editOverlay");
  const editClose = document.getElementById("editClose");
  const editForm = document.getElementById("editForm");

  const editId = document.getElementById("editId");
  const editName = document.getElementById("editName");
  const editPrice = document.getElementById("editPrice");
  const editCategory = document.getElementById("editCategory");
  const editDescription = document.getElementById("editDescription");
  const editImage = document.getElementById("editImage");
  const editPreview = document.getElementById("editPreview");

  function openEditModal(item) {
    if (!editModal) return;

    editId.value = item._id || "";
    editName.value = item.name || "";
    editPrice.value = item.price || "";
    editCategory.value = item.category || "";
    editDescription.value = item.description || "";

    // Reset file input
    if (editImage) editImage.value = "";

    // Preview current image
    if (editPreview) {
      if (item.image) {
        editPreview.src = item.image.startsWith("http")
          ? item.image
          : `${API_BASE}${item.image}`;
        editPreview.style.display = "block";
      } else {
        editPreview.src = "";
        editPreview.style.display = "none";
      }
    }

    editModal.classList.add("open");
    editModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeEditModal() {
    if (!editModal) return;
    editModal.classList.remove("open");
    editModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (editOverlay) editOverlay.addEventListener("click", closeEditModal);
  if (editClose) editClose.addEventListener("click", closeEditModal);

  // Live preview when selecting new image
  if (editImage && editPreview) {
    editImage.addEventListener("change", () => {
      const file = editImage.files?.[0];
      if (!file) return;
      editPreview.src = URL.createObjectURL(file);
      editPreview.style.display = "block";
    });
  }

  // Submit edit
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = (editId.value || "").trim();
      if (!id) return;

      try {
        const fd = new FormData();
        fd.append("name", (editName.value || "").trim());
        fd.append("price", (editPrice.value || "").trim());
        fd.append("category", (editCategory.value || "").trim());
        fd.append("description", (editDescription.value || "").trim());

        // If a new image chosen, include it
        const file = editImage?.files?.[0] || null;
        if (file) fd.append("image", file);

        const res = await fetch(`${API_BASE}/api/menu/${id}`, {
          method: "PUT",
          body: fd
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to update item");
        }

        closeEditModal();
        loadItems();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // =========================
  // PAGE ELEMENTS
  // =========================
  const logoutBtn = document.getElementById("logoutBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const itemsWrap = document.getElementById("items");
  const itemsEmpty = document.getElementById("itemsEmpty");

  const addForm = document.getElementById("addForm");
  const msg = document.getElementById("msg");

  const nameEl = document.getElementById("name");
  const priceEl = document.getElementById("price");
  const categoryEl = document.getElementById("category");
  const tagsEl = document.getElementById("tags");
  const imageEl = document.getElementById("image");

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "admin-login.html";
    });
  }

  // Refresh
  if (refreshBtn) refreshBtn.addEventListener("click", loadItems);

  // Initial load
  loadItems();

  // =========================
  // ADD ITEM
  // =========================
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMsg("");

      const name = (nameEl.value || "").trim();
      const price = (priceEl.value || "").trim();
      const category = (categoryEl.value || "").trim();
      const tags = (tagsEl.value || "").trim();

      const file = imageEl?.files?.[0] || null;

      if (!name || !price || !category) {
        setMsg("Please fill name, price, and category.", true);
        return;
      }

      if (!file) {
        setMsg("Please upload an image.", true);
        return;
      }

      try {
        const fd = new FormData();
        fd.append("name", name);
        fd.append("price", price);
        fd.append("category", category);

        // Optional: store tags into description for now
        if (tags) fd.append("description", `Tags: ${tags}`);

        fd.append("image", file);

        const res = await fetch(`${API_BASE}/api/menu`, {
          method: "POST",
          body: fd
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to add item");
        }

        addForm.reset();
        setMsg("Item added successfully ✅");
        loadItems();
      } catch (err) {
        setMsg(err.message, true);
      }
    });
  }

  // =========================
  // CLICK HANDLERS (EDIT + DELETE)
  // =========================
  document.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-action='delete']");
    const edit = e.target.closest("[data-action='edit']");

    // EDIT
    if (edit) {
      const raw = edit.dataset.item;
      if (!raw) return;

      try {
        const item = JSON.parse(raw);
        openEditModal(item);
      } catch {
        alert("Failed to open edit modal (bad item data).");
      }
      return;
    }

    // DELETE
    if (del) {
      const id = del.dataset.id;
      if (!id) return;

      const ok = confirm("Delete this item?");
      if (!ok) return;

      try {
        const res = await fetch(`${API_BASE}/api/menu/${id}`, {
          method: "DELETE"
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to delete item");
        }

        loadItems();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  // =========================
  // LOAD ITEMS
  // =========================
  async function loadItems() {
    if (!itemsWrap) return;

    itemsWrap.innerHTML = "Loading...";
    if (itemsEmpty) itemsEmpty.style.display = "none";

    try {
      const res = await fetch(`${API_BASE}/api/menu`);
      const data = await res.json();

      const items = Array.isArray(data.data) ? data.data : [];

      if (!items.length) {
        itemsWrap.innerHTML = "";
        if (itemsEmpty) itemsEmpty.style.display = "block";
        return;
      }

      if (itemsEmpty) itemsEmpty.style.display = "none";
      itemsWrap.innerHTML = items.map(renderItem).join("");
    } catch (err) {
      itemsWrap.innerHTML = "Failed to load items.";
    }
  }

  function renderItem(it) {
    const img = it.image ? `${API_BASE}${it.image}` : "";
    const name = escapeHtml(it.name || "Item");
    const price = Number(it.price || 0).toFixed(2);
    const category = escapeHtml(it.category || "");
    const id = escapeAttr(it._id || "");

    // store full item json inside edit button safely
    const itemJson = escapeAttr(JSON.stringify(it));

    return `
      <div class="admin-item">
        <div class="admin-item-left">
          <div class="admin-item-thumb">
            ${img ? `<img src="${img}" alt="${name}">` : ""}
          </div>
          <div class="admin-item-info">
            <div class="admin-item-name">${name}</div>
            <div class="admin-item-meta">${category} • $${price}</div>
          </div>
        </div>

        <div class="admin-item-right">
          <button class="btn btn-ghost small" data-action="edit" data-item="${itemJson}" type="button">Edit</button>
          <button class="btn btn-ghost small" data-action="delete" data-id="${id}" type="button">Delete</button>
        </div>
      </div>
    `;
  }

  function setMsg(text, isErr = false) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = isErr ? "tomato" : "inherit";
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
