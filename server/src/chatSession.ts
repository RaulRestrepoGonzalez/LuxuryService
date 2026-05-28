import { buildChatbotReply, detectarVehiculo, ChatTurn, Vehiculo } from './chatbot.js';

// Historial de conversación por sesión (en memoria)
// Para producción, reemplaza con Redis o MongoDB
const sessions = new Map<string, ChatTurn[]>();
const SESSION_MAX_TURNS = 30; // máximo de turnos por sesión
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de inactividad
const sessionTimestamps = new Map<string, number>();

// Limpia sesiones inactivas cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of sessionTimestamps.entries()) {
    if (now - ts > SESSION_TTL_MS) {
      sessions.delete(id);
      sessionTimestamps.delete(id);
    }
  }
}, 10 * 60 * 1000);

export function getSession(sessionId: string): ChatTurn[] {
  return sessions.get(sessionId) ?? [];
}

export function saveSession(sessionId: string, history: ChatTurn[]): void {
  sessions.set(sessionId, history.slice(-SESSION_MAX_TURNS));
  sessionTimestamps.set(sessionId, Date.now());
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
  sessionTimestamps.delete(sessionId);
}

export async function processChatMessage(
  sessionId: string,
  message: string
): Promise<{ reply: string; sessionId: string }> {
  const history = getSession(sessionId);

  // Genera la respuesta pasando el historial completo
  const reply = await buildChatbotReply(message, history);

  // Detecta el vehículo del mensaje actual para guardarlo en el historial
  const vehiculoDetectado = detectarVehiculo(message) ?? undefined;

  // Actualiza el historial
  const turnoUsuario: ChatTurn = {
    role: 'user',
    text: message,
    vehiculo: vehiculoDetectado,
  };
  const turnoBot: ChatTurn = {
    role: 'bot',
    text: reply,
  };

  saveSession(sessionId, [...history, turnoUsuario, turnoBot]);

  return { reply, sessionId };
}