import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  template: ''
})
export class LoginComponent implements OnInit {
  constructor(private router: Router) {}
  ngOnInit() { this.router.navigate(['/acceso'], { replaceUrl: true }); }
}
