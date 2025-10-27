import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

type RawCartDoc = {
  id: string;      // document id (cart)
  userId: string;
  gameId: string;
  name: string;
  price: number;
};

type GroupedItem = {
  gameId: string;
  name: string;
  price: number;
  qty: number;     // จำนวนเอกสารของเกมนั้น
  ids: string[];   // ใช้ลบทีละ 1
  imageUrl?: string;
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class Cart implements OnInit {
  // TODO: ย้ายไป environment ถ้าไปโปรดักชัน
  private BASE_URL = 'http://localhost:3200';

  userId = '';
  items: GroupedItem[] = [];
  loading = false;
  paying = false;
  errorMsg = '';

  // สรุปยอด / คูปอง
  coupon = '';
  discountPercent = 0;
  discountAmount = 0;
  subtotal = 0;
  total = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // ✅ ดึง userId จาก localStorage (ให้ตรงกับที่ใช้ตอน login)
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    this.userId = user?.id ?? user?._id ?? '';

    // ถ้ายังไม่ล็อกอิน—ให้หน้านี้แสดง empty state ได้เลย
    if (!this.userId) {
      this.loading = false;
      this.items = [];
      this.recalc();
      return;
    }

    this.load();
  }

  /** โหลดตะกร้า → group ตาม gameId → เติม imageUrl → คำนวณยอด */
  load(): void {
    this.loading = true;
    this.errorMsg = '';

    this.http.get<{
      message: string; count: number; totalPrice: number; cartItems: RawCartDoc[];
    }>(`${this.BASE_URL}/user_cart/${this.userId}`)
      .subscribe({
        next: (res) => {
          const map = new Map<string, GroupedItem>();
          (res.cartItems || []).forEach(d => {
            if (!map.has(d.gameId)) {
              map.set(d.gameId, {
                gameId: d.gameId,
                name: d.name,
                price: Number(d.price) || 0,
                qty: 0,
                ids: []
              });
            }
            const g = map.get(d.gameId)!;
            g.qty += 1;
            g.ids.push(d.id);
          });

          const groups = Array.from(map.values());
          if (!groups.length) {
            this.items = [];
            this.recalc();
            this.loading = false;
            return;
          }

          // ดึงรูปเกม (optional)
          forkJoin(
            groups.map(g => this.http.get<{ message: string; game: any }>(
              `${this.BASE_URL}/admin_search/games/${g.gameId}`
            ))
          ).subscribe({
            next: (games) => {
              games.forEach((r, i) => groups[i].imageUrl = r?.game?.imageUrl || '');
              this.items = groups;
              this.recalc();
              this.loading = false;
            },
            error: () => {
              // ถ้าดึงรูปพลาดก็ยังโชว์รายการได้
              this.items = groups;
              this.recalc();
              this.loading = false;
            }
          });
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || err?.message || 'โหลดรถเข็นไม่สำเร็จ';
          this.items = [];
          this.recalc();
          this.loading = false;
        }
      });
  }

  /** คำนวณยอดรวม/ส่วนลด/สุทธิ */
  private recalc(): void {
    this.subtotal = this.items.reduce((s, it) => s + (Number(it.price) || 0) * it.qty, 0);
    this.discountAmount = Math.round(this.subtotal * (this.discountPercent / 100));
    this.total = this.subtotal - this.discountAmount;
  }

  /** เพิ่ม 1 ชิ้น (สร้างเอกสารใหม่ใน cart) */
  inc(it: GroupedItem): void {
    this.http.post<{ message: string; id: string }>(
      `${this.BASE_URL}/user_cart/add`,
      { userId: this.userId, gameId: it.gameId, name: it.name, price: it.price }
    ).subscribe(() => this.load());
  }

  /** ลบ 1 ชิ้น (ลบเอกสารท้ายสุดของเกมนั้น) */
  dec(it: GroupedItem): void {
    if (it.qty <= 1) return;
    const docId = it.ids[it.ids.length - 1];
    this.http.delete<{ message: string }>(
      `${this.BASE_URL}/user_cart/remove/${docId}`
    ).subscribe(() => this.load());
  }

  /** ลบทั้งหมดของเกมนั้น */
  removeAll(it: GroupedItem): void {
    if (!it.ids?.length) return;
    const jobs = it.ids.map(id => this.http.delete(`${this.BASE_URL}/user_cart/remove/${id}`));
    forkJoin(jobs).subscribe(() => this.load());
  }

  /** ใช้คูปองส่วนลด (ตาม backend เดิม) */
  applyCoupon(): void {
    if (!this.coupon?.trim()) { this.discountPercent = 0; this.discountAmount = 0; this.recalc(); return; }

    this.http.post<{
      message: string; discountPercent: number; totalPrice: number; discount: number; finalPrice: number;
    }>(`${this.BASE_URL}/user_cart/apply_discount`, {
      userId: this.userId, promoCode: this.coupon.trim()
    }).subscribe({
      next: (res) => {
        this.discountPercent = Number(res.discountPercent) || 0;
        this.discountAmount  = Number(res.discount) || 0;
        // ถ้าหลังบ้านคำนวณ finalPrice มาให้ ใช้อันนั้น
        this.total = (typeof res.finalPrice === 'number') ? res.finalPrice : (this.subtotal - this.discountAmount);
      },
      error: () => {
        // ถ้าโค้ดไม่ผ่าน ให้รีเซ็ตส่วนลด
        this.discountPercent = 0;
        this.discountAmount = 0;
        this.recalc();
      }
    });
  }

  /** ชำระเงิน (หัก wallet → checkout; ถ้า fail คืนเงิน) */
  checkout(): void {
    if (!this.items.length || this.paying) return;

    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const userId = user?.id ?? user?._id ?? '';
    if (!userId) { alert('กรุณาเข้าสู่ระบบ'); return; }

    const amount = Math.max(0, Number(this.total) || 0);
    if (amount <= 0) { alert('ยอดไม่ถูกต้อง'); return; }

    this.paying = true;
    this.loading = true;

    // 1) ถอนเงินจาก wallet ก่อน
    this.http.post<{ message: string; withdrawn: number; balance: number }>(
      `${this.BASE_URL}/wallet_withdraw`,
      { userId, amount }
    ).subscribe({
      next: () => {
        // 2) ถอนสำเร็จ → checkout
        this.http.post<{ message: string; totalPrice: number; transaction: any }>(
          `${this.BASE_URL}/user_cart/checkout`,
          { userId, paymentMethod: 'Wallet' }
        ).subscribe({
          next: (res) => {
            alert(`${res.message} • ยอดชำระ ${Number(res.totalPrice || 0).toLocaleString()} บาท`);
            // รีเซ็ตคูปองแล้วโหลดใหม่ (backend จะลบของที่ซื้อสำเร็จออกจาก cart ให้เอง)
            this.coupon = '';
            this.discountPercent = 0;
            this.discountAmount = 0;
            this.load();

            // อัปเดต balance ใน localStorage + broadcast ให้ header/โปรไฟล์รู้
            this.refreshWalletToLocal(userId);
            window.dispatchEvent(new CustomEvent('cart-updated', { detail: { refresh: true }}));
          },
          error: (err) => {
            // 3) ถ้า checkout fail ให้คืนเงินกลับ (topup) ด้วย requestId ที่ไม่ซ้ำ
            const requestId = `refund-${Date.now()}`;
            this.http.post(
              `${this.BASE_URL}/wallet_topup`,
              { userId, amount, requestId }
            ).subscribe({
              next: () => {
                alert(err?.error?.message || 'ชำระเงินไม่สำเร็จ (ได้คืนเงินแล้ว)');
                this.paying = false;
                this.loading = false;
              },
              error: () => {
                alert('ชำระเงินไม่สำเร็จ และคืนเงินไม่สำเร็จ กรุณาติดต่อแอดมิน');
                this.paying = false;
                this.loading = false;
              }
            });
          }
        });
      },
      error: (err) => {
        alert(err?.error?.message || 'ยอดเงินในกระเป๋าไม่พอ');
        this.paying = false;
        this.loading = false;
      }
    });
  }

  /** ดึงยอด wallet ล่าสุด → อัปเดต localStorage + broadcast ให้หน้าอื่น sync */
  private refreshWalletToLocal(userId: string) {
    this.http.get<any>(`${this.BASE_URL}/wallet/${userId}`).subscribe({
      next: (w) => {
        const bal = Number(w?.balance ?? 0);
        const raw = localStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          u.balance = bal;
          localStorage.setItem('user', JSON.stringify(u));
          window.dispatchEvent(new CustomEvent('user-updated', { detail: u }));
        }
        this.paying = false;
        this.loading = false;
      },
      error: () => { this.paying = false; this.loading = false; }
    });
  }

  /** ใช้กับ *ngFor เพื่อ performance */
  trackByGame = (_: number, it: GroupedItem) => it.gameId;
}
