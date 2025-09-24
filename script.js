/*
  Simple CRUD app with Vanilla JS + JSONPlaceholder API
  - Fetch, Add, Edit, Delete users
  - Pagination, Filters, Search, Sorting
  - Using /users endpoint of JSONPlaceholder (fake API)
*/

const API_ROOT = "https://jsonplaceholder.typicode.com/users";

// local state for the app
let state = {
  users: [],
  filtered: [],
  page: 1,
  perPage: 10,
  totalPages: 1,
  sortKey: null,
  sortDir: 1,
  filters: { first: "", last: "", email: "", department: "" },
  search: "",
};

// cache DOM elements
const elems = {
  tbody: document.getElementById("tbody"),
  rowsInfo: document.getElementById("rowsInfo"),
  pageInfo: document.getElementById("pageInfo"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  perPageSelect: document.getElementById("perPageSelect"),
  searchInput: document.getElementById("searchInput"),
  addBtn: document.getElementById("addBtn"),
  filterBtn: document.getElementById("filterBtn"),
  clearFilters: document.getElementById("clearFilters"),
  filterModal: document.getElementById("filterModal"),
  applyFilters: document.getElementById("applyFilters"),
  closeFilters: document.getElementById("closeFilters"),
  filterFirst: document.getElementById("filterFirst"),
  filterLast: document.getElementById("filterLast"),
  filterEmail: document.getElementById("filterEmail"),
  filterDept: document.getElementById("filterDept"),
  editModal: document.getElementById("editModal"),
  editTitle: document.getElementById("editTitle"),
  userForm: document.getElementById("userForm"),
  cancelEdit: document.getElementById("cancelEdit"),
  formError: document.getElementById("formError"),
  errorBanner: document.getElementById("errorBanner"),
};

function showError(msg) {
  elems.errorBanner.style.display = "block";
  elems.errorBanner.textContent = msg;
  setTimeout(() => (elems.errorBanner.style.display = "none"), 5000);
}

// helpers
function splitName(full) {
  if (!full) return { first: "", last: "" };
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

function makeUserFromAPI(u) {
  const { first, last } = splitName(u.name);
  return {
    id: u.id,
    first,
    last,
    email: u.email || "",
    department: u.company && u.company.name ? u.company.name : "",
  };
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

// load initial users
async function loadUsers() {
  try {
    const res = await fetch(API_ROOT);
    if (!res.ok) throw new Error("Failed to fetch users");
    const data = await res.json();
    state.users = data.map(makeUserFromAPI);
    applyAllFilters();
  } catch (err) {
    showError("Error loading users: " + err.message);
  }
}

// filtering + searching + sorting + pagination
function applyAllFilters() {
  const s = state.search.trim().toLowerCase();
  state.filtered = state.users.filter((u) => {
    if (state.filters.first && !u.first.toLowerCase().includes(state.filters.first.toLowerCase())) return false;
    if (state.filters.last && !u.last.toLowerCase().includes(state.filters.last.toLowerCase())) return false;
    if (state.filters.email && !u.email.toLowerCase().includes(state.filters.email.toLowerCase())) return false;
    if (state.filters.department && !u.department.toLowerCase().includes(state.filters.department.toLowerCase()))
      return false;

    if (s) {
      const combined = [u.first, u.last, u.email, u.department].join(" ").toLowerCase();
      if (!combined.includes(s)) return false;
    }
    return true;
  });

  if (state.sortKey) {
    const key = state.sortKey;
    state.filtered.sort((a, b) => {
      let va = (a[key] || "").toString().toLowerCase();
      let vb = (b[key] || "").toString().toLowerCase();
      if (key === "id") {
        va = Number(a.id);
        vb = Number(b.id);
      }
      if (va < vb) return -1 * state.sortDir;
      if (va > vb) return 1 * state.sortDir;
      return 0;
    });
  }

  state.totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
  if (state.page > state.totalPages) state.page = 1;
  renderTable();
}

// render table rows
function renderTable() {
  const tbody = elems.tbody;
  tbody.innerHTML = "";
  const start = (state.page - 1) * state.perPage;
  const pageItems = state.filtered.slice(start, start + state.perPage);

  if (pageItems.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" style="text-align:center;padding:15px;color:gray">No users found</td>`;
    tbody.appendChild(tr);
  } else {
    pageItems.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${escapeHtml(u.first)}</td>
        <td>${escapeHtml(u.last)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.department)}</td>
        <td>
          <button class="btn secondary" data-action="edit" data-id="${u.id}">Edit</button>
          <button class="btn ghost" data-action="delete" data-id="${u.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  elems.rowsInfo.textContent = `Showing ${Math.min(state.filtered.length, start + 1)} - ${Math.min(
    state.filtered.length,
    start + pageItems.length
  )} of ${state.filtered.length}`;
  elems.pageInfo.textContent = `Page ${state.page} / ${state.totalPages}`;
  elems.prevBtn.disabled = state.page <= 1;
  elems.nextBtn.disabled = state.page >= state.totalPages;
}

// sort when clicking headers
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    if (state.sortKey === key) {
      state.sortDir = -state.sortDir;
    } else {
      state.sortKey = key;
      state.sortDir = 1;
    }
    applyAllFilters();
  });
});

// pagination buttons
elems.prevBtn.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderTable();
});
elems.nextBtn.addEventListener("click", () => {
  state.page = Math.min(state.totalPages, state.page + 1);
  renderTable();
});
elems.perPageSelect.addEventListener("change", (e) => {
  state.perPage = Number(e.target.value);
  state.page = 1;
  applyAllFilters();
});

// search box
let searchTimer;
elems.searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = e.target.value;
    state.page = 1;
    applyAllFilters();
  }, 300);
});

// filter modal
elems.filterBtn.addEventListener("click", () => {
  elems.filterFirst.value = state.filters.first;
  elems.filterLast.value = state.filters.last;
  elems.filterEmail.value = state.filters.email;
  elems.filterDept.value = state.filters.department;
  elems.filterModal.style.display = "flex";
});
elems.closeFilters.addEventListener("click", () => (elems.filterModal.style.display = "none"));
elems.applyFilters.addEventListener("click", () => {
  state.filters.first = elems.filterFirst.value.trim();
  state.filters.last = elems.filterLast.value.trim();
  state.filters.email = elems.filterEmail.value.trim();
  state.filters.department = elems.filterDept.value.trim();
  state.page = 1;
  elems.filterModal.style.display = "none";
  applyAllFilters();
});
elems.clearFilters.addEventListener("click", () => {
  state.filters = { first: "", last: "", email: "", department: "" };
  state.search = "";
  elems.searchInput.value = "";
  elems.filterFirst.value = elems.filterLast.value = elems.filterEmail.value = elems.filterDept.value = "";
  state.page = 1;
  applyAllFilters();
});

// add / edit
let editingId = null;
elems.addBtn.addEventListener("click", () => openEditModal(null));
elems.cancelEdit.addEventListener("click", closeEditModal);

function openEditModal(id) {
  editingId = id;
  elems.formError.style.display = "none";
  if (id) {
    elems.editTitle.textContent = "Edit User";
    const u = state.users.find((x) => x.id === Number(id));
    document.getElementById("firstName").value = u ? u.first : "";
    document.getElementById("lastName").value = u ? u.last : "";
    document.getElementById("email").value = u ? u.email : "";
    document.getElementById("department").value = u ? u.department : "";
  } else {
    elems.editTitle.textContent = "Add User";
    elems.userForm.reset();
  }
  elems.editModal.style.display = "flex";
}

function closeEditModal() {
  elems.userForm.reset();
  elems.editModal.style.display = "none";
  editingId = null;
}

elems.userForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  elems.formError.style.display = "none";

  const first = document.getElementById("firstName").value.trim();
  const last = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const dept = document.getElementById("department").value.trim();

  if (!first || !email) {
    showFormError("First name and Email are required.");
    return;
  }
  if (!validateEmail(email)) {
    showFormError("Invalid email address.");
    return;
  }

  const localUser = { id: editingId ? Number(editingId) : null, first, last, email, department: dept };

  try {
    if (editingId) {
      // build full payload (JSONPlaceholder needs full user object)
      const fullPayload = {
        id: Number(editingId),
        name: (first + " " + last).trim(),
        email,
        username: first.toLowerCase() || "user",
        phone: "000-000-0000",
        website: "example.com",
        company: { name: dept || "N/A" },
        address: {
          street: "Unknown",
          suite: "Apt. 1",
          city: "Nowhere",
          zipcode: "00000",
          geo: { lat: "0", lng: "0" },
        },
      };

      const res = await fetch(`${API_ROOT}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullPayload),
      });
      if (!res.ok) throw new Error("Update failed: " + res.status);

      // update local
      state.users = state.users.map((u) => (u.id === Number(editingId) ? localUser : u));
      applyAllFilters();
      closeEditModal();
    } else {
      const res = await fetch(API_ROOT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localUser),
      });
      if (!res.ok) throw new Error("Create failed: " + res.status);
      const ret = await res.json();
      const newId = ret.id || Math.max(0, ...state.users.map((u) => u.id)) + 1;
      state.users.unshift({ ...localUser, id: Number(newId) });
      applyAllFilters();
      closeEditModal();
    }
  } catch (err) {
    showFormError("API error: " + err.message);
  }
});

function showFormError(msg) {
  elems.formError.style.display = "block";
  elems.formError.textContent = msg;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// delete button in table
elems.tbody.addEventListener("click", async (ev) => {
  const btn = ev.target;
  if (btn.tagName !== "BUTTON") return;
  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);

  if (action === "edit") {
    openEditModal(id);
  } else if (action === "delete") {
    if (!confirm("Delete user with ID " + id + " ?")) return;
    try {
      const res = await fetch(`${API_ROOT}/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 200 && res.status !== 204) throw new Error("Delete failed");
      state.users = state.users.filter((u) => u.id !== id);
      applyAllFilters();
    } catch (err) {
      showError("Delete failed: " + err.message);
    }
  }
});

// init
function init() {
  elems.perPageSelect.value = state.perPage;
  elems.prevBtn.disabled = true;
  elems.nextBtn.disabled = true;
  document.getElementById("filterModal").addEventListener("click", (e) => {
    if (e.target === elems.filterModal) elems.filterModal.style.display = "none";
  });
  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target === elems.editModal) closeEditModal();
  });
  loadUsers();
}
init();
