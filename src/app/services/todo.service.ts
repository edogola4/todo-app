import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Todo } from '../models/todo.model';

// Simple UUID function since we can't import uuid in standalone easily
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private readonly STORAGE_KEY = 'devexpress-todos';
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  public todos$ = this.todosSubject.asObservable();

  constructor() {
    this.loadTodos();
  }

  private loadTodos(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const todos = JSON.parse(stored).map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
          updatedAt: new Date(todo.updatedAt)
        }));
        this.todosSubject.next(todos);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  }

  private saveTodos(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.todosSubject.value));
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  }

  getTodos(): Observable<Todo[]> {
    return this.todos$;
  }

  addTodo(title: string, content: string, priority: 'low' | 'medium' | 'high' = 'medium', category: string = 'General'): void {
    const newTodo: Todo = {
      id: generateId(),
      title: title.trim(),
      content: content.trim(),
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      priority,
      category
    };

    const currentTodos = this.todosSubject.value;
    this.todosSubject.next([...currentTodos, newTodo]);
    this.saveTodos();
  }

  updateTodo(id: string, updates: Partial<Todo>): void {
    const currentTodos = this.todosSubject.value;
    const index = currentTodos.findIndex(todo => todo.id === id);
    
    if (index !== -1) {
      const updatedTodo = {
        ...currentTodos[index],
        ...updates,
        updatedAt: new Date()
      };
      
      currentTodos[index] = updatedTodo;
      this.todosSubject.next([...currentTodos]);
      this.saveTodos();
    }
  }

  deleteTodo(id: string): void {
    const currentTodos = this.todosSubject.value;
    const filteredTodos = currentTodos.filter(todo => todo.id !== id);
    this.todosSubject.next(filteredTodos);
    this.saveTodos();
  }

  toggleComplete(id: string): void {
    const currentTodos = this.todosSubject.value;
    const todo = currentTodos.find(t => t.id === id);
    if (todo) {
      this.updateTodo(id, { completed: !todo.completed });
    }
  }

  getStats(): Observable<{total: number, completed: number, active: number, byPriority: any}> {
    return new Observable(observer => {
      this.todos$.subscribe(todos => {
        const stats = {
          total: todos.length,
          completed: todos.filter(t => t.completed).length,
          active: todos.filter(t => !t.completed).length,
          byPriority: {
            high: todos.filter(t => t.priority === 'high').length,
            medium: todos.filter(t => t.priority === 'medium').length,
            low: todos.filter(t => t.priority === 'low').length
          }
        };
        observer.next(stats);
      });
    });
  }

  clearCompleted(): void {
    const currentTodos = this.todosSubject.value;
    const activeTodos = currentTodos.filter(todo => !todo.completed);
    this.todosSubject.next(activeTodos);
    this.saveTodos();
  }
}