import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // Test cases will be added here
  describe('register', () => {
    const mockUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    it('should send a POST request to register endpoint', () => {
      const mockResponse = { id: '1', ...mockUser };
      
      service.register(mockUser).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockUser);
      req.flush(mockResponse);
    });
  });

  describe('login', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should send a POST request to login endpoint and store token', () => {
      const mockResponse = {
        token: 'jwt.token.here',
        user: { id: '1', email: 'test@example.com', name: 'Test User' }
      };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('token')).toBe(mockResponse.token);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });
  });

  describe('socialLogin', () => {
    it('should redirect to social login URL for Google', () => {
      spyOn(window, 'open');
      service.socialLogin('google');
      expect(window.open).toHaveBeenCalledWith(
        `${apiUrl}/auth/google`,
        '_self'
      );
    });

    it('should redirect to social login URL for GitHub', () => {
      spyOn(window, 'open');
      service.socialLogin('github');
      expect(window.open).toHaveBeenCalledWith(
        `${apiUrl}/auth/github`,
        '_self'
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should send a POST request to password reset endpoint', () => {
      const email = 'test@example.com';
      const mockResponse = { message: 'Password reset email sent' };

      service.requestPasswordReset(email).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });
      req.flush(mockResponse);
    });
  });

  describe('resetPassword', () => {
    it('should send a POST request to reset password endpoint', () => {
      const token = 'reset-token';
      const newPassword = 'newPassword123';
      const mockResponse = { message: 'Password reset successful' };

      service.resetPassword(token, newPassword).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token, newPassword });
      req.flush(mockResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user if token exists', () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      localStorage.setItem('token', 'jwt.token.here');
      
      service.getCurrentUser().subscribe(user => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should return null if no token exists', () => {
      service.getCurrentUser().subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if token exists and is not expired', () => {
      localStorage.setItem('token', 'jwt.token.here');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should return false if no token exists', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    afterEach(() => {
      // Clean up after each test
      localStorage.clear();
    });

    it('should remove token and set current user to null', () => {
      // Set test data in localStorage
      localStorage.setItem('token', 'jwt.token.here');
      
      // Set up a spy on the currentUserSubject
      const nextSpy = spyOn((service as any).currentUserSubject, 'next');
      
      // Call the method under test
      service.logout();
      
      // Verify the token was removed
      expect(localStorage.getItem('token')).toBeNull();
      
      // Verify currentUserSubject.next was called with null
      expect(nextSpy).toHaveBeenCalledWith(null);
    });
  });
});
