import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type Game = {
  id?: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  createdAt?: Date | null;
  releaseDate?: Date | null;
};

type TopItem = {
  gameId: string;
  name: string;
  soldCount: number;
  totalRevenue: number;
};

@Component({
  selector: 'app-allgame',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './allgame.html',
  styleUrls: ['./allgame.scss']
})
export class Allgame implements OnInit {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  loading = false;
  allGames: Game[] = [];
  salesTop: TopItem[] = [];     // จาก /ranking/top-games
  keyword = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchAll();
  }

  async fetchAll() {
    this.loading = true;
    try {
      await Promise.all([this.fetchGames(), this.fetchRanking()]);
    } finally {
      this.loading = false;
    }
  }

  fetchGames(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<any>(`${this.baseUrl}/admin_read/games`).subscribe({
        next: (res) => {
          const raw: any[] = res?.games ?? [];
          this.allGames = raw.map((g) => {
            const createdAt = this.toDate(g.createdAt);
            const releaseDate = this.toDate(g.releaseDate) || createdAt || new Date();
            return { ...g, createdAt, releaseDate } as Game;
          });
        },
        error: (e) => {
          console.error('โหลดเกมล้มเหลว', e);
          this.allGames = [];
        },
        complete: () => resolve()
      });
    });
  }

  fetchRanking(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<any>(`${this.baseUrl}/ranking/top-games`).subscribe({
        next: (res) => {
          const r: any[] = res?.ranking ?? [];
          // คาดหวังรูปแบบ {gameId, name, soldCount, totalRevenue}
          this.salesTop = r.slice(0, 10); // กันเหนียว เผื่อ backend ส่งมาเกิน 5
        },
        error: (e) => {
          console.warn('โหลดอันดับขายดีไม่สำเร็จ ใช้ fallback ล่าสุด:', e);
          this.salesTop = [];
        },
        complete: () => resolve()
      });
    });
  }

  /** เกมทั้งหมดหลังกรองด้วย keyword (ชื่อ/ประเภท) */
  get filteredGames(): Game[] {
    const k = this.keyword.trim().toLowerCase();
    if (!k) return this.allGames;
    return this.allGames.filter(
      (g) =>
        (g.name || '').toLowerCase().includes(k) ||
        (g.category || '').toLowerCase().includes(k)
    );
  }

  /** อันดับขายดีที่พร้อมแสดง: แม็ปข้อมูล ranking กับ details ของเกม + กรองด้วย keyword */
  get displayedTop(): Game[] {
    // ถ้าไม่มี ranking จากยอดขาย ให้ fallback เป็น "ล่าสุดก่อน"
    if (!this.salesTop.length) {
      return [...this.filteredGames]
        .sort((a, b) => {
          const da = (a.releaseDate as Date) || (a.createdAt as Date) || new Date(0);
          const db = (b.releaseDate as Date) || (b.createdAt as Date) || new Date(0);
          return db.getTime() - da.getTime();
        })
        .slice(0, 5);
    }

    const k = this.keyword.trim().toLowerCase();

    // สร้าง map จาก id -> game
    const byId = new Map(this.allGames.map(g => [g.id, g] as const));

    // แม็ปยอดขาย -> รายละเอียดเกม
    const merged: Game[] = this.salesTop
      .map(rank => {
        const g = byId.get(rank.gameId);
        if (!g) {
          // เผื่อเกมถูกลบ แต่ยังมีทรานแซคชันเก่า
          return {
            id: rank.gameId,
            name: rank.name,
            price: 0,
            category: '',
            imageUrl: '',
            createdAt: null,
            releaseDate: null
          } as Game;
        }
        return g;
      })
      .filter(g => !!g);

    // กรองด้วย keyword ถ้ามี
    const filtered = !k
      ? merged
      : merged.filter(g =>
          (g.name || '').toLowerCase().includes(k) ||
          (g.category || '').toLowerCase().includes(k)
        );

    // จำกัดอย่างน้อย 5 อันดับ (ถ้ามี)
    return filtered.slice(0, 5);
  }

  /** รองรับ Firestore Timestamp / string → Date */
  private toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  trackById = (_: number, item: Game) => item.id ?? item.name;

  goDetail(g: any) {
    if (!g?.id) {
      console.warn('เกมไม่มี id ส่งมา:', g);
      return;
    }
    this.router.navigate(['/game', g.id]);
  }
}
