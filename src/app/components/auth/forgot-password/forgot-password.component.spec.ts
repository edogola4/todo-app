import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../services/auth.service';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['requestPasswordReset', 'isAuthenticated']);
    authServiceSpy.isAuthenticated.and.returnValue(false);
    
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, ForgotPasswordComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty email', () => {
    expect(component.forgotPasswordForm.get('email')?.value).toBe('');
  });

  it('should require email', () => {
    const emailControl = component.forgotPasswordForm.get('email');
    
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBeTruthy();
    
    emailControl?.setValue('test@example.com');
    expect(emailControl?.hasError('required')).toBeFalsy();
  });

  it('should validate email format', () => {
    const emailControl = component.forgotPasswordForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should call requestPasswordReset with email', () => {
    const testEmail = 'test@example.com';
    authService.requestPasswordReset.and.returnValue(of({ message: 'Reset email sent' }));
    
    component.forgotPasswordForm.setValue({ email: testEmail });
    component.onSubmit();
    
    expect(authService.requestPasswordReset).toHaveBeenCalledWith(testEmail);
  });

  it('should set success message on successful request', () => {
    authService.requestPasswordReset.and.returnValue(of({ message: 'Reset email sent' }));
    
    component.forgotPasswordForm.setValue({ email: 'test@example.com' });
    component.onSubmit();
    
    expect(component.successMessage).toBe('Password reset link has been sent to your email.');
    expect(component.error).toBe('');
  });

  it('should set error message on failure', () => {
    const error = { error: { message: 'User not found' } };
    authService.requestPasswordReset.and.returnValue(throwError(() => error));
    
    component.forgotPasswordForm.setValue({ email: 'nonexistent@example.com' });
    component.onSubmit();
    
    expect(component.error).toBe('User not found');
    expect(component.successMessage).toBe('');
  });
});
