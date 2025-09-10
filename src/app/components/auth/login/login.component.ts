import { Component, OnInit } from '@angular/core';
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
  selector: 'app-login',
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
    <div class="login-container">
      <h2>Login</h2>
      
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
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
            placeholder="Enter your password"
          >
          <div *ngIf="submitted && f['password'].errors" class="invalid-feedback">
            <div *ngIf="f['password'].errors?.['required']">Password is required</div>
          </div>
        </div>

        <div class="form-group form-check">
          <input 
            type="checkbox" 
            class="form-check-input" 
            id="rememberMe"
            formControlName="rememberMe"
          >
          <label class="form-check-label" for="rememberMe">Remember me</label>
        </div>

        <div *ngIf="error" class="alert alert-danger">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
          <span *ngIf="loading" class="spinner-border spinner-border-sm"></span>
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>

        <div class="social-login">
          <p class="divider">or continue with</p>
          <div class="social-buttons">
            <button type="button" class="btn btn-outline-primary" (click)="socialLogin('google')">
              <i class="fab fa-google"></i> Google
            </button>
            <button type="button" class="btn btn-outline-dark" (click)="socialLogin('github')">
              <i class="fab fa-github"></i> GitHub
            </button>
          </div>
        </div>

        <div class="forgot-password">
          <a routerLink="/forgot-password">Forgot password?</a>
        </div>

        <div class="register-link">
          Don't have an account? <a routerLink="/register">Register</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
    
    .login-form {
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
    
    .forgot-password {
      text-align: center;
      margin: 1rem 0;
    }
    
    .register-link {
      text-align: center;
      margin-top: 1.5rem;
    }
    
    .btn-block {
      width: 100%;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login({
      email: this.f['email'].value,
      password: this.f['password'].value
    }).subscribe({
      next: () => {
        // Handle successful login
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.error = error.error?.message || 'Login failed. Please check your credentials.';
        this.loading = false;
      }
    });
  }

  socialLogin(provider: 'google' | 'github'): void {
    this.authService.socialLogin(provider);
  }
}
