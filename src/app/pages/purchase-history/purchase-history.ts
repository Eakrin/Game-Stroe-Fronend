import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type FsTs = { seconds: number; nanoseconds: number } | { toDate: () => Date };

type Tx = {
  id: string;
  userId: string;
  type?: 'topup' | 'purchase' | 'withdraw' | string;
  amount: number;
  detail?: string;
  createdAt?: string | Date | FsTs;
  createdAtDate?: Date;   // หลังแปลง
};

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './purchase-history.html',
  styleUrls: ['./purchase-history.scss']
})
export class PurchaseHistory implements OnInit {
  private baseUrl = 'http://localhost:3200';

  loading = true;
  items: Tx[] = [];     // ทั้งหมด (เฉพาะที่ถือว่าเป็น "ซื้อ")
  view: Tx[] = [];      // หลัง filter
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
          // ✅ ตรวจว่าเป็น “ซื้อจากรถเข็น” ไหม (ไม่มี type แต่มี items/totalPrice)
          const isCartCheckout = Array.isArray(t?.items) && t?.items.length > 0;
          const isPurchaseType = t?.type === 'purchase';
          const isPurchase = isPurchaseType || isCartCheckout;

          // amount: ถ้าเป็น purchase แบบเก่า ใช้ t.amount / ถ้าเป็น checkout ใช้ totalPrice
          const amt = isCartCheckout ? Number(t?.totalPrice) || 0 : (Number(t?.amount) || 0);

          // สร้าง detail สวย ๆ ถ้าเป็น checkout
          let detail: string | undefined = t?.detail;
          if (isCartCheckout) {
            const names: string[] = (t.items || []).map((i: any) => i?.name).filter(Boolean);
            const head = names.slice(0, 2).join(', ');
            const more = names.length > 2 ? ` +${names.length - 2} เกม` : '';
            detail = `ซื้อหลายเกม: ${head}${more}`;
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
            createdAtDate: createdAtDate,
          };

          // ถ้าไม่ใช่การซื้อ (topup/withdraw) ให้คืน object เดิมไว้ก่อน
          // เดี๋ยวไป filter ต่อข้างล่าง
          (tx as any).__isPurchase = isPurchase;
          return tx;
        });

        // ✅ เก็บเฉพาะที่ถือว่าเป็น "การซื้อ" (ทั้งแบบเดิมและ checkout)
        this.items = all
          .filter((t: any) => t.__isPurchase)
          .sort((a: { createdAtDate: { getTime: () => any; }; }, b: { createdAtDate: { getTime: () => any; }; }) => (b.createdAtDate?.getTime() ?? 0) - (a.createdAtDate?.getTime() ?? 0));

        this.applyFilter();
      },
      error: (e) => {
        console.error(e);
        alert(e?.error?.message || 'โหลดประวัติการซื้อไม่สำเร็จ');
      },
      complete: () => this.loading = false
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
    const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
  }
}
