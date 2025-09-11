import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['register', 'socialLogin', 'isAuthenticated']);
    authServiceSpy.isAuthenticated.and.returnValue(false);
    
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, RegisterComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize register form with empty values', () => {
    expect(component.registerForm.value).toEqual({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  });

  it('should validate required fields', () => {
    const nameControl = component.registerForm.get('name');
    const emailControl = component.registerForm.get('email');
    const passwordControl = component.registerForm.get('password');
    
    nameControl?.setValue('');
    emailControl?.setValue('');
    passwordControl?.setValue('');
    
    expect(nameControl?.hasError('required')).toBeTruthy();
    expect(emailControl?.hasError('required')).toBeTruthy();
    expect(passwordControl?.hasError('required')).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.registerForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should validate password match', () => {
    const password = 'password123';
    const confirmPassword = 'different';
    const confirmPasswordControl = component.registerForm.get('confirmPassword');
    
    // Set different passwords
    component.registerForm.patchValue({
      password: password,
      confirmPassword: confirmPassword
    });
    
    // Trigger validation
    component.registerForm.updateValueAndValidity();
    
    // Check for password mismatch error on the confirmPassword control
    expect(confirmPasswordControl?.hasError('mustMatch')).toBeTrue();
    
    // Set matching passwords
    component.registerForm.patchValue({
      password: password,
      confirmPassword: password
    });
    
    // Trigger validation again
    component.registerForm.updateValueAndValidity();
    
    // Check that the error is cleared when passwords match
    expect(confirmPasswordControl?.hasError('mustMatch')).toBeFalsy();
    expect(confirmPasswordControl?.valid).toBeTrue();
  });

  it('should call authService.register with form values', () => {
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };
    
    const mockResponse = { id: '1', email: 'test@example.com', name: 'Test User' };
    authService.register.and.returnValue(of(mockResponse));
    
    component.registerForm.setValue(testUser);
    component.onSubmit();
    
    // Should not send confirmPassword to the server
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...expectedData } = testUser;
    expect(authService.register).toHaveBeenCalledWith(expectedData);
  });

  it('should navigate to login page with query params on successful registration', () => {
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };
    
    const mockResponse = { id: '1', email: 'test@example.com', name: 'Test User' };
    authService.register.and.returnValue(of(mockResponse));
    
    component.registerForm.setValue(testUser);
    component.onSubmit();
    
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: 'true' } });
  });

  it('should set error message on registration failure', () => {
    const errorResponse = { error: { message: 'Registration failed' } } as unknown as Error;
    authService.register.and.returnValue(throwError(() => errorResponse));
    
    component.registerForm.setValue({
      name: 'Test User',
      email: 'existing@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    component.onSubmit();
    
    expect(component.error).toBe('Email already exists');
  });

  it('should call socialLogin with provider', () => {
    component.socialLogin('google');
    expect(authService.socialLogin).toHaveBeenCalledWith('google');
    
    component.socialLogin('github');
    expect(authService.socialLogin).toHaveBeenCalledWith('github');
  });
});
