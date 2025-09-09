import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of, combineLatest, Subject } from 'rxjs';
import { map, takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { Todo, TodoFilterOptions, TodoStats, Priority } from '../models/todo.model';
import { environment } from '../../environments/environment';

// Simple UUID function
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

@Injectable({
  providedIn: 'root'
})
export class TodoService implements OnDestroy {
  private readonly STORAGE_KEY = `${environment.localStoragePrefix}todos`;
  private readonly TAGS_STORAGE_KEY = `${environment.localStoragePrefix}tags`;
  private isBrowser: boolean;
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  private filterSubject = new BehaviorSubject<Partial<TodoFilterOptions>>({ 
    status: 'all',
    priority: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  private searchSubject = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();

  // Public observables
  public todos$ = this.todosSubject.asObservable();
  public filteredTodos$: Observable<Todo[]> = of([]);
  public stats$: Observable<TodoStats> = of({
    total: 0,
    completed: 0,
    active: 0,
    byPriority: { low: 0, medium: 0, high: 0 },
    byCategory: {},
    byTag: {}
  });
  public availableTags$ = new BehaviorSubject<Set<string>>(new Set());
  public availableCategories$ = new BehaviorSubject<Set<string>>(new Set(['Work', 'Personal', 'Shopping', 'Health']));
  public loading$ = new BehaviorSubject<boolean>(false);
  public error$ = new Subject<string>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.initializeData();
    this.setupFiltering();
  }

  private initializeData(): void {
    this.loadTodos();
    this.loadTags();
  }

  private loadTodos(): void {
    this.loading$.next(true);
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const todos = JSON.parse(stored).map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
          updatedAt: new Date(todo.updatedAt || todo.createdAt),
          dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
          tags: todo.tags || [],
          isPinned: todo.isPinned || false
        }));
        this.todosSubject.next(todos);
        this.updateAvailableTags(todos);
        this.updateAvailableCategories(todos);
      }
    } catch (error) {
      const errorMsg = 'Error loading todos';
      console.error(errorMsg, error);
      this.error$.next(errorMsg);
    } finally {
      this.loading$.next(false);
    }
  }

  private loadTags(): void {
    try {
      const storedTags = localStorage.getItem(this.TAGS_STORAGE_KEY);
      if (storedTags) {
        this.availableTags$.next(new Set(JSON.parse(storedTags)));
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  private saveTodos(todos: Todo[]): void {
    if (!this.isBrowser) return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
      this.todosSubject.next(todos);
      
      if (environment.enableDebug) {
        console.debug('Todos saved:', { count: todos.length, storageKey: this.STORAGE_KEY });
      }
    } catch (error) {
      const errorMsg = 'Failed to save todos. Your changes may not be saved.';
      console.error('Error saving todos to localStorage', error);
      
      if (environment.enableDebug) {
        console.error('Debug info:', { error, todos, storageKey: this.STORAGE_KEY });
      }
      
      this.error$.next(errorMsg);
      
      // If storage is full, try to handle it gracefully
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleStorageFullError();
      }
    }
  }

  private updateAvailableTags(todos: Todo[]): void {
    const tags = new Set<string>();
    todos.forEach(todo => {
      if (todo.tags && todo.tags.length) {
        todo.tags.forEach(tag => tags.add(tag));
      }
    });
    this.availableTags$.next(tags);
  }

  private updateAvailableCategories(todos: Todo[]): void {
    const categories = new Set<string>(this.availableCategories$.value);
    todos.forEach(todo => {
      if (todo.category) {
        categories.add(todo.category);
      }
    });
    this.availableCategories$.next(categories);
  }

  // Setup filtering and searching
  private setupFiltering(): void {
    this.filteredTodos$ = combineLatest([
      this.todos$,
      this.filterSubject.pipe(debounceTime(300)),
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
    ]).pipe(
      map(([todos, filter, searchTerm]) => {
        return this.applyFilters(todos, { ...filter, searchTerm });
      }),
      takeUntil(this.destroy$)
    );

    this.stats$ = this.todos$.pipe(
      map(todos => this.calculateStats(todos)),
      takeUntil(this.destroy$)
    );
  }

  private applyFilters(todos: Todo[], options: Partial<TodoFilterOptions>): Todo[] {
    return todos
      .filter(todo => {
        if (options.status === 'active' && todo.completed) return false;
        if (options.status === 'completed' && !todo.completed) return false;
        
        if (options.priority && options.priority !== 'all' && todo.priority !== options.priority) {
          return false;
        }

        if (options.category && todo.category !== options.category) {
          return false;
        }

        if (options.tags && options.tags.length > 0) {
          const hasAllTags = options.tags.every(tag => todo.tags?.includes(tag));
          if (!hasAllTags) return false;
        }

        if (options.searchTerm) {
          const searchLower = options.searchTerm.toLowerCase();
          return (
            todo.title.toLowerCase().includes(searchLower) ||
            todo.content.toLowerCase().includes(searchLower) ||
            (todo.notes && todo.notes.toLowerCase().includes(searchLower)) ||
            (todo.tags && todo.tags.some(tag => tag.toLowerCase().includes(searchLower)))
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (!options.sortBy) return 0;
        
        const order = options.sortOrder === 'asc' ? 1 : -1;
        
        switch (options.sortBy) {
          case 'priority':
            const priorityOrder: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[a.priority] - priorityOrder[b.priority]) * order;
          case 'dueDate':
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            return (dateA - dateB) * order;
          case 'updatedAt':
            return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * order;
          case 'createdAt':
          default:
            return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * order;
        }
      });
  }

  private calculateStats(todos: Todo[]): TodoStats {
    const stats: TodoStats = {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      active: todos.filter(t => !t.completed).length,
      byPriority: { low: 0, medium: 0, high: 0 },
      byCategory: {},
      byTag: {}
    };

    todos.forEach(todo => {
      stats.byPriority[todo.priority]++;

      if (todo.category) {
        stats.byCategory[todo.category] = (stats.byCategory[todo.category] || 0) + 1;
      }

      if (todo.tags) {
        todo.tags.forEach(tag => {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
      }
    });

    return stats;
  }

  getFilteredTodos(): Observable<Todo[]> {
    return this.filteredTodos$;
  }

  getTodoById(id: string): Todo | undefined {
    return this.todosSubject.value.find(todo => todo.id === id);
  }

  addTodo(
    title: string, 
    content: string, 
    options: {
      priority?: Priority;
      category?: string;
      tags?: string[];
      dueDate?: Date;
      isPinned?: boolean;
      notes?: string;
    } = {}
  ): Todo {
    const now = new Date();
    const newTodo: Todo = {
      id: generateId(),
      title,
      content,
      completed: false,
      createdAt: now,
      updatedAt: now,
      priority: options.priority || 'medium',
      category: options.category || 'General',
      tags: options.tags || [],
      isPinned: options.isPinned || false,
      dueDate: options.dueDate,
      notes: options.notes
    };

    const updatedTodos = [...this.todosSubject.value, newTodo];
    this.todosSubject.next(updatedTodos);
    this.saveTodos(updatedTodos);
    return newTodo;
  }

  updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>>): Todo | null {
    const todoIndex = this.todosSubject.value.findIndex(t => t.id === id);
    if (todoIndex === -1) {
      this.error$.next('Todo not found');
      return null;
    }

    const updatedTodo = { 
      ...this.todosSubject.value[todoIndex], 
      ...updates, 
      updatedAt: new Date() 
    };

    const updatedTodos = [...this.todosSubject.value];
    updatedTodos[todoIndex] = updatedTodo;
    
    this.todosSubject.next(updatedTodos);
    this.saveTodos(updatedTodos);
    
    return updatedTodo;
  }

  deleteTodo(id: string): boolean {
    const initialLength = this.todosSubject.value.length;
    const updatedTodos = this.todosSubject.value.filter(todo => todo.id !== id);
    
    if (updatedTodos.length === initialLength) {
      this.error$.next('Todo not found');
      return false;
    }
    
    this.todosSubject.next(updatedTodos);
    this.saveTodos(updatedTodos);
    return true;
  }

  toggleComplete(id: string): void {
    const todo = this.getTodoById(id);
    if (todo) {
      this.updateTodo(id, { 
        completed: !todo.completed
      } as Partial<Todo>);
    }
  }

  togglePin(id: string): void {
    const todo = this.getTodoById(id);
    if (todo) {
      this.updateTodo(id, {
        isPinned: !todo.isPinned
      } as Partial<Todo>);
    }
  }

  clearCompleted(): void {
    const currentTodos = this.todosSubject.value;
    const activeTodos = currentTodos.filter(todo => !todo.completed);
    this.todosSubject.next(activeTodos);
    this.saveTodos(activeTodos);
  }

  // Update filter options
  updateFilter(options: Partial<TodoFilterOptions>): void {
    this.filterSubject.next({
      ...this.filterSubject.value,
      ...options
    });
  }

  // Update search term
  updateSearch(term: string): void {
    this.searchSubject.next(term);
  }

  // Cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.error$.complete();
  }

  private handleStorageFullError(): void {
    if (!this.isBrowser) return;
    
    // Try to free up some space by removing old todos
    try {
      const todos = this.todosSubject.value;
      if (todos.length > 50) {
        // Keep only the most recent 50 todos
        const recentTodos = [...todos]
          .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
          .slice(0, 50);
          
        this.saveTodos(recentTodos);
        this.error$.next('Storage was full. We\'ve cleared some space by removing older todos.');
      } else {
        this.error$.next('Storage is full. Please delete some todos to free up space.');
      }
    } catch (error) {
      console.error('Error handling storage full error', error);
      this.error$.next('Storage is full. Please delete some todos to free up space.');
    }
  }
}