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
  createdAt?: string | Date | FirestoreTimestamp;
  releaseDate?: string | Date | FirestoreTimestamp;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']   // ⬅️ s
})
export class Home implements OnInit {
  private baseUrl = 'http://localhost:3200';

  loading = false;
  games: Game[] = [];
  top: Game[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchGames();
  }

  fetchGames() {
    this.loading = true;
    this.http.get<any>(`${this.baseUrl}/admin_read/games`).subscribe({
      next: (res) => {
        const raw: Game[] = res?.games ?? [];
        this.games = raw.map(g => ({
          ...g,
          createdAt: this.toDate(g.createdAt),
          releaseDate: this.toDate(g.releaseDate),
        }));
        // สุ่ม/เรียงได้ตามต้องการ ที่นี่เอา 5 แรกไปก่อน
        this.top = this.games.slice(0, 5);
      },
      error: (e) => console.error('Fetch games failed', e),
      complete: () => (this.loading = false),
    });
  }

  private toDate(v: any): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    return undefined;
  }

  goAllGames() {
    this.router.navigateByUrl('/allgame');
  }

  goGameDetail(g: Game) {
    if (!g?.id) {
      alert('เกมนี้ยังไม่มีรหัส (id) เลยพาไปหน้า detail ไม่ได้');
      return;
    }
    this.router.navigate(['/game', g.id]); // ⬅️ แบบนี้ถูกต้อง
  }

  trackById = (_: number, item: Game) => item.id ?? item.name;
}
