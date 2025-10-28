import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

type FsTs = { seconds: number; nanoseconds: number } | { toDate: () => Date };

type LibraryItem = {
  gameId: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  createdAt?: string | Date | FsTs; // วันที่ซื้อ (raw)
  purchasedAt?: Date;               // แปลงไว้ใช้ใน UI
};

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule],
  templateUrl: './library.html',
  styleUrls: ['./library.scss'],
})
export class Library implements OnInit {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  loading = true;
  items: LibraryItem[] = [];
  view: LibraryItem[] = [];

  // UI state
  q = '';
  cat = 'all';
  sort: 'recent' | 'price-asc' | 'price-desc' | 'name' = 'recent';
  categories: string[] = [];

  // ⬅ เพิ่มใหม่: สถานะ Modal “รายละเอียดเกม”
  detailOpen = false;
  detailLoading = false;
  detailError: string | null = null;
  detailData: any = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const raw = localStorage.getItem('user');
    if (!raw) { alert('กรุณาเข้าสู่ระบบ'); this.loading = false; return; }
    const u = JSON.parse(raw);
    const userId = u.id ?? u._id;
    if (!userId) { alert('ไม่พบรหัสผู้ใช้'); this.loading = false; return; }

    this.http.get<any>(`${this.baseUrl}/user_library/${userId}`).subscribe({
      next: (res) => {
        const list: LibraryItem[] =
          (res?.purchasedGames ?? []).map((g: any) => ({
            gameId: String(g.gameId ?? g.id ?? ''),
            name: g.name,
            price: Number(g.price) || 0,
            category: g.category || '',
            description: g.description || '',
            imageUrl: g.imageUrl || '',
            createdAt: g.createdAt,
            purchasedAt: this.toDate(g.createdAt) || new Date(0),
          }));

        const catSet = new Set(
          list.map(x => (x.category || '').trim()).filter(Boolean)
        );
        this.categories = ['all', ...Array.from(catSet)];

        this.items = list.sort(
          (a, b) => (b.purchasedAt!.getTime()) - (a.purchasedAt!.getTime())
        );
        this.apply();
      },
      error: (e) => {
        console.error(e);
        this.items = [];
        this.apply();
      },
      complete: () => (this.loading = false),
    });
  }

  apply() {
    const q = this.q.trim().toLowerCase();
    let v = this.items.filter(it => {
      const okQ =
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q);
      const okC = this.cat === 'all' || (it.category || '') === this.cat;
      return okQ && okC;
    });

    switch (this.sort) {
      case 'price-asc':  v = v.sort((a, b) => a.price - b.price); break;
      case 'price-desc': v = v.sort((a, b) => b.price - a.price); break;
      case 'name':       v = v.sort((a, b) => a.name.localeCompare(b.name)); break;
      default:           v = v.sort((a, b) => (b.purchasedAt!.getTime()) - (a.purchasedAt!.getTime()));
    }
    this.view = v;
  }

  clearSearch() { this.q = ''; this.apply(); }

  open(it: LibraryItem) {
    if (!it?.gameId) return;
    this.router.navigate(['/games', it.gameId]).catch(() => {});
  }

  // ⬅ เพิ่มใหม่: เปิด Modal + โหลดรายละเอียด
  openDetail(it: LibraryItem) {
    if (!it?.gameId) return;
    this.detailOpen = true;
    this.detailLoading = true;
    this.detailError = null;
    this.detailData = null;

    this.http.get<any>(`${this.baseUrl}/user_library/detail/${it.gameId}`).subscribe({
      next: (res) => {
        this.detailData = res?.game ?? null;
      },
      error: (e) => {
        console.error(e);
        this.detailError = e?.error?.message || 'โหลดรายละเอียดไม่สำเร็จ';
      },
      complete: () => (this.detailLoading = false),
    });
  }

  // ⬅ เพิ่มใหม่: ปิด Modal
  closeDetail() {
    this.detailOpen = false;
    this.detailLoading = false;
    this.detailError = null;
    this.detailData = null;
  }

  /** ใช้กับ *ngFor เพื่อ performance */
  trackById = (_: number, it: LibraryItem) => it.gameId;

  /** แปลง Firestore Timestamp/string เป็น Date */
  private toDate(v: any): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
}
