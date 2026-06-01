const { currentUser, handleError, method, publicUser, send, touchUser } = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  try {
    const user = await currentUser(req);
    if (!user) return send(res, 401, { error: "Login required" });
    await touchUser(user.id);
    send(res, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(res, error);
  }
};
