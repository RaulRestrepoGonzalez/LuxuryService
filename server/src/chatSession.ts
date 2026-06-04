import { buildChatbotReply, detectarVehiculo, ChatTurn } from './chatbot.js';
import { getDb } from './db.js';

const SESSION_MAX_TURNS = 30;

export async function getSession(sessionId: string): Promise<ChatTurn[]> {
  try {
    const db = getDb();
    const doc = await db.collection('chat_sessions').findOne({ sessionId });
    return (doc?.history as ChatTurn[]) ?? [];
  } catch {
    return [];
  }
}

export async function saveSession(sessionId: string, history: ChatTurn[]): Promise<void> {
  try {
    const db = getDb();
    const trimmed = history.slice(-SESSION_MAX_TURNS);
    await db.collection('chat_sessions').updateOne(
      { sessionId },
      { $set: { history: trimmed, lastActivity: new Date() } },
      { upsert: true }
    );
  } catch {
    // Silently fail
  }
}

export async function clearSession(sessionId: string): Promise<void> {
  try {
    const db = getDb();
    await db.collection('chat_sessions').deleteOne({ sessionId });
  } catch {
    // Silently fail
  }
}

export async function processChatMessage(
  sessionId: string,
  message: string,
  userEmail?: string,
  userName?: string
): Promise<{ reply: string; sessionId: string }> {
  const history = await getSession(sessionId);

  const reply = await buildChatbotReply(message, history, undefined, userEmail, userName);

  const vehiculoDetectado = detectarVehiculo(message) ?? undefined;

  const turnoUsuario: ChatTurn = {
    role: 'user',
    text: message,
    vehiculo: vehiculoDetectado,
  };
  const turnoBot: ChatTurn = {
    role: 'bot',
    text: reply,
  };

  await saveSession(sessionId, [...history, turnoUsuario, turnoBot]);

  return { reply, sessionId };
}
