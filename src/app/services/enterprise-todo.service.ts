import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { Todo, TodoFilterOptions, TodoStats, Priority } from '../models/todo.model';

// Simple UUID function
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

@Injectable({
  providedIn: 'root'
})
export class EnterpriseTodoService implements OnDestroy {
  private readonly STORAGE_KEY = 'enterprise-todos';
  private readonly TAGS_STORAGE_KEY = 'enterprise-tags';
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
  public filteredTodos$!: Observable<Todo[]>;
  public stats$!: Observable<TodoStats>;
  public availableTags$ = new BehaviorSubject<Set<string>>(new Set());
  public availableCategories$ = new BehaviorSubject<Set<string>>(new Set(['Work', 'Personal', 'Shopping', 'Health']));
  public loading$ = new BehaviorSubject<boolean>(false);
  public error$ = new Subject<string>();

  constructor() {
    // Initialize observables with default values
    this.filteredTodos$ = of([]);
    this.stats$ = of({
      total: 0,
      completed: 0,
      active: 0,
      byPriority: { low: 0, medium: 0, high: 0 },
      byCategory: {},
      byTag: {}
    });
    
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
        const todos = JSON.parse(stored).map((todo: Partial<Todo> & { createdAt: string; updatedAt: string; dueDate?: string }) => ({
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

  private saveTodos(): void {
    try {
      const todos = this.todosSubject.value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
      this.updateAvailableTags(todos);
      this.updateAvailableCategories(todos);
    } catch (error) {
      const errorMsg = 'Error saving todos';
      console.error(errorMsg, error);
      this.error$.next(errorMsg);
    }
  }

  private saveTags(): void {
    try {
      localStorage.setItem(this.TAGS_STORAGE_KEY, JSON.stringify([...this.availableTags$.value]));
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }

  private updateAvailableTags(todos: Todo[]): void {
    const tags = new Set<string>();
    todos.forEach(todo => {
      if (todo.tags?.length) {
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
      })
    );

    this.stats$ = this.todos$.pipe(
      map(todos => this.calculateStats(todos))
    );
  }

  private applyFilters(todos: Todo[], options: Partial<TodoFilterOptions>): Todo[] {
    return todos
      .filter(todo => {
        // Filter by status
        if (options.status === 'active' && todo.completed) return false;
        if (options.status === 'completed' && !todo.completed) return false;
        
        // Filter by priority
        if (options.priority && options.priority !== 'all' && todo.priority !== options.priority) {
          return false;
        }

        // Filter by category
        if (options.category && todo.category !== options.category) {
          return false;
        }

        // Filter by tags
        if (options.tags?.length) {
          const hasAllTags = options.tags.every(tag => todo.tags?.includes(tag));
          if (!hasAllTags) return false;
        }

        // Filter by search term
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
        
        // Handle priority sorting
        if (options.sortBy === 'priority') {
          const priorityOrder: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[a.priority] - priorityOrder[b.priority]) * order;
        }
        
        // Handle due date sorting
        if (options.sortBy === 'dueDate') {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return (dateA - dateB) * order;
        }
        
        // Handle updatedAt sorting
        if (options.sortBy === 'updatedAt') {
          return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * order;
        }
        
        // Default to createdAt sorting
        return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * order;
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
      // Count by priority
      stats.byPriority[todo.priority]++;

      // Count by category
      if (todo.category) {
        stats.byCategory[todo.category] = (stats.byCategory[todo.category] || 0) + 1;
      }

      // Count by tag
      if (todo.tags) {
        todo.tags.forEach(tag => {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
      }
    });

    return stats;
  }

  // Public API methods
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
    this.saveTodos();
    return newTodo;
  }

  updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>): Todo | null {
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
    this.saveTodos();
    
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
    this.saveTodos();
    return true;
  }

  toggleComplete(id: string): void {
    const todo = this.getTodoById(id);
    if (todo) {
      this.updateTodo(id, { 
        completed: !todo.completed,
        updatedAt: new Date()
      });
    }
  }

  togglePin(id: string): void {
    const todo = this.getTodoById(id);
    if (todo) {
      this.updateTodo(id, { 
        isPinned: !todo.isPinned,
        updatedAt: new Date()
      });
    }
  }

  // Tag management
  addTag(tagName: string): void {
    const trimmedTag = tagName.trim();
    if (!trimmedTag) return;

    const tags = this.availableTags$.value;
    if (!tags.has(trimmedTag)) {
      tags.add(trimmedTag);
      this.availableTags$.next(tags);
      this.saveTags();
    }
  }

  removeTag(tagName: string): void {
    const tags = this.availableTags$.value;
    if (tags.delete(tagName)) {
      this.availableTags$.next(tags);
      this.saveTags();
      
      // Remove tag from all todos
      const updatedTodos = this.todosSubject.value.map(todo => ({
        ...todo,
        tags: todo.tags?.filter(t => t !== tagName) || []
      }));
      
      this.todosSubject.next(updatedTodos);
      this.saveTodos();
    }
  }

  // Filtering and searching
  setFilter(filter: Partial<TodoFilterOptions>): void {
    this.filterSubject.next({
      ...this.filterSubject.value,
      ...filter
    });
  }

  setSearchTerm(term: string): void {
    this.searchSubject.next(term);
  }

  clearFilters(): void {
    this.filterSubject.next({
      status: 'all',
      priority: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    this.searchSubject.next('');
  }

  // Bulk operations
  deleteCompleted(): void {
    const updatedTodos = this.todosSubject.value.filter(todo => !todo.completed);
    this.todosSubject.next(updatedTodos);
    this.saveTodos();
  }

  toggleAll(completed: boolean): void {
    const updatedTodos = this.todosSubject.value.map(todo => ({
      ...todo,
      completed,
      updatedAt: new Date()
    }));
    this.todosSubject.next(updatedTodos);
    this.saveTodos();
  }

  // Cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.error$.complete();
  }
}
