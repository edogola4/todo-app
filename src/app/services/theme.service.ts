import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements OnDestroy {
  private themeSubject = new BehaviorSubject<Theme>('light');
  private prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  private mediaQueryListener: () => void;

  theme$: Observable<Theme> = this.themeSubject.asObservable();
  themeChanged = new BehaviorSubject<boolean>(false);
  isDarkMode = false;

  constructor() {
    // Load saved theme from localStorage or default to system preference
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    this.setTheme(savedTheme);

    // Listen for system theme changes
    this.mediaQueryListener = () => {
      if (this.themeSubject.value === 'system') {
        this.updateThemeClass();
      }
    };
    this.prefersDark.addEventListener('change', this.mediaQueryListener);
  }

  setTheme(theme: Theme) {
    this.themeSubject.next(theme);
    localStorage.setItem('theme', theme);
    this.updateThemeClass();
  }

  private updateThemeClass() {
    const theme = this.themeSubject.value;
    const isDark = theme === 'dark' || (theme === 'system' && this.prefersDark.matches);
    
    this.isDarkMode = isDark;
    this.themeChanged.next(isDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  toggleTheme() {
    const newTheme = this.isDarkMode ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  ngOnDestroy() {
    this.prefersDark.removeEventListener('change', this.mediaQueryListener);
    this.themeChanged.complete();
  }
}
