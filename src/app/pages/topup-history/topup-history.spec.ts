import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopupHistory } from './topup-history';

describe('TopupHistory', () => {
  let component: TopupHistory;
  let fixture: ComponentFixture<TopupHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopupHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopupHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
