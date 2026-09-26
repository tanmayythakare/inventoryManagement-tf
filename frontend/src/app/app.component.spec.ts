import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth.service';
import { ActivatedRoute } from '@angular/router';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getCurrentUser', 'logout']);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the root app component', () => {
    expect(component).toBeTruthy();
  });

  it('should reflect authentication state from AuthService', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    expect(component.isAuthenticated).toBeTrue();

    authServiceSpy.isAuthenticated.and.returnValue(false);
    expect(component.isAuthenticated).toBeFalse();
  });

  it('should return current username or fallback', () => {
    authServiceSpy.getCurrentUser.and.returnValue({
      id: 1,
      username: 'testadmin',
      fullName: 'Test Admin',
      role: 'ROLE_ADMIN'
    });
    expect(component.currentUser).toBe('testadmin');

    authServiceSpy.getCurrentUser.and.returnValue(null);
    expect(component.currentUser).toBe('User');
  });

  it('should trigger logout when logout called', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
