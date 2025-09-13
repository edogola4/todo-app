import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('token');
        router.navigate(['/auth/login']);
        if (toastr && typeof toastr.error === 'function') {
          toastr.error('Your session has expired. Please log in again.');
        }
      } else if (toastr && typeof toastr.error === 'function') {
        if (error.status === 403) {
          // Forbidden
          toastr.error('You do not have permission to perform this action.');
        } else if (error.status >= 500) {
          // Server error
          toastr.error('A server error occurred. Please try again later.');
        } else if (error.error?.message) {
          // Custom error message from API
          toastr.error(error.error.message);
        } else {
          // Generic error
          toastr.error('An unexpected error occurred.');
        }
      }
      
      return throwError(() => error);
    })
  );
};
