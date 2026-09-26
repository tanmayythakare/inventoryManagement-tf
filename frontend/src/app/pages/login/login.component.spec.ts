import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create login component', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required form fields', () => {
    component.loginForm.controls['username'].setValue('');
    component.loginForm.controls['password'].setValue('');
    expect(component.loginForm.valid).toBeFalse();

    component.loginForm.controls['username'].setValue('admin@example.com');
    component.loginForm.controls['password'].setValue('Secret123!');
    expect(component.loginForm.valid).toBeTrue();
  });

  it('should call authService.login and navigate on successful submission', () => {
    authServiceSpy.login.and.returnValue(of({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      tokenType: 'Bearer',
      expiresIn: 900
    }));

    component.loginForm.controls['username'].setValue('admin@example.com');
    component.loginForm.controls['password'].setValue('Secret123!');
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component.isLoading).toBeFalse();
  });

  it('should display error message on 401 Unauthorized', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 401 })));

    component.loginForm.controls['username'].setValue('admin@example.com');
    component.loginForm.controls['password'].setValue('WrongPass');
    component.onSubmit();

    expect(component.errorMessage).toBe('Invalid username or password');
    expect(component.isLoading).toBeFalse();
  });
});
