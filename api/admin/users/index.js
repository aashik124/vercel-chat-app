const { accountUser, handleError, isAdmin, method, send, supabase } = require("../../../_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  try {
    if (!(await isAdmin(req))) return send(res, 401, { error: "Admin login required" });
    const search = String(req.query.search || "").trim().toLowerCase();
    const users = await supabase("chat_users?select=*&order=created_at.desc");
    const messages = await supabase("chat_messages?select=id,from_id,to_id");
    const sessions = await supabase("chat_sessions?select=token,user_id");

    const filtered = users
      .filter((user) => {
        if (!search) return true;
        return `${user.name} ${user.id}`.toLowerCase().includes(search);
      })
      .map((user) => {
        const messageCount = messages.filter((message) => message.from_id === user.id || message.to_id === user.id).length;
        const sessionCount = sessions.filter((session) => session.user_id === user.id).length;
        return { ...accountUser(user), messageCount, sessionCount };
      });

    send(res, 200, {
      users: filtered,
      totals: {
        users: users.length,
        messages: messages.length,
        sessions: sessions.length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
