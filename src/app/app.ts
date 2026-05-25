import { Component, HostListener } from '@angular/core';
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
  menuOpen = false;

  constructor(public auth: AuthService) {}

  toggleMenu() { this.menuOpen = !this.menuOpen; }

  closeMenu() { this.menuOpen = false; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (this.menuOpen && !target.closest('.site-header')) {
      this.menuOpen = false;
    }
  }
}
