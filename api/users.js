const { currentUser, handleError, method, publicUser, send, supabase, touchUser } = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  try {
    const user = await currentUser(req);
    if (!user) return send(res, 401, { error: "Login required" });

    const search = String(req.query.search || "").trim().toLowerCase();
    await touchUser(user.id);

    const users = await supabase("chat_users?select=*&order=last_seen.desc");
    const filtered = users
      .filter((item) => item.id !== user.id)
      .filter((item) => {
        if (!search) return true;
        return `${item.name} ${item.id}`.toLowerCase().includes(search);
      })
      .slice(0, 100)
      .map(publicUser);

    send(res, 200, { users: filtered });
  } catch (error) {
    handleError(res, error);
  }
};
