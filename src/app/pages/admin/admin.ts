import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

export type AdminTile = {
  title: string;
  subtitle?: string;
  icon: string;         // path หรือ class ชื่อไอคอน
  route?: string;       // เส้นทางที่จะไป
  disabled?: boolean;   // ถ้ายังไม่ทำ route
};

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss']
})
export class Admin {
  // โปรไฟล์แอดมิน (จริง ๆ ดึงจาก login/session)
  admin = {
    name: 'Admin U',
    balance: 999999,
    avatarUrl: '' // ใส่ URL ถ้ามี
  };

tiles: AdminTile[] = [
  { title: 'จัดการเกม',       icon: '/images/Logo.png', route: 'admin/admingames' },
  { title: 'จัดอันดับ',        icon: '/images/true.png', disabled: true },
  { title: 'ธุรกรรมของผู้ใช้',  icon: '/images/Donors.jpg', route: '/admin/transactions' },
  { title: 'ส่วนลด',           icon: '/images/Avata.png', route: '/admin/discounts' }, // ✅
];


  constructor(private router: Router) {}

  go(tile: AdminTile) {
    if (tile.disabled) { return; }
    if (tile.route) { this.router.navigateByUrl(tile.route); }
  }
}
