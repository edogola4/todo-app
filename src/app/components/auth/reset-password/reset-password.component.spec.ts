import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  const testToken = 'test-reset-token';

  // Dummy component for router testing
  @Component({ template: '' })
  class DummyComponent {}

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);
    
    // Create a more complete router mock
    const routerSpy = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({} as any),
      serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue(''),
      events: of(null) // Add events observable
    };
    
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatCardModule,
        BrowserAnimationsModule,
        ResetPasswordComponent,
        RouterTestingModule.withRoutes([
          { path: 'login', component: DummyComponent }
        ])
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'token' ? testToken : null
              }
            }
          }
        },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .overrideComponent(ResetPasswordComponent, {
      add: { providers: [
        { provide: Router, useValue: routerSpy }
      ]}
    })
    .compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.resetForm.value).toEqual({
      password: '',
      confirmPassword: ''
    });
  });

  it('should require password', () => {
    const passwordControl = component.resetForm.get('password');
    
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBeTruthy();
    
    passwordControl?.setValue('newpassword123');
    expect(passwordControl?.hasError('required')).toBeFalsy();
  });

  it('should validate password length', () => {
    const passwordControl = component.resetForm.get('password');
    
    passwordControl?.setValue('short');
    expect(passwordControl?.hasError('minlength')).toBeTruthy();
    
    passwordControl?.setValue('validpassword');
    expect(passwordControl?.hasError('minlength')).toBeFalsy();
  });

  it('should validate password match', () => {
    const confirmPasswordControl = component.resetForm.get('confirmPassword');
    
    // Set different passwords
    component.resetForm.patchValue({
      password: 'newpassword123',
      confirmPassword: 'different'
    });
    
    // Trigger validation
    component.resetForm.updateValueAndValidity();
    
    // Check for password mismatch error on the confirmPassword control
    expect(confirmPasswordControl?.hasError('mustMatch')).toBeTrue();
    
    // Set matching passwords
    component.resetForm.patchValue({
      password: 'newpassword123',
      confirmPassword: 'newpassword123'
    });
    
    // Trigger validation again
    component.resetForm.updateValueAndValidity();
    
    // Check that the error is cleared when passwords match
    expect(confirmPasswordControl?.hasError('mustMatch')).toBeFalse();
  });

  it('should call resetPassword with token and new password', () => {
    const newPassword = 'newpassword123';
    authService.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));
    
    component.resetForm.setValue({
      password: newPassword,
      confirmPassword: newPassword
    });
    
    component.onSubmit();
    
    expect(authService.resetPassword).toHaveBeenCalledWith(testToken, newPassword);
  });

  it('should set success message on successful password reset', () => {
    authService.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));
    
    component.resetForm.setValue({
      password: 'newpassword123',
      confirmPassword: 'newpassword123'
    });
    
    component.onSubmit();
    
    expect(component.successMessage).toBe('Your password has been reset successfully. Redirecting to login...');
    expect(component.error).toBe('');
  });

  it('should set error message on password reset failure', () => {
    const error = { error: { message: 'Invalid or expired token' } };
    authService.resetPassword.and.returnValue(throwError(() => error));
    
    component.resetForm.setValue({
      password: 'newpassword123',
      confirmPassword: 'newpassword123'
    });
    
    component.onSubmit();
    
    expect(component.error).toBe('Invalid or expired token');
    expect(component.successMessage).toBe('');
  });

  it('should navigate to login after successful password reset', (done) => {
    authService.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));
    
    component.resetForm.setValue({
      password: 'newpassword123',
      confirmPassword: 'newpassword123'
    });
    
    component.onSubmit();
    
    // Wait for the timeout to complete
    setTimeout(() => {
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      done();
    }, 3000);
  });
});
