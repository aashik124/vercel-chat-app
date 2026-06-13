const authForm = document.querySelector("#authForm");
const loginModeButton = document.querySelector("#loginModeButton");
const registerModeButton = document.querySelector("#registerModeButton");
const adminModeButton = document.querySelector("#adminModeButton");
const authSubmitButton = document.querySelector("#authSubmitButton");
const nameInput = document.querySelector("#nameInput");
const idInput = document.querySelector("#idInput");
const passwordInput = document.querySelector("#passwordInput");
const passwordLabel = document.querySelector("#passwordLabel");
const togglePasswordButton = document.querySelector("#togglePasswordButton");
const passwordMeterBar = document.querySelector("#passwordMeterBar");
const passwordHint = document.querySelector("#passwordHint");
const formMessage = document.querySelector("#formMessage");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const currentUserPanel = document.querySelector("#currentUser");
const currentAvatar = document.querySelector("#currentAvatar");
const currentName = document.querySelector("#currentName");
const copyIdButton = document.querySelector("#copyIdButton");
const resetUserButton = document.querySelector("#resetUserButton");
const accountTools = document.querySelector("#accountTools");
const showPasswordButton = document.querySelector("#showPasswordButton");
const editNameButton = document.querySelector("#editNameButton");
const deleteAccountButton = document.querySelector("#deleteAccountButton");
const accountMessage = document.querySelector("#accountMessage");
const searchInput = document.querySelector("#searchInput");
const userList = document.querySelector("#userList");
const chatHeader = document.querySelector("#chatHeader");
const refreshButton = document.querySelector("#refreshButton");
const copyPeerButton = document.querySelector("#copyPeerButton");
const conversation = document.querySelector(".conversation");
const detailsPanel = document.querySelector("#detailsPanel");
const adminPanel = document.querySelector("#adminPanel");
const adminSummary = document.querySelector("#adminSummary");
const adminList = document.querySelector("#adminList");
const adminRefreshButton = document.querySelector("#adminRefreshButton");
const detailsName = document.querySelector("#detailsName");
const detailsId = document.querySelector("#detailsId");
const detailsOnline = document.querySelector("#detailsOnline");
const detailsMessages = document.querySelector("#detailsMessages");
const detailsUpdated = document.querySelector("#detailsUpdated");
const messagesPanel = document.querySelector("#messages");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const sendButton = document.querySelector("#sendButton");
const toast = document.querySelector("#toast");

let authMode = "login";
let currentUser = null;
let selectedUser = null;
let users = [];
let lastMessageSignature = "";
let token = localStorage.getItem("chat.token") || "";
let sessionRole = localStorage.getItem("chat.role") || "user";
let currentMessages = [];
let toastTimer = null;

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatTime(value) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  showToast(successMessage);
}

function passwordScore(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 5);
}

function updatePasswordMeter() {
  const score = passwordScore(passwordInput.value);
  const widths = ["0%", "22%", "42%", "62%", "82%", "100%"];
  const colors = ["var(--danger)", "var(--danger)", "var(--warning)", "var(--cyan)", "var(--green)", "var(--green)"];
  passwordMeterBar.style.width = widths[score];
  passwordMeterBar.style.background = colors[score];
  passwordHint.textContent = score >= 4
    ? "Strong password."
    : "Use at least 8 characters with uppercase, number, and symbol.";
}

