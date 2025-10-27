import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {

  // ✅ ตัวแปรเก็บข้อมูลจากฟอร์ม
  loginData = { email: '', password: '' };

  // ✅ เก็บข้อมูลผู้ใช้หลังเข้าสู่ระบบ
  loggedUser: any = null;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    // โหลดข้อมูลผู้ใช้จาก LocalStorage ถ้ามี
    const userData = localStorage.getItem('user');
    if (userData) {
      this.loggedUser = JSON.parse(userData);
      console.log('🔁 พบผู้ใช้ล็อกอินอยู่:', this.loggedUser);
    }
  }

onLogin() {
  console.log('📩 Email:', this.loginData.email);
  console.log('🔑 Password:', this.loginData.password);

  if (!this.loginData.email || !this.loginData.password) {
    alert('กรุณากรอกข้อมูลให้ครบ');
    return;
  }

  this.http.post('http://localhost:3200/login', this.loginData).subscribe({
    next: (res: any) => {
      console.log('✅ Response จากเซิร์ฟเวอร์:', res);

      alert(res.message || 'เข้าสู่ระบบสำเร็จ ✅');

      // ✅ เก็บ token + user
      if (res.token) localStorage.setItem('token', res.token);
      if (res.user) localStorage.setItem('user', JSON.stringify(res.user));

      this.loggedUser = res.user;

      // ✅ แยกหน้า redirect ตาม role
      if (res.user.role == 'admin') {
        console.log('🧩 Role: Admin → ไปหน้า /admin');
        this.router.navigate(['/admin']);
        // *****แก้ไขตรงนี้ให้เป็นของแอดมิน***
      } else {
        console.log('👤 Role: User → ไปหน้า /main');
        this.router.navigate(['/main']);
      }
    },
    error: (err) => {
      console.error('❌ Error จากเซิร์ฟเวอร์:', err);
      alert(err.error?.message || 'เข้าสู่ระบบไม่สำเร็จ ❌');
    }
  });
}

  logout() {
    // ✅ ล้าง session และเปลี่ยนหน้า
    localStorage.clear();
    this.loggedUser = null;
    console.log('🚪 ออกจากระบบเรียบร้อย');
    this.router.navigate(['/login']);
  }
}
