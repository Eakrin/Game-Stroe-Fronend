import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Allgame } from './allgame';

describe('Allgame', () => {
  let component: Allgame;
  let fixture: ComponentFixture<Allgame>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Allgame]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Allgame);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
