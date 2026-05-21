import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ChatbotFloatingComponent } from './shared/components/chatbot-floating/chatbot-floating.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ChatbotFloatingComponent, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(public auth: AuthService) {}
}
