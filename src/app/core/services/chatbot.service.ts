import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private api: ApiService) {}
  sendMessage(message: string): Observable<{ reply: string }> {
    return this.api.post<{ reply: string }>('/chatbot', { message });
  }
}
