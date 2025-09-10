import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  template: `
    <div class="reset-password-container">
      <h2>Reset Your Password</h2>
      
      <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="reset-form">
        <div class="form-group">
          <label for="password">New Password</label>
          <input 
            id="password" 
            type="password" 
            formControlName="password"
            class="form-control"
            [ngClass]="{ 'is-invalid': submitted && f['password'].errors }"
            placeholder="Enter your new password"
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
            [ngClass]="{ 'is-invalid': submitted && (f['confirmPassword'].errors || resetForm.hasError('mismatch')) }"
            placeholder="Confirm your new password"
          >
          <div *ngIf="submitted && (f['confirmPassword'].errors || resetForm.hasError('mismatch'))" class="invalid-feedback">
            <div *ngIf="f['confirmPassword'].errors?.['required']">Please confirm your password</div>
            <div *ngIf="resetForm.hasError('mismatch')">Passwords do not match</div>
          </div>
        </div>

        <div *ngIf="error" class="alert alert-danger">
          {{ error }}
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
          <span *ngIf="loading" class="spinner-border spinner-border-sm"></span>
          {{ loading ? 'Resetting Password...' : 'Reset Password' }}
        </button>

        <div class="back-to-login">
          <a routerLink="/login">Back to Login</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .reset-password-container {
      max-width: 500px;
      margin: 2rem auto;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
    
    .reset-form {
      margin-top: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .back-to-login {
      text-align: center;
      margin-top: 1.5rem;
    }
    
    .btn-block {
      width: 100%;
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  successMessage = '';
  private token: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.resetForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { 
      validator: this.mustMatch('password', 'confirmPassword')
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.error = 'Invalid or missing reset token';
    }
  }

  // Convenience getter for easy access to form fields
  get f() { return this.resetForm.controls; }

  // Custom validator for matching passwords
  mustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        return;
      }

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

    if (this.resetForm.invalid || !this.token) {
      return;
    }

    this.loading = true;
    
    this.authService.resetPassword(this.token, this.f['password'].value).subscribe({
      next: () => {
        this.successMessage = 'Your password has been reset successfully. Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to reset password. Please try again.';
        this.loading = false;
      }
    });
  }
}
