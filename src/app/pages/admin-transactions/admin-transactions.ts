import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

type FsTs = { seconds: number; nanoseconds: number } | { toDate: () => Date };
type Tx = {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  type: 'topup' | 'purchase' | 'withdraw' | string;
  amount: number;
  detail?: string;
  createdAt?: string | Date | FsTs | null;
};

type UserItem = { id: string; name?: string; email?: string };

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './admin-transactions.html',
  styleUrls: ['./admin-transactions.scss'],
})
export class AdminTransactions implements OnInit {
  private baseUrl = 'http://localhost:3200';

  loading = true;
  all: Tx[] = [];
  filtered: Tx[] = [];

  users: UserItem[] = [];      // สำหรับดรอปดาวน์ผู้ใช้
  userFilter: string = 'all';  // 'all' หรือ userId
  typeFilter: 'all' | 'topup' | 'purchase' | 'withdraw' = 'all';
  keyword = '';

  sumByType = { topup: 0, purchase: 0, withdraw: 0 };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.http.get<any>(`${this.baseUrl}/admin/transactions`).subscribe({
      next: (res) => {
        const list: Tx[] = (res?.transactions ?? []).map((t: any) => ({
          ...t,
          createdAt: this.toDate(t?.createdAt) ?? undefined,
        }));
        // เรียงจากล่าสุดก่อน (ถ้าหลังบ้านยังไม่ได้เรียง)
        list.sort((a, b) => {
          const da = (a.createdAt as Date) || new Date(0);
          const db = (b.createdAt as Date) || new Date(0);
          return db.getTime() - da.getTime();
        });
        this.all = list;

        // รวบรวม user สำหรับฟิลเตอร์
        const map = new Map<string, UserItem>();
        list.forEach((t) => {
          if (!t.userId) return;
          if (!map.has(t.userId)) {
            map.set(t.userId, { id: t.userId, name: t.userName, email: t.userEmail });
          }
        });
        this.users = Array.from(map.values()).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );

        this.applyFilters();
      },
      error: (e) => {
        console.error(e);
        this.all = [];
        this.filtered = [];
      },
      complete: () => (this.loading = false),
    });
  }

  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();
    const list = this.all.filter((t) => {
      if (this.userFilter !== 'all' && t.userId !== this.userFilter) return false;
      if (this.typeFilter !== 'all' && t.type !== this.typeFilter) return false;

      if (kw) {
        const hay =
          `${t.userName || ''} ${t.userEmail || ''} ${t.detail || ''}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });

    this.filtered = list;
    this.recalcSummary();
  }

  recalcSummary() {
    const sums = { topup: 0, purchase: 0, withdraw: 0 };
    for (const t of this.filtered) {
      const amt = Number(t.amount || 0);
      if (t.type === 'topup') sums.topup += amt;
      else if (t.type === 'purchase') sums.purchase += amt;
      else if (t.type === 'withdraw') sums.withdraw += amt;
    }
    this.sumByType = sums;
  }

  typeLabel(t: string) {
    if (t === 'topup') return 'เติมเงิน';
    if (t === 'purchase') return 'ซื้อเกม';
    if (t === 'withdraw') return 'ถอนเงิน';
    return t;
  }

  toDate(v: any): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }

  trackById = (_: number, x: Tx) => x.id;
}
