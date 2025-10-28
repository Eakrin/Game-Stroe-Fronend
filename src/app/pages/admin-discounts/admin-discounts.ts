import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type DiscountDoc = {
  id: string;
  code: string;
  discountPercent: number;
  usageLimit?: number;
  usedCount?: number;
  active: boolean;
  expiredAt?: any;
  // backend ตอนนี้ยังไม่มี minSpend/perUserLimit/note
};

type DiscountVM = {
  id: string;
  code: string;
  type: 'percent' | 'amount';   // UI ใช้
  value: number;                // = discountPercent (หรือ amount ถ้ามีในอนาคต)
  minSpend?: number | null;     // UI-only (backend ยังไม่มี)
  maxUses?: number | null;      // = usageLimit
  perUserLimit?: number | null; // UI-only (backend ยังไม่มี)
  usedCount?: number | null;    // = usedCount
  active: boolean;
  note?: string | null;         // UI-only
};

@Component({
  selector: 'app-admin-discounts',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-discounts.html',
  styleUrls: ['./admin-discounts.scss']
})
export class AdminDiscounts implements OnInit {
  // ⚠ เปลี่ยนเป็นโดเมนของคุณตอน deploy
  private baseUrl = 'https://game-store-pfns.onrender.com';

  loading = false;
  items: DiscountVM[] = [];

  form: any | null = null;        // ใช้กับ Drawer
  editing: DiscountVM | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  async load() {
    this.loading = true;
    try {
      const res: any = await this.http.get(`${this.baseUrl}/admin/discount/list`).toPromise();
      const docs: DiscountDoc[] = Array.isArray(res?.items) ? res.items : [];
      this.items = docs.map(this.toVM);
    } catch (e) {
      console.error('load discounts error', e);
      this.items = [];
    } finally {
      this.loading = false;
    }
  }

  /** Map เอกสาร backend -> ViewModel ที่ HTML ใช้ */
  private toVM = (d: DiscountDoc): DiscountVM => ({
    id: d.id,
    code: d.code,
    type: 'percent',                // ตอนนี้ backend รองรับเปอร์เซ็นต์
    value: Number(d.discountPercent ?? 0),
    minSpend: null,                 // ยังไม่มีใน backend
    maxUses: d.usageLimit ?? null,
    perUserLimit: null,             // ยังไม่มีใน backend
    usedCount: d.usedCount ?? 0,
    active: !!d.active,
    note: null
  });

  trackById = (_: number, item: DiscountVM) => item.id ?? item.code;

  openCreate() {
    this.editing = null;
    this.form = {
      code: '',
      type: 'percent',
      value: 10,
      minSpend: null,
      maxUses: 1,
      perUserLimit: 1,
      active: true,
      note: ''
    };
  }

  openEdit(d: DiscountVM) {
    this.editing = d;
    this.form = { ...d };
  }

  close() {
    this.form = null;
    this.editing = null;
  }

  async save() {
    try {
      const f = this.form;
      if (!f?.code) { alert('กรอก Code'); return; }
      if (f.type !== 'percent') { alert('ตอนนี้รองรับเฉพาะ %'); return; }

      if (!this.editing) {
        // สร้างใหม่ -> ใช้ endpoint ที่คุณมี
        await this.http.post(`${this.baseUrl}/admin/discount/add`, {
          code: String(f.code).toUpperCase(),
          discountPercent: Number(f.value),
          usageLimit: f.maxUses ?? 1,
          expiredAt: null
        }).toPromise();
      } else {
        // แก้ไข -> PUT /admin/discount/:code
        await this.http.put(
          `${this.baseUrl}/admin/discount/${encodeURIComponent(this.editing.code)}`,
          {
            discountPercent: Number(f.value),
            usageLimit: f.maxUses ?? null,
            active: !!f.active
            // เพิ่มฟิลด์อื่น ๆ หาก backend รองรับในอนาคต
          }
        ).toPromise();
      }

      this.close();
      await this.load();
    } catch (err: any) {
      console.error('save error', err);
      alert(err?.error?.message || 'บันทึกไม่สำเร็จ');
    }
  }

  async remove(d: DiscountVM) {
    if (!confirm(`ลบโค้ด ${d.code}?`)) return;
    try {
      await this.http.delete(`${this.baseUrl}/admin/discount/${encodeURIComponent(d.code)}`).toPromise();
      this.items = this.items.filter(x => x.id !== d.id);
    } catch (err: any) {
      console.error('delete error', err);
      alert(err?.error?.message || 'ลบไม่สำเร็จ');
    }
  }
}
