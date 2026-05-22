import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from 'src/app/core/services/chatbot.service';

const QUICK_REPLIES: Record<string, string> = {
  hola: '¡Hola! Pregúntame precios, servicios, productos u horarios (10:00 a.m. / 2:00 p.m.).',
  precios: 'Te muestro precios actualizados de servicios y productos.',
  horarios: 'Citas disponibles: 10:00 a.m. y 2:00 p.m.',
  servicios: 'Consulta nuestros servicios y precios.',
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
  suggestions = ['Precios', 'Horarios', 'Servicios', 'Productos', 'Agendar cita'];
  private replyCache = new Map<string, string>();

  constructor(
    private chatbot: ChatbotService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.messages.push({
      from: 'bot',
      text: '¡Hola! Soy tu asesor Luxury Service. Pregúntame lo que necesites: precios, servicios, productos, horarios o cómo agendar. Respuesta rápida garantizada.'
    });
  }

  toggle() { this.open = !this.open; }

  send(text?: string) {
    const userMsg = (text || this.newMessage).trim();
    if (!userMsg) return;
    this.newMessage = '';
    this.messages.push({ text: userMsg, from: 'user' });

    const cacheKey = userMsg.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
    const cached = this.replyCache.get(cacheKey);
    if (cached) {
      this.messages.push({ text: cached, from: 'bot' });
      this.scheduleScroll();
      return;
    }

    const quick = QUICK_REPLIES[userMsg.toLowerCase().split(' ')[0]];
    if (quick && userMsg.length < 12) {
      this.replyCache.set(cacheKey, quick);
      this.messages.push({ text: quick, from: 'bot' });
      this.scheduleScroll();
      return;
    }

    this.typing = true;
    this.cdr.detectChanges();
    this.scheduleScroll();

    this.chatbot.sendMessage(userMsg).subscribe({
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
    this.send(s === 'Precios' ? '¿Cuáles son los precios?' : s === 'Horarios' ? 'horarios' : s === 'Servicios' ? 'servicios' : s === 'Productos' ? 'productos' : '¿Cómo agendar una cita?');
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
