const { bearerToken, handleError, method, send, supabase } = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;

  try {
    const token = bearerToken(req);
    if (token) {
      await supabase(`chat_sessions?token=eq.${encodeURIComponent(token)}`, { method: "DELETE" });
    }
    send(res, 200, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
};
