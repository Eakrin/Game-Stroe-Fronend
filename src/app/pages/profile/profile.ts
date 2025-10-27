// profile.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

type Game = { id: number; title: string; cover: string };

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  private baseUrl = 'http://localhost:3200';

  user: any = null;
  loading = true;
  balance = 0;

  games: Game[] = [ /* ...เดิม... */ ];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('กรุณาเข้าสู่ระบบก่อน');
      this.router.navigate(['/login']);
      return;
    }
    const u = JSON.parse(storedUser);

    // โหลดโปรไฟล์
    this.http.get(`${this.baseUrl}/profile/${u.id}`).subscribe({
      next: (res: any) => { this.user = res.user; this.loading = false; },
      error: () => { alert('โหลดข้อมูลไม่สำเร็จ ❌'); this.loading = false; },
    });

    // ถ้ามี state จากหน้า Topup ให้ตั้งค่าก่อน
    const stateBal = history.state?.balance;
    if (typeof stateBal === 'number') this.balance = stateBal;

    // ดึงยอดล่าสุดจาก backend เพื่อความถูกต้อง
    this.fetchWallet(u.id);

    // กันกรณี Angular reuse component: ถ้ากลับมาหน้านี้อีกครั้ง ให้ดึงยอดใหม่อีกรอบ
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const userNow = JSON.parse(localStorage.getItem('user') || '{}');
      if (userNow?.id) this.fetchWallet(userNow.id);
    });
  }

  private fetchWallet(userId: string) {
    this.http.get<any>(`${this.baseUrl}/wallet/${userId}`).subscribe({
      next: (w) => this.balance = Number(w?.balance ?? 0),
      error: () => this.balance = 0,
    });
  }

  goTopup() { this.router.navigate(['/profile/topup']); }
  goPurchaseHistory() { this.router.navigate(['/profile/purchasehistory']); }
  goTopupHistory() { this.router.navigate(['/profile/history']); }
  openGameDetail(g: Game) { this.router.navigate(['/games', g.id]); }
  openEditProfile() { this.router.navigate(['/profile/edit']); }
  goLibrary() { this.router.navigate(['/profile/library']); }
}
