// ...existing code...
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  cartCount = 0;

  constructor(private router: Router) {
    try {
      const c = localStorage.getItem('cart');
      if (c) {
        const arr = JSON.parse(c);
        this.cartCount = Array.isArray(arr) ? arr.length : Number(arr) || 0;
      }
    } catch { /* ignore */ }
  }

  goCart() {
    this.router.navigate(['/cart']).catch(err => console.error('navigate /cart error', err));
  }

  goLogin() { this.router.navigate(['/login']).catch(()=>{}); }

  goLogout() {
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('user-updated', { detail: null }));
    this.router.navigate(['/login']).catch(()=>{});
  }
}
// ...existing code...