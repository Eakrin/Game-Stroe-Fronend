import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gameadmin } from './gameadmin';

describe('Gameadmin', () => {
  let component: Gameadmin;
  let fixture: ComponentFixture<Gameadmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gameadmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Gameadmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
