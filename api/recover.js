const { accountUser, findUserById, handleError, method, send } = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  try {
    const id = String(req.query.id || "").trim().toLowerCase();
    const user = await findUserById(id);
    if (!user) return send(res, 404, { error: "Account not found" });
    send(res, 200, accountUser(user));
  } catch (error) {
    handleError(res, error);
  }
};
