import { Router, type IRouter } from "express";
import {
  authError, authState, createSession, deleteMessage, displayUser,
  editMessage, getSession, isAuthorized, listChats, listMessages,
  logout, removeSession, sendMessage, startPhoneAuth, verifyPassword,
  verifyPhoneCode,
} from "../lib/telegram";

const router: IRouter = Router();
const COOKIE = "telegram_session";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function sessionFromRequest(req: { cookies?: Record<string, string> }) {
  return getSession(req.cookies?.[COOKIE]);
}

function requireSession(
  req: Parameters<typeof sessionFromRequest>[0],
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  const session = sessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return null;
  }
  return session;
}

router.get("/telegram/status", async (req, res) => {
  const session = sessionFromRequest(req);
  if (!session) return res.json({ authenticated: false, state: "phone" });
  try {
    const authenticated = await isAuthorized(session);
    return res.json({ authenticated, state: authenticated ? "ready" : authState(session), user: displayUser(session) });
  } catch (error) {
    return res.json({ authenticated: false, state: authState(session), error: authError(error) });
  }
});

router.post("/telegram/auth/start", async (req, res) => {
  try {
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    let id = req.cookies?.[COOKIE];
    let session = getSession(id);
    if (!session) {
      id = createSession();
      session = getSession(id);
    }
    if (!session || !id) return res.status(500).json({ error: "SESSION_CREATE_FAILED" });
    const result = await startPhoneAuth(session, phone);
    res.cookie(COOKIE, id, cookieOptions);
    return res.json({ state: "code", ...result });
  } catch (error) {
    const code = authError(error);
    return res.status(code === "TELEGRAM_API_NOT_CONFIGURED" ? 503 : 400).json({ error: code });
  }
});

router.post("/telegram/auth/verify", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  try {
    await verifyPhoneCode(session, String(req.body?.code ?? ""));
    return res.json({ state: "ready", authenticated: true, user: displayUser(session) });
  } catch (error) {
    const code = authError(error);
    if (code.includes("SESSION_PASSWORD_NEEDED")) return res.json({ state: "password", authenticated: false });
    return res.status(400).json({ error: code });
  }
});

router.post("/telegram/auth/password", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  try {
    await verifyPassword(session, String(req.body?.password ?? ""));
    return res.json({ state: "ready", authenticated: true, user: displayUser(session) });
  } catch (error) {
    return res.status(400).json({ error: authError(error) });
  }
});

router.post("/telegram/auth/logout", async (req, res) => {
  const id = req.cookies?.[COOKIE];
  const session = sessionFromRequest(req);
  if (session) await logout(session);
  if (id) removeSession(id);
  res.clearCookie(COOKIE, cookieOptions);
  return res.json({ authenticated: false });
});

router.get("/telegram/chats", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  try {
    return res.json({ chats: await listChats(session) });
  } catch (error) {
    return res.status(502).json({ error: authError(error) });
  }
});

router.get("/telegram/chats/:chatId/messages", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  try {
    return res.json({ messages: await listMessages(session, req.params.chatId) });
  } catch (error) {
    return res.status(502).json({ error: authError(error) });
  }
});

router.post("/telegram/chats/:chatId/messages", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "MESSAGE_REQUIRED" });
  try {
    return res.status(201).json({ message: await sendMessage(session, req.params.chatId, text) });
  } catch (error) {
    return res.status(502).json({ error: authError(error) });
  }
});

router.patch("/telegram/chats/:chatId/messages/:messageId", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  try {
    return res.json({ message: await editMessage(session, req.params.chatId, req.params.messageId, String(req.body?.text ?? "")) });
  } catch (error) {
    return res.status(502).json({ error: authError(error) });
  }
});

router.delete("/telegram/chats/:chatId/messages/:messageId", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  try {
    await deleteMessage(session, req.params.chatId, req.params.messageId);
    return res.status(204).send();
  } catch (error) {
    return res.status(502).json({ error: authError(error) });
  }
});

export default router;