import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type FirestoreTimestamp = { seconds: number; nanoseconds: number };

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
  selector: 'app-gameadmin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './gameadmin.html',
  styleUrls: ['./gameadmin.scss']
})
export class Gameadmin implements OnInit {
  private baseUrl = 'https://game-store-pfns.onrender.com';

  games: Game[] = [];
  loading = false;

  keyword = '';

  showModal = false;
  mode: 'create' | 'edit' = 'create';

  form: Game = { name: '', price: 0, category: '', description: '', imageUrl: '' };
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  saving = false;

  categories = ['Action', 'Adventure', 'Racing', 'Survival', 'Sports'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchGames();
  }

  // ---------- API ----------
  fetchGames() {
    this.loading = true;
    this.http.get<any>(`${this.baseUrl}/admin_read/games`).subscribe({
      next: (res) => {
        const list: Game[] = (res?.games ?? []).map((g: any) => ({
          ...g,
          createdAt: this.toDate(g?.createdAt),
          releaseDate: this.toDate(g?.releaseDate),
        }));
        this.games = list;
      },
      error: (e) => console.error('Fetch games failed', e),
      complete: () => (this.loading = false)
    });
  }

  /** CREATE: อัปโหลด + เพิ่มเกมในคำขอเดียว */
  addGameWithUpload(formValue: Game) {
    const fd = new FormData();
    fd.append('name', formValue.name);
    fd.append('price', String(formValue.price));
    fd.append('category', formValue.category);
    if (formValue.description) fd.append('description', formValue.description);
    if (this.selectedFile) fd.append('image', this.selectedFile); // field ต้องชื่อ image
    return this.http.post<any>(`${this.baseUrl}/admin_upload/game-image`, fd);
  }

  /** CREATE: แบบ JSON ใช้ imageUrl */
  addGameJson(formValue: Game) {
    return this.http.post<any>(`${this.baseUrl}/admin_add/games`, formValue);
  }

  /** EDIT: PUT ข้อมูลเกม */
  updateGame(id: string, body: Partial<Game>) {
    return this.http.put<any>(`${this.baseUrl}/admin_update/games/${id}`, body);
  }

  /** EDIT: อัปโหลดไฟล์ “อย่างเดียว” เพื่อเอา URL ใหม่จาก Cloudinary */
  uploadImageOnly(file: File) {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<any>(`${this.baseUrl}/admin_upload/image-only`, fd);
  }

  deleteGame(id: string) {
    return this.http.delete<any>(`${this.baseUrl}/admin_delete/games/${id}`);
  }

  // ---------- UI handlers ----------
  openCreate() {
    this.mode = 'create';
    this.resetForm();
    this.showModal = true;
  }

  openEdit(g: Game) {
    this.mode = 'edit';
    this.form = { ...g };
    this.selectedFile = null;
    this.previewUrl = g.imageUrl || null;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => (this.previewUrl = e.target.result);
    reader.readAsDataURL(file);
  }

  onSubmit(ngf: NgForm) {
    if (ngf.invalid || this.saving) return;
    this.saving = true;

    if (this.mode === 'create') {
      // ----- CREATE -----
      const req$ = this.selectedFile
        ? this.addGameWithUpload(this.form)   // มีไฟล์ → อัปโหลด + เพิ่มเกม
        : this.addGameJson(this.form);        // ไม่มีไฟล์ → ส่ง JSON
      req$.subscribe({
        next: () => this.afterSave(),
        error: (e) => this.handleError(e)
      });
      return;
    }

    // ----- EDIT -----
    if (!this.form.id) { this.saving = false; return; }

    const doUpdate = (imageUrl?: string) => {
      const payload: Partial<Game> = {
        name: this.form.name,
        price: this.form.price,
        category: this.form.category,
        description: this.form.description,
        imageUrl: imageUrl ?? (this.form.imageUrl || '')
      };
      this.updateGame(this.form.id!, payload).subscribe({
        next: () => this.afterSave(),
        error: (e) => this.handleError(e)
      });
    };

    if (this.selectedFile) {
      // มีไฟล์ใหม่ → อัปโหลดก่อนเอา URL → PUT อัปเดต
      this.uploadImageOnly(this.selectedFile).subscribe({
        next: (res: any) => {
          const url = res?.imageUrl as string | undefined;
          if (!url) {
            this.handleError({ message: 'ไม่พบ imageUrl จากการอัปโหลด' });
            return;
          }
          doUpdate(url);
        },
        error: (e) => this.handleError(e)
      });
    } else {
      // ไม่มีไฟล์ใหม่ → PUT ด้วย URL เดิม/ที่กรอกไว้
      doUpdate();
    }
  }

  onDelete(g: Game) {
    if (!g.id) return;
    if (!confirm(`ลบเกม "${g.name}" ?`)) return;
    this.deleteGame(g.id).subscribe({
      next: () => this.fetchGames(),
      error: (e) => alert(e?.error?.message || 'ลบเกมไม่สำเร็จ')
    });
  }

  get filtered(): Game[] {
    const k = this.keyword.trim().toLowerCase();
    if (!k) return this.games;
    return this.games.filter(
      g =>
        g.name.toLowerCase().includes(k) ||
        (g.category || '').toLowerCase().includes(k)
    );
  }

  trackById(_i: number, g: Game) {
    return g.id || g.name;
  }

  // ---------- Helpers ----------
  private resetForm() {
    this.form = {
      name: '',
      price: 0,
      category: this.categories[0],
      description: '',
      imageUrl: ''
    };
    this.selectedFile = null;
    this.previewUrl = null;
  }

  private afterSave() {
    alert('บันทึกสำเร็จ ✅');
    this.saving = false;
    this.closeModal();
    this.resetForm();
    this.fetchGames();
  }

  private handleError(e: any) {
    console.error(e);
    alert(e?.error?.message || e?.message || 'ดำเนินการไม่สำเร็จ ❌');
    this.saving = false;
  }

  /** แปลง Firestore Timestamp -> Date | undefined */
  private toDate(v: any): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v === 'string') return new Date(v);
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    return undefined;
  }
}
