const {
  accountUser,
  currentUser,
  handleError,
  method,
  readBody,
  send,
  supabase,
  touchUser,
  verifyPassword,
} = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET", "PATCH", "DELETE"])) return;

  try {
    const user = await currentUser(req);
    if (!user) return send(res, 401, { error: "Login required" });

    if (req.method === "GET") {
      await touchUser(user.id);
      return send(res, 200, { user: accountUser(user) });
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      const name = String(body.name || "").trim().slice(0, 40);
      if (!name) return send(res, 400, { error: "Name is required" });
      const users = await supabase(`chat_users?id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name, last_seen: new Date().toISOString() }),
      });
      return send(res, 200, { user: accountUser(users[0]) });
    }

    const body = await readBody(req);
    const password = String(body.password || "");
    if (!verifyPassword(password, user)) return send(res, 401, { error: "Password does not match" });
    await supabase(`chat_messages?or=(from_id.eq.${encodeURIComponent(user.id)},to_id.eq.${encodeURIComponent(user.id)})`, { method: "DELETE" });
    await supabase(`chat_sessions?user_id=eq.${encodeURIComponent(user.id)}`, { method: "DELETE" });
    await supabase(`chat_users?id=eq.${encodeURIComponent(user.id)}`, { method: "DELETE" });
    send(res, 200, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
};
