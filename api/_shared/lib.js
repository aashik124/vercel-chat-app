const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    error.statusCode = 500;
    throw error;
  }
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function method(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    send(res, 405, { error: "Method not allowed" });
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function supabase(path, options = {}) {
  ensureConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload && payload.message ? payload.message : "Database request failed");
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    createdAt: user.created_at,
    lastSeen: user.last_seen,
  };
}

function accountUser(user) {
  return {
    ...publicUser(user),
    savedPassword: user.password_plain || null,
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user.password_hash || !user.password_salt) return false;
  const { hash } = hashPassword(password, user.password_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.password_hash, "hex"));
}

function makeUserId(name) {
  const base = String(name || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12) || "user";
  return `${base}${crypto.randomInt(1000, 9999)}`;
}

async function findUserById(id) {
  const users = await supabase(`chat_users?id=eq.${encodeURIComponent(id)}&select=*`);
  return users[0] || null;
}

async function createUniqueUserId(name) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = makeUserId(name);
    const existing = await findUserById(id);
    if (!existing) return id;
  }
  throw new Error("Could not create a unique user ID");
}

async function createSession(userId, role = "user") {
  const token = crypto.randomBytes(32).toString("hex");
  await supabase("chat_sessions", {
    method: "POST",
    body: JSON.stringify([{ token, user_id: userId, role }]),
  });
  return token;
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function sessionFromRequest(req) {
  const token = bearerToken(req);
  if (!token) return null;
  const sessions = await supabase(`chat_sessions?token=eq.${encodeURIComponent(token)}&select=*`);
  return sessions[0] || null;
}

async function currentUser(req) {
  const session = await sessionFromRequest(req);
  if (!session || session.role === "admin") return null;
  return findUserById(session.user_id);
}

async function isAdmin(req) {
  const session = await sessionFromRequest(req);
  return Boolean(session && session.role === "admin");
}

async function touchUser(id) {
  const now = new Date().toISOString();
  await supabase(`chat_users?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ last_seen: now }),
  });
}

function handleError(res, error) {
  send(res, error.statusCode || 500, { error: error.message || "Server error" });
}

module.exports = {
  ADMIN_PASSWORD,
  accountUser,
  createSession,
  createUniqueUserId,
  findUserById,
  handleError,
  hashPassword,
  isAdmin,
  method,
  publicUser,
  readBody,
  send,
  supabase,
  touchUser,
  verifyPassword,
  currentUser,
  bearerToken,
};
