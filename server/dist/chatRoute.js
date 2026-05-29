// Ejemplo de cómo conectar en tu router de Express
// Adapta las rutas y middleware según tu estructura actual
import { Router } from 'express';
import { processChatMessage, clearSession } from './chatSession.js';
const router = Router();
function uuidv4() {
    return crypto.randomUUID();
}
// POST /api/chat
// Body: { message: string, sessionId?: string }
router.post('/chat', async (req, res) => {
    try {
        const { message, sessionId: clientSessionId } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
        }
        // Si el cliente no manda sessionId, creamos uno nuevo
        const sessionId = clientSessionId ?? uuidv4();
        const { reply } = await processChatMessage(sessionId, message.trim());
        // Devuelve el sessionId para que el frontend lo reutilice en los siguientes mensajes
        return res.json({ reply, sessionId });
    }
    catch (err) {
        console.error('[chat route] Error:', err);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// DELETE /api/chat/:sessionId  — resetea la conversación
router.delete('/chat/:sessionId', (req, res) => {
    clearSession(req.params.sessionId);
    return res.json({ ok: true });
});
export default router;
