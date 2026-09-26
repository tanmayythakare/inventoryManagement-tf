import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { AuthResponse, User } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should perform login and save tokens and user into localStorage', () => {
    const mockUser: User = { id: 1, username: 'admin', fullName: 'Admin User', role: 'ROLE_ADMIN' };
    const mockResponse: AuthResponse = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: mockUser
    };

    service.login({ username: 'admin', password: 'password' }).subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(service.getAccessToken()).toBe('access-123');
      expect(service.getRefreshToken()).toBe('refresh-456');
      expect(service.getCurrentUser()).toEqual(mockUser);
      expect(service.isAuthenticated()).toBeTrue();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should handle login response with username and roles fallback', () => {
    const mockResponse: AuthResponse = {
      accessToken: 'token-xyz',
      refreshToken: 'ref-xyz',
      tokenType: 'Bearer',
      expiresIn: 900,
      username: 'manager',
      roles: ['ROLE_MANAGER']
    };

    service.login({ username: 'manager', password: 'pwd' }).subscribe(() => {
      const user = service.getCurrentUser();
      expect(user).toBeTruthy();
      expect(user?.username).toBe('manager');
      expect(user?.role).toBe('ROLE_MANAGER');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(mockResponse);
  });

  it('should refresh tokens when refreshToken exists in storage', () => {
    localStorage.setItem('auth_refresh_token', 'old-refresh');

    const mockResponse: AuthResponse = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      tokenType: 'Bearer',
      expiresIn: 900
    };

    service.refreshToken().subscribe((res) => {
      expect(res.accessToken).toBe('new-access');
      expect(service.getAccessToken()).toBe('new-access');
      expect(service.getRefreshToken()).toBe('new-refresh');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
    req.flush(mockResponse);
  });

  it('should logout and throw error when refreshToken is missing', () => {
    expect(() => service.refreshToken()).toThrowError('No refresh token available');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should logout, clear tokens, and navigate to /login', () => {
    localStorage.setItem('auth_access_token', 'token');
    localStorage.setItem('auth_refresh_token', 'refresh');
    localStorage.setItem('auth_user', JSON.stringify({ id: 1, username: 'test' }));

    service.logout();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should return null when user is not found or corrupted in localStorage', () => {
    expect(service.getCurrentUser()).toBeNull();

    localStorage.setItem('auth_user', 'invalid-json{{{');
    expect(service.getCurrentUser()).toBeNull();
  });
});
