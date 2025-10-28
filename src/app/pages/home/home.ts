import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

type FirestoreTimestamp =
  | { seconds: number; nanoseconds: number }
  | { toDate: () => Date };

type Game = {
  id?: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  createdAt?: string | Date | FirestoreTimestamp | null;
  releaseDate?: string | Date | FirestoreTimestamp | null;
};

type TopItem = {
  gameId: string;
  name: string;
  soldCount: number;
  totalRevenue: number;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  loading = false;
  games: Game[] = [];
  top: Game[] = [];          // อันดับขายดี (แม็ปแล้ว พร้อมแสดง)

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchAll();
  }

  async fetchAll() {
    this.loading = true;
    try {
      // โหลดเกมทั้งหมด + อันดับขายดี พร้อมกัน
      const [gamesRes, rankRes] = await Promise.all([
        this.http.get<any>(`${this.baseUrl}/admin_read/games`).toPromise(),
        this.http.get<any>(`${this.baseUrl}/ranking/top-games`).toPromise()
      ]);

      // ---- เกมทั้งหมด
      const rawGames: any[] = gamesRes?.games ?? [];
      this.games = rawGames.map((g) => ({
        ...g,
        createdAt: this.toDate(g.createdAt),
        releaseDate: this.toDate(g.releaseDate) || this.toDate(g.createdAt) || new Date()
      }));

      // ---- อันดับขายดี (อย่างน้อย 5 อันดับ) → แม็ปเป็นข้อมูลเกมจริง
      const ranking: TopItem[] = (rankRes?.ranking ?? []).slice(0, 10);
      const byId = new Map(this.games.map(g => [g.id, g] as const));

      const merged = ranking
        .map((r) => byId.get(r.gameId) ?? ({
          id: r.gameId,
          name: r.name,
          price: 0,
          category: '',
          imageUrl: '',
          createdAt: null,
          releaseDate: null
        } as Game));

      this.top = merged.slice(0, 5);
    } catch (e) {
      console.error('โหลดข้อมูลหน้า Home ล้มเหลว', e);
      // fallback: ถ้าดึง ranking ไม่ได้ แสดง 5 เกมแรกแทน
      if (!this.games.length) {
        try {
          const res = await this.http.get<any>(`${this.baseUrl}/admin_read/games`).toPromise();
          const rawGames: any[] = res?.games ?? [];
          this.games = rawGames.map((g) => ({
            ...g,
            createdAt: this.toDate(g.createdAt),
            releaseDate: this.toDate(g.releaseDate) || this.toDate(g.createdAt) || new Date()
          }));
        } catch {}
      }
      this.top = this.games.slice(0, 5);
    } finally {
      this.loading = false;
    }
  }

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

  goAllGames() {
    this.router.navigateByUrl('/allgame');
  }

  goGameDetail(g: Game) {
    if (!g?.id) return;
    this.router.navigate(['/game', g.id]);
  }

  trackById = (_: number, item: Game) => item.id ?? item.name;
}