function isOnline(user) {
  return Date.now() - new Date(user.lastSeen).getTime() < 15000;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function setMode(mode) {
  authMode = mode;
  const isRegistering = mode === "register";
  const isAdmin = mode === "admin";
  loginModeButton.classList.toggle("active", !isRegistering);
  loginModeButton.classList.toggle("active", mode === "login");
  registerModeButton.classList.toggle("active", isRegistering);
  adminModeButton.classList.toggle("active", isAdmin);
  document.querySelectorAll(".register-only").forEach((item) => item.classList.toggle("hidden", !isRegistering));
  document.querySelectorAll(".login-only").forEach((item) => item.classList.toggle("hidden", isRegistering || isAdmin));
  authSubmitButton.textContent = isAdmin ? "Admin log in" : isRegistering ? "Create ID" : "Log in";
  passwordLabel.textContent = isAdmin ? "Admin password" : "Password";
  passwordInput.placeholder = isAdmin ? "Admin password" : "Password";
  passwordInput.autocomplete = isRegistering ? "new-password" : "current-password";
  formMessage.textContent = "";
  updatePasswordMeter();
}

function setSession(user, nextToken) {
  currentUser = user;
  if (nextToken) {
    token = nextToken;
    sessionRole = "user";
    localStorage.setItem("chat.token", token);
    localStorage.setItem("chat.role", sessionRole);
  }
  renderCurrentUser();
  renderUsers();
  renderHeader();
  renderDetails();
  loadAccount();
  loadUsers();
}

function setAdminSession(admin, nextToken) {
  currentUser = { ...admin, isAdmin: true };
  token = nextToken;
  sessionRole = "admin";
  localStorage.setItem("chat.token", token);
  localStorage.setItem("chat.role", sessionRole);
  selectedUser = null;
  users = [];
  renderCurrentUser();
  renderAdmin();
  loadAdminUsers();
  showToast("Admin dashboard opened");
}

async function clearSession() {
  if (token) {
    api("/api/logout", { method: "POST" }).catch(() => {});
  }
  localStorage.removeItem("chat.token");
  localStorage.removeItem("chat.role");
  token = "";
  sessionRole = "user";
  currentUser = null;
  selectedUser = null;
  users = [];
  lastMessageSignature = "";
  currentMessages = [];
  renderCurrentUser();
  renderUsers();
  renderHeader();
  renderDetails();
  renderAdmin();
  messagesPanel.innerHTML = `
    <div class="empty-state">
      <h3>Log in to chat</h3>
      <p>Use your permanent chat ID and password.</p>
    </div>
  `;
}

function renderCurrentUser() {
  const hasUser = Boolean(currentUser);
  const isAdmin = Boolean(currentUser && currentUser.isAdmin);
  authForm.classList.toggle("hidden", hasUser);
  currentUserPanel.classList.toggle("hidden", !hasUser);
  accountTools.classList.toggle("hidden", !hasUser || isAdmin);
  searchInput.disabled = !hasUser;
  searchInput.placeholder = isAdmin ? "Search accounts as admin" : "Search by name or exact ID";

  if (!hasUser) {
    messageInput.disabled = true;
    sendButton.disabled = true;
    return;
  }

  currentAvatar.textContent = isAdmin ? "AD" : initials(currentUser.name);
  currentName.textContent = currentUser.name;
  copyIdButton.textContent = isAdmin ? "Admin dashboard" : `ID: ${currentUser.id}`;
  accountMessage.textContent = "";
}

function renderAdmin() {
  const isAdmin = Boolean(currentUser && currentUser.isAdmin);
  conversation.classList.toggle("hidden", isAdmin);
  detailsPanel.classList.toggle("hidden", isAdmin);
  adminPanel.classList.toggle("hidden", !isAdmin);
  if (!isAdmin) {
    adminSummary.innerHTML = "";
    adminList.innerHTML = "";
  }
}

function renderUsers() {
  userList.innerHTML = "";

  if (!currentUser) {
    userList.innerHTML = `<div class="empty-state"><p>Log in first.</p></div>`;
    return;
  }

  if (!users.length) {
    userList.innerHTML = `<div class="empty-state"><p>No users found. Ask another person for their ID.</p></div>`;
    return;
  }

  for (const user of users) {
    const button = document.createElement("button");
    button.className = `user-item${selectedUser && selectedUser.id === user.id ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <div class="avatar">${initials(user.name)}</div>
      <div>
        <span class="user-name"></span>
        <span class="user-id"></span>
        <span class="user-status"></span>
      </div>
    `;
    button.querySelector(".user-name").textContent = user.name;
    button.querySelector(".user-id").textContent = user.id;
    button.querySelector(".user-status").textContent = isOnline(user) ? "Online now" : "Offline";
    button.addEventListener("click", () => selectUser(user));
    userList.appendChild(button);
  }
}

function renderHeader() {
  if (!selectedUser) {
    chatHeader.innerHTML = `
      <div class="avatar muted">ID</div>
      <div>
        <h2>Select a person</h2>
        <p>Search another chat ID, then send messages.</p>
      </div>
    `;
    copyPeerButton.disabled = true;
    return;
  }

  chatHeader.innerHTML = `
    <div class="avatar">${initials(selectedUser.name)}</div>
    <div>
      <h2></h2>
      <p></p>
    </div>
  `;
  chatHeader.querySelector("h2").textContent = selectedUser.name;
  chatHeader.querySelector("p").textContent = `ID: ${selectedUser.id}`;
  copyPeerButton.disabled = false;
}

function renderDetails() {
  if (!selectedUser) {
    detailsName.textContent = "No chat selected";
    detailsId.textContent = "Choose a user to see account details.";
    detailsOnline.textContent = "Waiting";
    detailsMessages.textContent = "0 messages";
    detailsUpdated.textContent = "Not synced";
    return;
  }

  detailsName.textContent = selectedUser.name;
  detailsId.textContent = `ID: ${selectedUser.id}`;
  detailsOnline.textContent = isOnline(selectedUser) ? "Online now" : "Offline";
  detailsMessages.textContent = `${currentMessages.length} messages`;
  detailsUpdated.textContent = `Synced ${formatTime(new Date().toISOString())}`;
}

function renderMessages(messages) {
  const signature = messages.map((message) => message.id).join("|");
  if (signature === lastMessageSignature) return;
  lastMessageSignature = signature;
  currentMessages = messages;
  messagesPanel.innerHTML = "";

  if (!messages.length) {
    messagesPanel.innerHTML = `
      <div class="empty-state">
        <h3>No messages yet</h3>
        <p>Send the first message to ${selectedUser.name}.</p>
      </div>
    `;
    return;
  }

  for (const message of messages) {
    const bubble = document.createElement("article");
    bubble.className = `bubble${message.from === currentUser.id ? " sent" : ""}`;
    bubble.innerHTML = `<p></p><span class="time"></span><div class="message-tools"></div>`;
    bubble.querySelector("p").textContent = message.text;
    bubble.querySelector(".time").textContent = formatTime(message.createdAt);
    const tools = bubble.querySelector(".message-tools");
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () => copyText(message.text, "Message copied"));
    tools.appendChild(copyButton);
    if (message.from === currentUser.id) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteMessage(message.id));
      tools.appendChild(deleteButton);
    }
    messagesPanel.appendChild(bubble);
  }

  messagesPanel.scrollTop = messagesPanel.scrollHeight;
  renderDetails();
}

