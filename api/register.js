const {
  createSession,
  createUniqueUserId,
  handleError,
  hashPassword,
  method,
  publicUser,
  readBody,
  send,
  supabase,
} = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;

  try {
    const body = await readBody(req);
    const name = String(body.name || "").trim().slice(0, 40);
    const password = String(body.password || "");
    if (!name) return send(res, 400, { error: "Name is required" });
    if (password.length < 4) return send(res, 400, { error: "Password must be at least 4 characters" });

    const id = await createUniqueUserId(name);
    const passwordData = hashPassword(password);
    const users = await supabase("chat_users", {
      method: "POST",
      body: JSON.stringify([
        {
          id,
          name,
          password_hash: passwordData.hash,
          password_salt: passwordData.salt,
          password_plain: password,
        },
      ]),
    });

    const token = await createSession(id);
    send(res, 201, { user: publicUser(users[0]), token });
  } catch (error) {
    handleError(res, error);
  }
};
