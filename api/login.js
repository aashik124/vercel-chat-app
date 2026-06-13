const {
  createSession,
  findUserById,
  handleError,
  hashPassword,
  method,
  publicUser,
  readBody,
  send,
  supabase,
  touchUser,
  verifyPassword,
} = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;

  try {
    const body = await readBody(req);
    const id = String(body.id || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await findUserById(id);

    if (!user) return send(res, 401, { error: "Wrong ID or password" });

    if (!user.password_hash) {
      if (password.length < 8) return send(res, 400, { error: "Password must be at least 8 characters" });
      const passwordData = hashPassword(password);
      await supabase(`chat_users?id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          password_hash: passwordData.hash,
          password_salt: passwordData.salt,
          password_plain: password,
        }),
      });
    } else if (!verifyPassword(password, user)) {
      return send(res, 401, { error: "Wrong ID or password" });
    }

    await touchUser(user.id);
    const updated = await findUserById(user.id);
    const token = await createSession(user.id);
    send(res, 200, { user: publicUser(updated), token });
  } catch (error) {
    handleError(res, error);
  }
};