async function loadMe() {
  if (!token) return clearSession();

  if (sessionRole === "admin") {
    currentUser = { id: "admin", name: "Admin", isAdmin: true };
    renderCurrentUser();
    renderAdmin();
    loadAdminUsers().catch(() => clearSession());
    return;
  }

  try {
    const payload = await api("/api/me");
    setSession(payload.user);
  } catch {
    clearSession();
  }
}

async function loadAccount() {
  if (!currentUser) return;
  const payload = await api("/api/account");
  currentUser = payload.user;
  renderCurrentUser();
}

async function loadUsers() {
  if (!currentUser) return;
  if (currentUser.isAdmin) return loadAdminUsers();
  const query = new URLSearchParams({ search: searchInput.value.trim() });
  const payload = await api(`/api/users?${query}`);
  users = payload.users;

  if (selectedUser) {
    selectedUser = users.find((user) => user.id === selectedUser.id) || selectedUser;
  }

  renderUsers();
  renderHeader();
  renderDetails();
}

async function loadAdminUsers() {
  if (!currentUser || !currentUser.isAdmin) return;
  const query = new URLSearchParams({ search: searchInput.value.trim() });
  const payload = await api(`/api/admin/users?${query}`);
  adminSummary.innerHTML = `
    <div><strong>${payload.totals.users}</strong><span>Accounts</span></div>
    <div><strong>${payload.totals.messages}</strong><span>Messages</span></div>
    <div><strong>${payload.totals.sessions}</strong><span>Sessions</span></div>
  `;
  adminList.innerHTML = "";

  if (!payload.users.length) {
    adminList.innerHTML = `<div class="empty-state"><p>No accounts found.</p></div>`;
    return;
  }

  for (const user of payload.users) {
    const row = document.createElement("article");
    row.className = "admin-user";
    row.innerHTML = `
      <div class="avatar">${initials(user.name)}</div>
      <div class="admin-user-main">
        <strong></strong>
        <span class="user-id"></span>
        <span class="user-status"></span>
        <span class="admin-password"></span>
      </div>
      <div class="admin-actions">
        <button class="account-action" type="button">Keep</button>
        <button class="account-action danger" type="button">Delete</button>
      </div>
    `;
    row.querySelector("strong").textContent = user.name;
    row.querySelector(".user-id").textContent = `ID: ${user.id}`;
    row.querySelector(".user-status").textContent = `${user.messageCount} messages | ${user.sessionCount} sessions`;
    row.querySelector(".admin-password").textContent = `Password: ${user.savedPassword || "not set yet"}`;
    const buttons = row.querySelectorAll("button");
    buttons[0].addEventListener("click", () => {
      row.classList.add("kept");
      buttons[0].textContent = "Kept";
    });
    buttons[1].addEventListener("click", () => deleteUserAsAdmin(user));
    adminList.appendChild(row);
  }
}

