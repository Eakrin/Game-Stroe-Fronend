import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type FsTimestamp = { seconds: number; nanoseconds: number } | { toDate: () => Date };
type Tx = {
  id?: string;
  userId: string;
  type?: 'topup' | 'purchase' | 'withdraw' | string;
  amount: number;               // ← จะ normalize ให้เสมอ
  detail?: string;
  createdAt?: string | Date | FsTimestamp;
  createdAtDate?: Date;
};

@Component({
  selector: 'app-topup-history',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './topup-history.html',
  styleUrls: ['./topup-history.scss'],
})
export class TopupHistory implements OnInit {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  loading = true;
  items: Tx[] = [];
  filter: 'all' | 'topup' | 'purchase' = 'all';

  private userId = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    const fallbackId = localStorage.getItem('userId') || '';
    if (!userStr && !fallbackId) { alert('กรุณาเข้าสู่ระบบก่อน'); this.loading = false; return; }
    const user = userStr ? JSON.parse(userStr) : { id: fallbackId };
    this.userId = user.id || fallbackId;

    this.http.get<any>(`${this.baseUrl}/wallet/transactions/${this.userId}`).subscribe({
      next: (res) => {
        const raw = Array.isArray(res?.transactions) ? res.transactions : [];

        // ✅ normalize: ถ้าเป็น checkout จะไม่มี amount ให้ใช้ totalPrice แทน
        this.items = raw.map((t: any) => {
          const isCheckout = Array.isArray(t?.items) && (t?.totalPrice != null);
          const amount = Number(
            isCheckout ? t.totalPrice : t.amount
          ) || 0;

          const createdAtDate = this.toDate(t?.createdAt) || new Date(0);

          // เขียน detail ให้อ่านง่ายขึ้นถ้าเป็น checkout
          let detail = t?.detail;
          if (isCheckout) {
            const names: string[] = (t.items || []).map((i: any) => i?.name).filter(Boolean);
            const head = names.slice(0, 2).join(', ');
            const more = names.length > 2 ? ` +${names.length - 2} เกม` : '';
            detail = detail || `ซื้อหลายเกม: ${head}${more}`;
          }

          return {
            id: String(t?.id ?? t?._id ?? Math.random().toString(36).slice(2)),
            userId: String(t?.userId ?? ''),
            type: t?.type ?? (isCheckout ? 'purchase' : undefined),
            amount,
            detail,
            createdAt: t?.createdAt,
            createdAtDate,
          } as Tx;
        }).sort((a: Tx, b: Tx) => (b.createdAtDate!.getTime()) - (a.createdAtDate!.getTime()));
      },
      error: () => { this.items = []; },
      complete: () => (this.loading = false),
    });
  }

  setFilter(f: 'all' | 'topup' | 'purchase') { this.filter = f; }

  get filtered(): Tx[] {
    return this.filter === 'all' ? this.items : this.items.filter(i => i.type === this.filter);
  }

  get totalTopup(): number {
    return this.items.filter(i => i.type === 'topup').reduce((s,i)=>s+(+i.amount||0),0);
  }

  trackById = (_: number, t: Tx) => t.id ?? `${t.userId}-${t.detail}-${t.createdAt}`;

  private toDate(v: any): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }
}
