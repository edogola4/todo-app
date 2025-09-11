import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'socialLogin', 'isAuthenticated']);
    authServiceSpy.isAuthenticated.and.returnValue(false);
    
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule, 
        RouterTestingModule,
        NoopAnimationsModule,
        HttpClientTestingModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatCardModule,
        LoginComponent // Import standalone component directly
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize login form with empty values', () => {
    expect(component.loginForm.value).toEqual({ 
      email: '', 
      password: '',
      rememberMe: false 
    });
  });

  it('should mark form as invalid when empty', () => {
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('should validate email field', () => {
    const email = component.loginForm.controls['email'];
    expect(email.valid).toBeFalsy();
    
    email.setValue('test');
    expect(email.valid).toBeFalsy();
    
    email.setValue('test@example.com');
    expect(email.valid).toBeTruthy();
  });

  it('should call authService.login with form values', () => {
    const testCredentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false
    };
    
    authService.login.and.returnValue(of({ token: 'test-token', user: { id: '1', email: 'test@example.com', name: 'Test User' } }));
    
    component.loginForm.setValue(testCredentials);
    component.onSubmit();
    
    // Expect the login service to be called with the form values
    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
      // Note: rememberMe is typically not sent to the server, only used client-side
    });
  });

  it('should navigate to home on successful login with rememberMe false', () => {
    authService.login.and.returnValue(of({ token: 'test-token', user: { id: '1', email: 'test@example.com', name: 'Test User' } }));
    
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false
    });
    
    component.onSubmit();
    
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to home on successful login with rememberMe true', () => {
    authService.login.and.returnValue(of({ token: 'test-token', user: { id: '1', email: 'test@example.com', name: 'Test User' } }));
    
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true
    });
    
    component.onSubmit();
    
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should set error message on login failure', () => {
    const error = { error: { message: 'Invalid credentials' } };
    authService.login.and.returnValue(throwError(() => error));
    
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'wrongpassword',
      rememberMe: false
    });
    
    component.onSubmit();
    
    expect(component.error).toBe('Invalid credentials');
  });

  it('should call socialLogin with provider', () => {
    component.socialLogin('google');
    expect(authService.socialLogin).toHaveBeenCalledWith('google');
    
    component.socialLogin('github');
    expect(authService.socialLogin).toHaveBeenCalledWith('github');
  });
});
