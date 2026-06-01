const { handleError, isAdmin, method, send, supabase } = require("../../../_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["DELETE"])) return;

  try {
    if (!(await isAdmin(req))) return send(res, 401, { error: "Admin login required" });
    const id = String(req.query.id || "");
    const users = await supabase(`chat_users?id=eq.${encodeURIComponent(id)}&select=id`);
    if (!users.length) return send(res, 404, { error: "Account not found" });

    await supabase(`chat_messages?or=(from_id.eq.${encodeURIComponent(id)},to_id.eq.${encodeURIComponent(id)})`, { method: "DELETE" });
    await supabase(`chat_sessions?user_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    await supabase(`chat_users?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    send(res, 200, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
};
