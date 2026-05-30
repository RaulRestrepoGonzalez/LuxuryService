import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from 'src/app/core/services/chatbot.service';

const QUICK_REPLIES: Record<string, (v: string | null) => string | null> = {
  hola: v => v
    ? `¡Hola de nuevo! Tienes **${v === 'auto' ? 'Automóvil' : v === 'camioneta' ? 'Camioneta' : 'Moto'}**. Pregúntame por servicios, horarios, productos o cómo agendar una cita.`
    : '¡Hola! ¿Qué tipo de vehículo tienes? 🚗 Automóvil · 🚙 Camioneta · 🏍️ Moto',
  horarios: () => '🕐 **Horarios:**\n• Lunes a sábado: 8:00 a.m. - 6:00 p.m.\n• Citas: 10:00 a.m. y 2:00 p.m.\n• Domingos: Cerrado',
  automovil: () => '¡Perfecto! Seleccionaste **Automóvil** 🚗. Pregúntame por servicios, productos, horarios o cómo agendar una cita.',
  camioneta: () => '¡Perfecto! Seleccionaste **Camioneta** 🚙. Pregúntame por servicios, productos, horarios o cómo agendar una cita.',
  moto: () => '¡Perfecto! Seleccionaste **Moto** 🏍️. Pregúntame por servicios, productos, horarios o cómo agendar una cita.',
};

function generateId(): string {
  return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

@Component({
  selector: 'app-chatbot-floating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-floating.component.html',
  styleUrls: ['./chatbot-floating.component.css']
})
export class ChatbotFloatingComponent implements OnInit {
  open = false;
  messages: { text: string; from: 'user' | 'bot' }[] = [];
  newMessage = '';
  typing = false;
  vehiculo: 'auto' | 'camioneta' | 'moto' | null = null;
  suggestions = ['Automóvil', 'Camioneta', 'Moto', 'Servicios', 'Productos', 'Horarios', 'Agendar cita'];
  private replyCache = new Map<string, string>();
  private sessionId = generateId();

  constructor(
    private chatbot: ChatbotService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.messages.push({
      from: 'bot',
      text: '¡Hola! Soy tu asesor Luxury Service. ¿Qué tipo de vehículo tienes? 🚗 Automóvil · 🚙 Camioneta · 🏍️ Moto'
    });
  }

  toggle() { this.open = !this.open; }

  send(text?: string) {
    const userMsg = (text || this.newMessage).trim();
    if (!userMsg) return;
    this.newMessage = '';
    this.messages.push({ text: userMsg, from: 'user' });

    const lower = userMsg.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    // Detect vehicle type from message (expanded)
    if (/auto|automovil|carro|sedan|berlina|hatchback|furgoneta|van|furgon|deportivo|coupe|chevette|aveo|spark|swift|picanto|logan|sandero|twingo/.test(lower)) {
      this.vehiculo = 'auto';
    } else if (/camioneta|4x4|todo terreno|suv|troca|pickup|troc|camion|blazer|trailblazer|explorer|duster|tracker|vitara|grand vitara/.test(lower)) {
      this.vehiculo = 'camioneta';
    } else if (/moto|motocicleta|picante|ciclomotor|pistera|cross|enduro|scooter|vespa/.test(lower)) {
      this.vehiculo = 'moto';
    }

    const cacheKey = this.sessionId + '|' + (this.vehiculo || '') + '|' + lower.trim();
    const cached = this.replyCache.get(cacheKey);
    if (cached) {
      this.messages.push({ text: cached, from: 'bot' });
      this.scheduleScroll();
      return;
    }

    // Quick replies with vehicle awareness
    const firstWord = userMsg.toLowerCase().split(' ')[0];
    const quickFn = QUICK_REPLIES[firstWord];
    // Also check aliases for vehicle type
    if (!quickFn && this.vehiculo && /^(auto|automovil|carro|camioneta|moto|motocicleta)$/.test(firstWord)) {
      const vLabel = this.vehiculo === 'auto' ? 'automovil' : this.vehiculo;
      const vQuick = QUICK_REPLIES[vLabel];
      if (vQuick) {
        const reply = vQuick(this.vehiculo);
        if (reply) {
          this.replyCache.set(cacheKey, reply);
          this.messages.push({ text: reply, from: 'bot' });
          this.scheduleScroll();
          return;
        }
      }
    }
    if (quickFn && userMsg.length < 12) {
      const quickReply = quickFn(this.vehiculo);
      if (quickReply) {
        this.replyCache.set(cacheKey, quickReply);
        this.messages.push({ text: quickReply, from: 'bot' });
        this.scheduleScroll();
        return;
      }
      // quickFn returned null → send to API for a rich response
    }

    this.typing = true;
    this.cdr.detectChanges();
    this.scheduleScroll();

    this.chatbot.sendMessage(userMsg, this.vehiculo ?? undefined, this.sessionId).subscribe({
      next: res => {
        this.replyCache.set(cacheKey, res.reply);
        this.typing = false;
        this.messages.push({ text: res.reply, from: 'bot' });
        this.cdr.detectChanges();
        this.scheduleScroll();
      },
      error: () => {
        this.typing = false;
        this.messages.push({ text: 'Error de conexión. Intenta de nuevo.', from: 'bot' });
        this.cdr.detectChanges();
        this.scheduleScroll();
      }
    });
  }

  useSuggestion(s: string) {
    const map: Record<string, string> = {
      'Automóvil': 'automovil',
      'Camioneta': 'camioneta',
      'Moto': 'moto',
      'Horarios': 'horarios',
      'Servicios': 'servicios',
      'Agendar cita': '¿Cómo agendar una cita?',
    };
    this.send(map[s] || s);
  }

  private scheduleScroll() {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector('.chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }
}