async function deleteUserAsAdmin(user) {
  const confirmed = confirm(`Delete account ${user.id} and all messages?`);
  if (!confirmed) return;
  await api(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
  if (selectedUser && selectedUser.id === user.id) selectedUser = null;
  await loadAdminUsers();
}

async function loadMessages() {
  if (!currentUser || !selectedUser) return;
  const query = new URLSearchParams({ peerId: selectedUser.id });
  const payload = await api(`/api/messages?${query}`);
  renderMessages(payload.messages);
}

async function deleteMessage(id) {
  const confirmed = confirm("Delete this message for everyone?");
  if (!confirmed) return;
  await api(`/api/messages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  lastMessageSignature = "";
  await loadMessages();
  showToast("Message deleted");
}

function selectUser(user) {
  selectedUser = user;
  lastMessageSignature = "";
  messageInput.disabled = false;
  sendButton.disabled = false;
  renderHeader();
  renderUsers();
  renderDetails();
  loadMessages();
  messageInput.focus();
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const password = passwordInput.value;
  if (authMode === "admin") {
    try {
      const response = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      passwordInput.value = "";
      setAdminSession(response.admin, response.token);
    } catch (error) {
      formMessage.textContent = error.message;
    }
    return;
  }

  const payload = authMode === "register"
    ? { name: nameInput.value.trim(), password }
    : { id: idInput.value.trim(), password };

  try {
    const response = await api(authMode === "register" ? "/api/register" : "/api/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    nameInput.value = "";
    idInput.value = "";
    passwordInput.value = "";
    setSession(response.user, response.token);
    showToast(authMode === "register" ? "Account created" : "Logged in");
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

forgotPasswordButton.addEventListener("click", async () => {
  const id = idInput.value.trim() || prompt("Enter your chat ID");
  if (!id) return;

  try {
    const query = new URLSearchParams({ id });
    const payload = await api(`/api/recover?${query}`, { headers: {} });
    formMessage.textContent = payload.savedPassword
      ? `Password for ${payload.id}: ${payload.savedPassword}`
      : "This old account does not have a saved password yet. Log in once with a new password to claim it.";
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !selectedUser) return;

  const text = messageInput.value.trim();
  if (!text) return;

  messageInput.value = "";
  await api("/api/messages", {
    method: "POST",
    body: JSON.stringify({ to: selectedUser.id, text }),
  });
  await loadMessages();
});

copyIdButton.addEventListener("click", async () => {
  if (!currentUser) return;
  await copyText(currentUser.id, "Your ID copied");
  const original = copyIdButton.textContent;
  copyIdButton.textContent = "Copied ID";
  setTimeout(() => {
    copyIdButton.textContent = original;
  }, 900);
});

showPasswordButton.addEventListener("click", async () => {
  try {
    await loadAccount();
    accountMessage.textContent = currentUser.savedPassword
      ? `Saved password: ${currentUser.savedPassword}`
      : "No readable password saved yet for this old account.";
  } catch (error) {
    accountMessage.textContent = error.message;
  }
});

editNameButton.addEventListener("click", async () => {
  const name = prompt("Enter new display name", currentUser ? currentUser.name : "");
  if (!name) return;

  try {
    const payload = await api("/api/account", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    currentUser = payload.user;
    renderCurrentUser();
    loadUsers();
    accountMessage.textContent = "Name updated.";
    showToast("Name updated");
  } catch (error) {
    accountMessage.textContent = error.message;
  }
});

deleteAccountButton.addEventListener("click", async () => {
  const confirmed = confirm("Delete this account and all its messages permanently?");
  if (!confirmed) return;

  const password = prompt("Enter your password to delete this account");
  if (!password) return;

  try {
    await api("/api/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
    await clearSession();
    showToast("Account deleted");
  } catch (error) {
    accountMessage.textContent = error.message;
  }
});

resetUserButton.addEventListener("click", clearSession);
loginModeButton.addEventListener("click", () => setMode("login"));
registerModeButton.addEventListener("click", () => setMode("register"));
adminModeButton.addEventListener("click", () => setMode("admin"));
togglePasswordButton.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePasswordButton.textContent = isHidden ? "Hide" : "Show";
});
passwordInput.addEventListener("input", updatePasswordMeter);
refreshButton.addEventListener("click", async () => {
  await loadUsers();
  await loadMessages();
  showToast("Chat refreshed");
});
copyPeerButton.addEventListener("click", () => {
  if (!selectedUser) return;
  copyText(selectedUser.id, "User ID copied");
});
adminRefreshButton.addEventListener("click", async () => {
  await loadAdminUsers();
  showToast("Admin list refreshed");
});
searchInput.addEventListener("input", () => {
  if (currentUser && currentUser.isAdmin) {
    loadAdminUsers().catch(console.error);
  } else {
    loadUsers().catch(console.error);
  }
});

setMode("login");
renderCurrentUser();
renderUsers();
renderHeader();
loadMe();

setInterval(() => {
  if (currentUser && currentUser.isAdmin) {
    loadAdminUsers().catch(console.error);
  } else {
    loadUsers().catch(console.error);
    loadMessages().catch(console.error);
  }
}, 1500);
