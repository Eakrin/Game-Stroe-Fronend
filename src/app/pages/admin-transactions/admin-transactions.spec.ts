import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTransactions } from './admin-transactions';

describe('AdminTransactions', () => {
  let component: AdminTransactions;
  let fixture: ComponentFixture<AdminTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTransactions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminTransactions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
