import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from 'src/app/core/services/chatbot.service';

const QUICK_REPLIES: Record<string, (v: string | null) => string | null> = {
  hola: v => v
    ? `¡Hola de nuevo! Tienes seleccionado **${v === 'auto' ? 'Automóvil' : v === 'camioneta' ? 'Camioneta' : 'Moto'}**. Pregúntame por servicios, cotización, horarios (10:00 a.m. y 2:00 p.m.) o cómo agendar.`
    : '¡Hola! ¿Qué tipo de vehículo tienes? 🚗 Automóvil · 🚙 Camioneta · 🏍️ Moto',
  precios: v => v
    ? null
    : 'Para consultar precios primero dime: ¿Automóvil, Camioneta o Moto?',
  horarios: () => 'Citas disponibles: 10:00 a.m. y 2:00 p.m.',
  servicios: v => v ? null : '¿Qué tipo de vehículo tienes? 🚗 Automóvil · 🚙 Camioneta · 🏍️ Moto',
  cotizacion: v => v
    ? null
    : 'Te ayudo a cotizar. ¿Qué tipo de vehículo? 🚗 Automóvil · 🚙 Camioneta · 🏍️ Moto',
};

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
  suggestions = ['Automóvil', 'Camioneta', 'Moto', 'Cotización', 'Horarios', 'Servicios', 'Productos', 'Agendar cita'];
  private replyCache = new Map<string, string>();

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

    // Detect vehicle type from message
    if (lower.includes('automovil') || lower === 'auto') { this.vehiculo = 'auto'; }
    else if (lower.includes('camioneta')) { this.vehiculo = 'camioneta'; }
    else if (lower.includes('moto') || lower.includes('motocicleta')) { this.vehiculo = 'moto'; }

    const cacheKey = (this.vehiculo || '') + '|' + lower.trim();
    const cached = this.replyCache.get(cacheKey);
    if (cached) {
      this.messages.push({ text: cached, from: 'bot' });
      this.scheduleScroll();
      return;
    }

    // Quick replies with vehicle awareness
    const quickKey = userMsg.toLowerCase().split(' ')[0];
    const quickFn = QUICK_REPLIES[quickKey];
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

    this.chatbot.sendMessage(userMsg, this.vehiculo ?? undefined).subscribe({
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
      'Cotización': 'cotizacion',
      'Horarios': 'horarios',
      'Servicios': 'servicios',
      'Productos': 'productos',
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
