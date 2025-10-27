import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
  sold?: number;
};

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './game-detail.html',
  styleUrls: ['./game-detail.scss']
})
export class GameDetail implements OnInit {
  private baseUrl = 'http://localhost:3200'; // ← เปลี่ยนให้ตรงเซิร์ฟเวอร์คุณ

  loading = true;
  buying  = false;
  adding  = false;        // สถานะเพิ่มลงตะกร้า
  game: Game | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading = false; return; }

    this.http.get<any>(`${this.baseUrl}/admin_search/games/${id}`).subscribe({
      next: (res) => {
        const g = res?.game ?? {};
        this.game = {
          id: g.id,
          name: g.name,
          price: Number(g.price) || 0,
          category: g.category,
          description: g.description,
          imageUrl: g.imageUrl,
          createdAt: this.toDate(g.createdAt),
          releaseDate: this.toDate(g.releaseDate) ?? this.toDate(g.createdAt) ?? null,
          sold: Number(g.sold) || 0
        };
      },
      error: () => this.game = null,
      complete: () => this.loading = false
    });
  }

  back() { this.router.navigateByUrl('/allgame'); }

  /** ซื้อทันที (wallet_purchase) */
  async purchaseGame(game: Game) {
    if (!game) return;

    const userRaw = localStorage.getItem('user');
    if (!userRaw) { alert('กรุณาเข้าสู่ระบบ'); return; }

    const user = JSON.parse(userRaw);
    const userId = user.id ?? user._id;
    const amount = Number(game.price);

    if (!userId || !amount) { alert('ข้อมูลไม่ครบ'); return; }

    this.buying = true;
    try {
      const res: any = await this.http.post(`${this.baseUrl}/wallet_purchase`, {
        userId,
        gameName: game.name,
        amount
      }).toPromise();

      // อัปเดต balance ใน localStorage + broadcast event (ถ้ามี header ฟังอยู่)
      const newBal = Number(res?.balance ?? res?.balanceAfter ?? NaN);
      if (!isNaN(newBal)) {
        user.balance = newBal;
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('user-updated', { detail: user }));
      }

      alert(res?.message || 'ซื้อเกมสำเร็จ');
      this.router.navigate(['/profile']).catch(() => {});
    } catch (err: any) {
      console.error('purchase error', err);
      alert(err?.error?.message || 'ซื้อเกมไม่สำเร็จ');
    } finally {
      this.buying = false;
    }
  }

  /** เพิ่มลงตะกร้า (user_cart/add) */
  async addToCart(game: Game) {
    if (!game) return;

    const userRaw = localStorage.getItem('user');
    if (!userRaw) { alert('กรุณาเข้าสู่ระบบก่อนเพิ่มตะกร้า'); return; }

    const user = JSON.parse(userRaw);
    const userId = user.id ?? user._id;
    if (!userId) { alert('ไม่พบรหัสผู้ใช้'); return; }

    this.adding = true;
    try {
      await this.http.post(`${this.baseUrl}/user_cart/add`, {
        userId,
        gameId: game.id,             // ใช้ id เกม
        name: game.name,
        price: Number(game.price) || 0
      }).toPromise();

      alert('เพิ่มลงตะกร้าแล้ว ✅');

      // แจ้ง header ให้ปรับ badge ได้ ถ้ามีการฟังอีเวนต์นี้อยู่
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { delta: 1 }}));

      // ถ้าอยากพาไปหน้ารถเข็นทันทีให้เปิดบรรทัดนี้
      // this.router.navigate(['/cart']).catch(() => {});
    } catch (err: any) {
      console.error('addToCart error', err);
      alert(err?.error?.message || 'เพิ่มลงตะกร้าไม่สำเร็จ');
    } finally {
      this.adding = false;
    }
  }

  /** Helper แปลงเป็น Date|null */
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

  /** ใช้ใน template เพื่อให้ rd เป็น Date เสมอ */
  asDate(v: any): Date | null { return this.toDate(v); }
}
