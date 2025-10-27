import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseHistory } from './purchase-history';

describe('PurchaseHistory', () => {
  let component: PurchaseHistory;
  let fixture: ComponentFixture<PurchaseHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
