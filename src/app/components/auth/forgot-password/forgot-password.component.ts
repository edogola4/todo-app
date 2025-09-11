import { Component, inject } from '@angular/core';
import { CommonModule, NgIf, NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    NgIf,
    NgClass
  ],
  template: `
    <div class="forgot-password-container">
      <h2>Reset Password</h2>
      
      <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="forgot-password-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            id="email" 
            type="email" 
            formControlName="email"
            class="form-control"
            [ngClass]="{ 'is-invalid': submitted && forgotPasswordForm.get('email')?.errors }"
            placeholder="Enter your email"
          >
          <div *ngIf="submitted && forgotPasswordForm.get('email')?.errors" class="invalid-feedback">
            <div *ngIf="forgotPasswordForm.get('email')?.errors?.['required']">Email is required</div>
            <div *ngIf="forgotPasswordForm.get('email')?.errors?.['email']">Please enter a valid email</div>
          </div>
        </div>

        <div *ngIf="error" class="alert alert-danger">
          {{ error }}
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <button type="submit" class="btn btn-primary" [disabled]="loading">
          <span *ngIf="loading" class="spinner-border spinner-border-sm"></span>
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>

        <div class="back-to-login">
          <a routerLink="/login">Back to Login</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .forgot-password-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
    
    .forgot-password-form {
      margin-top: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .back-to-login {
      margin-top: 1rem;
      text-align: center;
    }
  `]
})
export class ForgotPasswordComponent {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotPasswordForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  successMessage = '';

  constructor() {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.forgotPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.successMessage = '';

    // Stop here if form is invalid
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.requestPasswordReset(this.f['email'].value)
      .subscribe({
        next: () => {
          this.successMessage = 'Password reset link has been sent to your email.';
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'An error occurred. Please try again.';
          this.loading = false;
        }
      });
  }
}
