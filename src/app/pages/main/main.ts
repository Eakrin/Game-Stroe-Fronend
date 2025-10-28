import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

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
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './main.html',
  styleUrls: ['./main.scss']
})
export class Main implements OnInit {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  loading = false;
  allGames: Game[] = [];
  salesTop: TopItem[] = [];   // จาก /ranking/top-games

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
          this.salesTop = r.slice(0, 10); // รองรับส่งมาเกิน 5
        },
        error: (e) => {
          console.warn('โหลดอันดับขายดีไม่สำเร็จ ใช้ fallback ล่าสุด:', e);
          this.salesTop = [];
        },
        complete: () => resolve()
      });
    });
  }

  /** อันดับขายดีที่พร้อมแสดง (แม็ป ranking -> รายละเอียดเกม) จำกัด 5 รายการ */
  get displayedTop(): Game[] {
    if (!this.salesTop.length) return [];
    const byId = new Map(this.allGames.map(g => [g.id, g] as const));
    const merged: Game[] = this.salesTop
      .map(rank => byId.get(rank.gameId) ?? ({
        id: rank.gameId,
        name: rank.name,
        price: 0,
        category: '',
        imageUrl: '',
        createdAt: null,
        releaseDate: null
      } as Game));
    return merged.slice(0, 5);
  }

  goAllGames() {
    this.router.navigate(['/allgame']);
  }

  goDetail(g: Game) {
    if (!g?.id) return;
    this.router.navigate(['/game', g.id]);
  }

  trackById = (_: number, item: Game) => item.id ?? item.name;

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
}
