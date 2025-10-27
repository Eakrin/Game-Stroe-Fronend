import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type FsTs = { seconds: number; nanoseconds: number } | { toDate: () => Date };

type Game = {
  id?: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  createdAt?: Date | null;
  releaseDate?: Date | null; // <— หรี่ให้แคบลง
};



@Component({
  selector: 'app-allgame',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './allgame.html',
  styleUrls: ['./allgame.scss']
})
export class Allgame implements OnInit {
  private baseUrl = 'http://localhost:3200';

  loading = false;
  allGames: Game[] = [];
  keyword = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchGames();
  }

  fetchGames() {
    this.loading = true;
    this.http.get<any>(`${this.baseUrl}/admin_read/games`).subscribe({
      next: (res) => {
        const raw: Game[] = res?.games ?? [];
        this.allGames = raw.map((g) => {
          // แปลงทุก field ที่เกี่ยวกับเวลาให้เป็น Date
          const createdAt = this.toDate(g.createdAt);
          // ถ้าไม่มี releaseDate ให้ใช้ createdAt ถ้ายังไม่มีอีก ให้ new Date()
          const releaseDate = this.toDate(g.releaseDate) || createdAt || new Date();

          return {
            ...g,
            createdAt,
            releaseDate
          };
        });
      },
      error: (e) => {
        console.error('โหลดเกมล้มเหลว', e);
        this.allGames = [];
      },
      complete: () => (this.loading = false)
    });
  }

  /** รายการเกมหลังกรองด้วย keyword (ชื่อ/ประเภท) */
  get filteredGames(): Game[] {
    const k = this.keyword.trim().toLowerCase();
    if (!k) return this.allGames;
    return this.allGames.filter(
      (g) =>
        (g.name || '').toLowerCase().includes(k) ||
        (g.category || '').toLowerCase().includes(k)
    );
  }

  /** 5 อันดับแรกจากผลที่กรอง (เรียงตาม releaseDate > createdAt ใหม่สุดก่อน) */
  get filteredTop(): Game[] {
    return [...this.filteredGames]
      .sort((a, b) => {
        const da = (a.releaseDate as Date) || (a.createdAt as Date) || new Date(0);
        const db = (b.releaseDate as Date) || (b.createdAt as Date) || new Date(0);
        return db.getTime() - da.getTime();
      })
      .slice(0, 5);
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
