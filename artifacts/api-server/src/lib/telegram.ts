import { randomBytes } from "node:crypto";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

type AuthState = "phone" | "code" | "password" | "ready";

type TelegramSession = {
  client: TelegramClient;
  phone?: string;
  phoneCodeHash?: string;
  state: AuthState;
  user?: Api.TypeUser;
  chats: Map<string, unknown>;
};

const sessions = new Map<string, TelegramSession>();

function credentials() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!Number.isInteger(apiId) || apiId <= 0 || !apiHash) {
    throw new Error("TELEGRAM_API_NOT_CONFIGURED");
  }
  return { apiId, apiHash };
}

function sessionId() {
  return randomBytes(32).toString("base64url");
}

export function createSession() {
  const { apiId, apiHash } = credentials();
  const id = sessionId();
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
    deviceModel: "Telegram Web Arabic",
    appVersion: "1.0.0",
  });
  sessions.set(id, { client, state: "phone", chats: new Map() });
  return id;
}

export function getSession(id: string | undefined) {
  return id ? sessions.get(id) : undefined;
}

export function removeSession(id: string) {
  const session = sessions.get(id);
  sessions.delete(id);
  if (session) void session.client.disconnect().catch(() => undefined);
}

export async function startPhoneAuth(session: TelegramSession, phone: string) {
  const normalizedPhone = phone.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) throw new Error("PHONE_NUMBER_INVALID");
  const { apiId, apiHash } = credentials();
  await session.client.connect();
  const result = await session.client.sendCode({ apiId, apiHash }, normalizedPhone);
  session.phone = normalizedPhone;
  session.phoneCodeHash = result.phoneCodeHash;
  session.state = "code";
  return { isCodeViaApp: result.isCodeViaApp };
}

export async function verifyPhoneCode(session: TelegramSession, code: string) {
  if (!session.phone || !session.phoneCodeHash) throw new Error("AUTH_SESSION_EXPIRED");
  const result = await session.client.invoke(new Api.auth.SignIn({
    phoneNumber: session.phone,
    phoneCodeHash: session.phoneCodeHash,
    phoneCode: code.trim(),
  }));
  if ("user" in result && result.user) session.user = result.user;
  session.state = "ready";
}

export async function verifyPassword(session: TelegramSession, password: string) {
  const { apiId, apiHash } = credentials();
  session.user = await session.client.signInWithPassword(
    { apiId, apiHash },
    { password: async () => password, onError: async () => true },
  );
  session.state = "ready";
}

export async function isAuthorized(session: TelegramSession) {
  await session.client.connect();
  const authorized = await session.client.checkAuthorization();
  if (authorized) session.state = "ready";
  return authorized;
}

export function authState(session: TelegramSession) {
  return session.state;
}

export function authError(error: unknown) {
  const candidate = error as { errorMessage?: string; message?: string };
  return (candidate.errorMessage ?? candidate.message ?? "TELEGRAM_ERROR")
    .replace(/\s+/g, "_").toUpperCase();
}

function userName(user: Api.TypeUser) {
  if (user instanceof Api.User) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Telegram";
  }
  return "Telegram";
}

function entityKind(dialog: { isUser: boolean; isGroup: boolean; isChannel: boolean }) {
  if (dialog.isUser) return "محادثة خاصة";
  if (dialog.isChannel) return "قناة";
  if (dialog.isGroup) return "مجموعة";
  return "محادثة";
}

export async function listChats(session: TelegramSession) {
  const dialogs = await session.client.getDialogs({ limit: 100 });
  session.chats.clear();
  return dialogs.map((dialog) => {
    const id = dialog.id?.toString() ?? "";
    session.chats.set(id, dialog.inputEntity);
    const title = dialog.title ?? (dialog.entity instanceof Api.User ? userName(dialog.entity) : "محادثة");
    const preview = dialog.message && "message" in dialog.message ? String(dialog.message.message ?? "") : "";
    return {
      id, name: title, preview,
      time: dialog.date ? new Date(dialog.date * 1000).toISOString() : null,
      unread: dialog.unreadCount || 0,
      pinned: Boolean(dialog.pinned),
      archived: Boolean(dialog.archived),
      kind: entityKind(dialog),
    };
  });
}

function mapMessage(message: Api.TypeMessage) {
  if (!(message instanceof Api.Message)) {
    const serviceMessage = message as Api.MessageService;
    return {
      id: String(message.id), text: "رسالة خدمة",
      time: "date" in serviceMessage && serviceMessage.date ? new Date(serviceMessage.date * 1000).toISOString() : null,
      outgoing: false,
    };
  }
  return {
    id: String(message.id),
    text: message.message || (message.media ? "وسائط" : ""),
    time: message.date ? new Date(message.date * 1000).toISOString() : null,
    outgoing: Boolean(message.out),
    edited: Boolean(message.editDate),
  };
}

export async function listMessages(session: TelegramSession, chatId: string) {
  const entity = session.chats.get(chatId);
  if (!entity) throw new Error("CHAT_NOT_FOUND");
  const messages = await session.client.getMessages(entity as never, { limit: 100 });
  return messages.map(mapMessage).reverse();
}

export async function sendMessage(session: TelegramSession, chatId: string, text: string) {
  const entity = session.chats.get(chatId);
  if (!entity) throw new Error("CHAT_NOT_FOUND");
  return mapMessage(await session.client.sendMessage(entity as never, { message: text.trim() }) as unknown as Api.TypeMessage);
}

export async function editMessage(session: TelegramSession, chatId: string, messageId: string, text: string) {
  const entity = session.chats.get(chatId);
  if (!entity) throw new Error("CHAT_NOT_FOUND");
  const message = await session.client.editMessage(entity as never, { message: Number(messageId), text: text.trim() });
  return mapMessage(message as unknown as Api.TypeMessage);
}

export async function deleteMessage(session: TelegramSession, chatId: string, messageId: string) {
  const entity = session.chats.get(chatId);
  if (!entity) throw new Error("CHAT_NOT_FOUND");
  await session.client.deleteMessages(entity as never, [Number(messageId)], { revoke: true });
}

export async function logout(session: TelegramSession) {
  if (await session.client.checkAuthorization()) await session.client.invoke(new Api.auth.LogOut());
  session.state = "phone";
}

export function displayUser(session: TelegramSession) {
  if (session.user instanceof Api.User) {
    return {
      name: userName(session.user),
      username: session.user.username ? `@${session.user.username}` : "",
      phone: session.user.phone ?? "",
    };
  }
  return null;
}