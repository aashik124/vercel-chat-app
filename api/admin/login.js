const { ADMIN_PASSWORD, createSession, handleError, method, readBody, send } = require("../_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;

  try {
    const body = await readBody(req);
    const password = String(body.password || "");
    if (password !== ADMIN_PASSWORD) return send(res, 401, { error: "Wrong admin password" });
    const token = await createSession("admin", "admin");
    send(res, 200, { admin: { id: "admin", name: "Admin" }, token });
  } catch (error) {
    handleError(res, error);
  }
};
