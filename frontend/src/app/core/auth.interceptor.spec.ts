import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { of } from 'rxjs';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getAccessToken', 'refreshToken', 'logout']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should attach Bearer token to outgoing HTTP requests', () => {
    authServiceSpy.getAccessToken.and.returnValue('mock-access-token');

    httpClient.get('/api/v1/products').subscribe();

    const req = httpTestingController.expectOne('/api/v1/products');
    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-access-token');
    req.flush([]);
  });

  it('should not attach Bearer token to auth endpoints', () => {
    authServiceSpy.getAccessToken.and.returnValue('mock-access-token');

    httpClient.post('/api/v1/auth/login', {}).subscribe();

    const req = httpTestingController.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should catch 401 and replay request after token refresh', () => {
    authServiceSpy.getAccessToken.and.returnValue('expired-token');
    authServiceSpy.refreshToken.and.returnValue(of({
      accessToken: 'refreshed-token',
      refreshToken: 'new-refresh',
      tokenType: 'Bearer',
      expiresIn: 900
    }));

    httpClient.get('/api/v1/products').subscribe();

    // First request with expired token
    const firstReq = httpTestingController.expectOne('/api/v1/products');
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer expired-token');

    // Simulate 401 response
    firstReq.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    // Refresh token should be called
    expect(authServiceSpy.refreshToken).toHaveBeenCalled();

    // Retried request with new token
    const secondReq = httpTestingController.expectOne('/api/v1/products');
    expect(secondReq.request.headers.get('Authorization')).toBe('Bearer refreshed-token');
    secondReq.flush([{ id: 1, name: 'Product 1' }]);
  });
});
