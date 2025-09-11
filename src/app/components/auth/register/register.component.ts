import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  template: `
    <div class="register-container">
      <h2>Create an Account</h2>
      
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input 
            id="name" 
            type="text" 
            formControlName="name"
            class="form-control"
            [ngClass]="{ 'is-invalid': submitted && f['name'].errors }"
            placeholder="Enter your full name"
          >
          <div *ngIf="submitted && f['name'].errors" class="invalid-feedback">
            <div *ngIf="f['name'].errors?.['required']">Name is required</div>
          </div>
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input 
            id="email" 
            type="email" 
            formControlName="email"
            class="form-control"
            [ngClass]="{ 'is-invalid': submitted && f['email'].errors }"
            placeholder="Enter your email"
          >
          <div *ngIf="submitted && f['email'].errors" class="invalid-feedback">
            <div *ngIf="f['email'].errors?.['required']">Email is required</div>
            <div *ngIf="f['email'].errors?.['email']">Please enter a valid email</div>
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input 
            id="password" 
            type="password" 
            formControlName="password"
            class="form-control"
            [ngClass]="{ 'is-invalid': submitted && f['password'].errors }"
            placeholder="Create a password"
          >
          <div *ngIf="submitted && f['password'].errors" class="invalid-feedback">
            <div *ngIf="f['password'].errors?.['required']">Password is required</div>
            <div *ngIf="f['password'].errors?.['minlength']">Password must be at least 6 characters</div>
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            id="confirmPassword" 
            type="password" 
            formControlName="confirmPassword"
            class="form-control"
            [ngClass]="{ 'is-invalid': submitted && (f['confirmPassword'].errors || registerForm.hasError('mismatch')) }"
            placeholder="Confirm your password"
          >
          <div *ngIf="submitted && (f['confirmPassword'].errors || registerForm.hasError('mismatch'))" class="invalid-feedback">
            <div *ngIf="f['confirmPassword'].errors?.['required']">Please confirm your password</div>
            <div *ngIf="registerForm.hasError('mismatch')">Passwords do not match</div>
          </div>
        </div>

        <div *ngIf="error" class="alert alert-danger">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
          <span *ngIf="loading" class="spinner-border spinner-border-sm"></span>
          {{ loading ? 'Creating Account...' : 'Create Account' }}
        </button>

        <div class="social-login">
          <p class="divider">or sign up with</p>
          <div class="social-buttons">
            <button type="button" class="btn btn-outline-primary" (click)="socialLogin('google')">
              <i class="fab fa-google"></i> Google
            </button>
            <button type="button" class="btn btn-outline-dark" (click)="socialLogin('github')">
              <i class="fab fa-github"></i> GitHub
            </button>
          </div>
        </div>

        <div class="login-link">
          Already have an account? <a routerLink="/login">Login</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .register-container {
      max-width: 500px;
      margin: 2rem auto;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
    
    .register-form {
      margin-top: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .social-login {
      margin: 1.5rem 0;
      text-align: center;
    }
    
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      color: #6c757d;
      margin: 1rem 0;
    }
    
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #dee2e6;
    }
    
    .divider::before {
      margin-right: 0.5em;
    }
    
    .divider::after {
      margin-left: 0.5em;
    }
    
    .social-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }
    
    .login-link {
      text-align: center;
      margin-top: 1.5rem;
    }
    
    .btn-block {
      width: 100%;
    }
  `]
})
export class RegisterComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor() {
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { 
      validator: this.mustMatch('password', 'confirmPassword')
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  // Convenience getter for easy access to form fields
  get f() { return this.registerForm.controls; }

  // Custom validator for matching passwords
  mustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        // return if another validator has already found an error
        return;
      }

      // set error on matchingControl if validation fails
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
      } else {
        matchingControl.setErrors(null);
      }
    };
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // Stop here if form is invalid
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    
    // Remove confirmPassword from the data we send to the server
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...userData } = this.registerForm.value;
    
    this.authService.register(userData).subscribe({
      next: () => {
        // Redirect to login page after successful registration
        this.router.navigate(['/login'], { 
          queryParams: { registered: 'true' } 
        });
      },
      error: (error) => {
        this.error = error.error?.message || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }

  socialLogin(provider: 'google' | 'github'): void {
    this.authService.socialLogin(provider);
  }
}
