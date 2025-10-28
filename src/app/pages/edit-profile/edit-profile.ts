import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.scss']
})
export class EditProfile implements OnInit {
  user: any = {
    id: '',
    name: '',
    email: '',
    profileImage: '',
    balance: 0
  };

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    // ✅ โหลดข้อมูลจาก localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      this.user.id = parsed.id;
      this.user.name = parsed.name;
      this.user.email = parsed.email;
      this.user.profileImage = parsed.profileImage || '';
      console.log('📦 โหลดข้อมูลผู้ใช้:', this.user);
    } else {
      alert('กรุณาเข้าสู่ระบบก่อน');
      this.router.navigate(['/login']);
    }
  }

  // ✅ ฟังก์ชันบันทึกข้อมูล
  saveProfile() {
    if (!this.user.name || !this.user.email) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    this.http.put(`https://game-store-pfns.onrender.com/profile/${this.user.id}`, {
      name: this.user.name,
      email: this.user.email,
      profileImage: this.user.profileImage
    }).subscribe({
      next: (res: any) => {
        console.log('✅ บันทึกข้อมูลสำเร็จ:', res);

        // อัปเดตข้อมูลใน localStorage
        localStorage.setItem('user', JSON.stringify({
          ...this.user,
          name: this.user.name,
          email: this.user.email,
          profileImage: this.user.profileImage
        }));

        alert('บันทึกข้อมูลเรียบร้อย ✅');
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error('❌ บันทึกข้อมูลไม่สำเร็จ:', err);
        alert(err.error?.message || 'อัปเดตข้อมูลไม่สำเร็จ ❌');
      }
    });
  }

  cancelEdit() {
    this.router.navigate(['/profile']);
  }
}
