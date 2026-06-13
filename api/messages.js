const { currentUser, handleError, method, readBody, send, supabase, touchUser } = require("./_shared/lib");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET", "POST", "DELETE"])) return;

  try {
    const user = await currentUser(req);
    if (!user) return send(res, 401, { error: "Login required" });

    if (req.method === "GET") {
      const peerId = String(req.query.peerId || "");
      if (!peerId) return send(res, 400, { error: "peerId is required" });
      await touchUser(user.id);
      const query = [
        "select=*",
        "order=created_at.asc",
        `or=(and(from_id.eq.${encodeURIComponent(user.id)},to_id.eq.${encodeURIComponent(peerId)}),and(from_id.eq.${encodeURIComponent(peerId)},to_id.eq.${encodeURIComponent(user.id)}))`,
      ].join("&");
      const rows = await supabase(`chat_messages?${query}`);
      const messages = rows.map((message) => ({
        id: message.id,
        from: message.from_id,
        to: message.to_id,
        text: message.text,
        createdAt: message.created_at,
      }));
      return send(res, 200, { messages });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return send(res, 400, { error: "Message id is required" });
      const rows = await supabase(`chat_messages?id=eq.${encodeURIComponent(id)}&select=*`);
      const message = rows[0];
      if (!message) return send(res, 404, { error: "Message not found" });
      if (message.from_id !== user.id) return send(res, 403, { error: "You can delete only your own messages" });
      await supabase(`chat_messages?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      return send(res, 200, { ok: true });
    }

    const body = await readBody(req);
    const to = String(body.to || "");
    const text = String(body.text || "").trim().slice(0, 1000);
    if (!to || !text) return send(res, 400, { error: "to and text are required" });
    if (to === user.id) return send(res, 400, { error: "You cannot message yourself" });

    const recipients = await supabase(`chat_users?id=eq.${encodeURIComponent(to)}&select=id`);
    if (!recipients.length) return send(res, 404, { error: "User does not exist" });

    await touchUser(user.id);
    const rows = await supabase("chat_messages", {
      method: "POST",
      body: JSON.stringify([{ from_id: user.id, to_id: to, text }]),
    });
    const message = rows[0];
    send(res, 201, {
      message: {
        id: message.id,
        from: message.from_id,
        to: message.to_id,
        text: message.text,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
