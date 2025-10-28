import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type FsTs = { seconds: number; nanoseconds: number } | { toDate: () => Date };

type Tx = {
  id: string;
  userId: string;
  type?: 'topup' | 'purchase' | 'withdraw' | string;
  amount: number;                 // ✅ ยอดสุทธิหลังหักส่วนลด
  detail?: string;
  createdAt?: string | Date | FsTs;
  createdAtDate?: Date;
};

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './purchase-history.html',
  styleUrls: ['./purchase-history.scss']
})
export class PurchaseHistory implements OnInit {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  loading = true;
  items: Tx[] = [];
  view: Tx[] = [];
  totalSpent = 0;

  filter: 'all' | 'month' | '3m' = 'all';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const uRaw = localStorage.getItem('user');
    if (!uRaw) { alert('กรุณาเข้าสู่ระบบ'); this.loading = false; return; }
    const user = JSON.parse(uRaw);
    const userId = user.id ?? user._id;
    if (!userId) { alert('ไม่พบรหัสผู้ใช้'); this.loading = false; return; }

    this.http.get<any>(`${this.baseUrl}/wallet/transactions/${userId}`).subscribe({
      next: (res) => {
        const all = (res?.transactions ?? []).map((t: any) => {
          // ✅ ถือเป็นการซื้อได้ 2 แบบ: purchase เดิม หรือ checkout (มี items)
          const isCartCheckout = Array.isArray(t?.items) && t?.items.length > 0;
          const isPurchaseType = t?.type === 'purchase';
          const isPurchase = isPurchaseType || isCartCheckout;

          // ✅ เลือกยอดอย่างถูกต้อง: finalPrice > totalPrice > amount
          const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
          const rawTotal = num(t?.totalPrice ?? t?.amount);
          const final = num(t?.finalPrice ?? rawTotal);  // ถ้ามี finalPrice ให้ใช้ก่อน
          const amt = isCartCheckout ? final : num(t?.amount ?? final);

          // ✅ สร้าง detail และบอกว่าใช้คูปองหรือไม่
          let detail: string | undefined = t?.detail;
          let usedCoupon = false;

          if (isCartCheckout) {
            const names: string[] = (t.items || []).map((i: any) => i?.name).filter(Boolean);
            const head = names.slice(0, 2).join(', ');
            const more = names.length > 2 ? ` +${names.length - 2} เกม` : '';
            usedCoupon = Boolean(t?.discountPercent || t?.discount || (final && rawTotal && final < rawTotal));

            const discountPercent =
              num(t?.discountPercent) || (rawTotal ? Math.round((1 - final / rawTotal) * 100) : 0);
            const discountBath = num(t?.discount) || (rawTotal - final);

            const suffix = usedCoupon
              ? ` (ส่วนลด ${discountPercent}% -${discountBath}฿)`
              : '';

            detail = `ซื้อหลายเกม: ${head}${more}${suffix}`;
          }

          const createdAtDate =
            this.toDate(t?.createdAt) ??
            (typeof t?.createdAt === 'string' || typeof t?.createdAt === 'number'
              ? this.toDate(t.createdAt)
              : this.toDate(t?.createdAt?.toDate ? t.createdAt.toDate() : t?.createdAt));

          const tx: Tx = {
            id: String(t?.id ?? t?._id ?? Math.random().toString(36).slice(2)),
            userId: String(t?.userId ?? ''),
            type: t?.type,
            amount: amt,
            detail,
            createdAt: t?.createdAt,
            createdAtDate
          };

          (tx as any).__isPurchase = isPurchase;
          (tx as any).__usedCoupon = usedCoupon;
          return tx;
        });

        this.items = all
          .filter((t: any) => t.__isPurchase)
          .sort(
            (a: any, b: any) =>
              (b.createdAtDate?.getTime?.() ?? 0) - (a.createdAtDate?.getTime?.() ?? 0)
          );

        this.applyFilter();
      },
      error: (e) => {
        console.error(e);
        alert(e?.error?.message || 'โหลดประวัติการซื้อไม่สำเร็จ');
      },
      complete: () => (this.loading = false),
    });
  }

  setFilter(f: 'all' | 'month' | '3m') {
    if (this.filter === f) return;
    this.filter = f;
    this.applyFilter();
  }

  applyFilter() {
    const now = new Date();
    let v = [...this.items];

    if (this.filter === 'month') {
      const mAgo = new Date(now); mAgo.setMonth(now.getMonth() - 1);
      v = v.filter(x => (x.createdAtDate ?? new Date(0)) >= mAgo);
    } else if (this.filter === '3m') {
      const m3 = new Date(now); m3.setMonth(now.getMonth() - 3);
      v = v.filter(x => (x.createdAtDate ?? new Date(0)) >= m3);
    }

    this.view = v;
    this.totalSpent = v.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  }

  trackById = (_: number, t: Tx) => t.id;

  /** รองรับ Firestore Timestamp / string / Date */
  private toDate(v: any): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
}
