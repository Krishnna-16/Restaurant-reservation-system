/* ================================================================
   RRS — Shared Utilities (script.js)
   ================================================================ */

const API = "http://localhost:3000";

// ── Session helpers ───────────────────────────────────────────
const Session = {
  get: () => {
    try { return JSON.parse(localStorage.getItem("rrs_user")); }
    catch { return null; }
  },
  set: (user) => localStorage.setItem("rrs_user", JSON.stringify(user)),
  clear: () => localStorage.removeItem("rrs_user"),
  require: (expectedRole) => {
    const user = Session.get();
    if (!user) { window.location.href = "/login.html"; return null; }
    if (expectedRole && user.role !== expectedRole) {
      window.location.href = `/${user.role}.html`;
      return null;
    }
    return user;
  }
};

// ── API helper ────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API}${path}`, opts);

    // 🔥 FIX: read as text first
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("❌ NOT JSON RESPONSE:", text);
      throw new Error("Server returned invalid response (not JSON)");
    }

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;

  } catch (err) {
    console.error(`❌ API ${method} ${path}:`, err);
    throw err;
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Status badge HTML ─────────────────────────────────────────
function statusBadge(status) {
  const map = {
    "Reserved":   "badge-reserved",
    "Checked-In": "badge-checkedin",
    "Completed":  "badge-completed",
    "Vacant":     "badge-vacant",
    "Occupied":   "badge-occupied",
  };
  const icons = {
    "Reserved":   "🔵",
    "Checked-In": "🟡",
    "Completed":  "🟢",
    "Vacant":     "🟢",
    "Occupied":   "🔴",
  };
  const cls = map[status] || "badge-reserved";
  return `<span class="badge ${cls}">${icons[status] || ""} ${status}</span>`;
}

// ── Format date ───────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

// ── Sidebar nav ───────────────────────────────────────────────
function initSidebar() {
  document.querySelectorAll(".sidebar-menu a[data-section]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.section;
      document.querySelectorAll(".sidebar-menu a").forEach(l => l.classList.remove("active"));
      document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
      link.classList.add("active");
      const sec = document.getElementById(target);
      if (sec) sec.classList.add("active");
    });
  });
}

// ── Logout ────────────────────────────────────────────────────
function initLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      Session.clear();
      window.location.href = "/login.html";
    });
  }
}

/* ================================================================
   LOGIN HANDLER
   ================================================================ */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    // Get selected role
    const roleBtn = document.querySelector(".role-btn.active");
    const role = roleBtn ? roleBtn.dataset.role : "customer";

    if (!username || !password) {
      showToast("Please enter username and password", "warning");
      return;
    }

    try {
      const res = await api("POST", "/users/login", {
        username,
        password,
        role
      });

      // Save session
      Session.set(res.user);

      showToast("Login successful!", "success");

      // Redirect based on role
      window.location.href = `/${res.user.role}.html`;

    } catch (err) {
      showToast(err.message || "Login failed", "error");
    }
  });
}