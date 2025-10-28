// topup.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-topup',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './topup.html',
  styleUrls: ['./topup.scss'],
})
export class Topup {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  wallet = { name: 'True Money Wallet', number: '084 321 9436', owner: 'นาย สมสุข จิกกะดุ๊ย' };

  presets = [100, 300, 500, 1000];
  amount = 0;
  custom: number | null = null;
  error = '';

  /** ป้องกันกดซ้ำระหว่างส่งคำขอ */
  submitting = false;

  /** ใช้ user.id จาก localStorage 'user' ให้เหมือนกับหน้า Profile */
  get userId(): string {
    const raw = localStorage.getItem('user');
    try { return raw ? JSON.parse(raw).id : ''; } catch { return ''; }
  }

  constructor(private router: Router, private http: HttpClient) {}

  selectPreset(p: number) {
    this.amount = Number(p) || 0;
    this.custom = null;
    this.error = this.amount <= 0 ? 'กรุณาเลือกจำนวนเงิน' : '';
  }

  onCustomChange() {
    const num = Number(this.custom);
    this.amount = Number.isFinite(num) ? num : 0;
    this.error = this.amount <= 0 ? 'กรุณากรอกจำนวนมากกว่า 0' : '';
  }

  canSubmit() {
    return this.amount > 0 && !this.error && !!this.userId && !this.submitting;
  }

  /** สร้าง requestId แบบง่าย ๆ เพื่อทำ idempotency */
  private uuid(): string {
    try {
      // ใช้ Web Crypto ถ้ามี
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      // แปลงเป็นรูปแบบ xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      const b = Array.from(buf, toHex).join('');
      return `${b.slice(0,8)}-${b.slice(8,12)}-${b.slice(12,16)}-${b.slice(16,20)}-${b.slice(20)}`;
    } catch {
      // fallback
      return `rid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  submitTopup() {
    if (!this.canSubmit()) return;

    if (!this.userId) {
      alert('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    this.submitting = true;

    const body = {
      userId: this.userId,
      amount: this.amount,
      requestId: this.uuid(),   // ← สำคัญ: กันยิงซ้ำ
    };

    this.http.post<any>(`${this.baseUrl}/wallet_topup`, body).subscribe({
      next: (res) => {
        const newBalance = Number(res?.balance || 0);
        alert(`เติมเงินสำเร็จ ✅ ยอดคงเหลือ: ${newBalance.toLocaleString()} บาท`);

        // อัปเดต localStorage (ถ้ามี object user เก็บ balance)
        const raw = localStorage.getItem('user');
        if (raw) {
          try {
            const u = JSON.parse(raw);
            u.balance = newBalance;
            localStorage.setItem('user', JSON.stringify(u));
            // แจ้งหน้าอื่น ๆ ที่ฟัง event นี้ให้รีเฟรชยอด
            window.dispatchEvent(new CustomEvent('user-updated', { detail: u }));
          } catch {}
        }

        // ส่งยอดใหม่กลับหน้าโปรไฟล์ทันที
        this.router.navigate(['/profile'], { state: { balance: newBalance } });
      },
      error: (e) => {
        alert(e?.error?.message || 'เติมเงินไม่สำเร็จ ❌');
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  cancel() { this.router.navigate(['/profile']); }
  goBack() { window.history.back(); }
}
