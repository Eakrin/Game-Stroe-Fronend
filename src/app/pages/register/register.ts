import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, HttpClientModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  formData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileImage: ''
  };

  constructor(private router: Router, private http: HttpClient) {}

  onSubmit() {
    // ✅ ตรวจสอบความถูกต้องของข้อมูล
    if (!this.formData.name || !this.formData.email || !this.formData.password || !this.formData.confirmPassword) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    if (this.formData.password !== this.formData.confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }

    // ✅ ส่งข้อมูลไปที่ Node.js Backend
    this.http.post('http://localhost:3200/register', {
      name: this.formData.name,
      email: this.formData.email,
      password: this.formData.password,
      profileImage: this.formData.profileImage
    }).subscribe({
      next: (res: any) => {
        console.log('✅ สมัครสมาชิกสำเร็จ:', res);
        alert(res.message || 'สมัครสมาชิกสำเร็จ 🎉');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('❌ สมัครสมาชิกไม่สำเร็จ:', err);
        alert(err.error?.message || 'สมัครสมาชิกไม่สำเร็จ ❌');
      }
    });
  }

  goLogin(e: MouseEvent) {
    e.preventDefault();
    this.router.navigate(['/login']);
  }
}
