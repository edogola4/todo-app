import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// CKEditor - using proper import for Angular 17
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

// DevExpress imports
import { 
  DxButtonModule, 
  DxTextBoxModule, 
  DxCheckBoxModule, 
  DxPopupModule, 
  DxSelectBoxModule
} from 'devextreme-angular';

import { TodoService } from '../../services/todo.service';
import { Todo } from '../../models/todo.model';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DxButtonModule,
    DxTextBoxModule,
    DxCheckBoxModule,
    DxPopupModule,
    DxSelectBoxModule,
    CKEditorModule
  ],
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.css'],
  providers: [TodoService]
})
export class TodoComponent implements OnInit, OnDestroy {
  // Dynamic import for CKEditor to avoid type conflicts
  public Editor: any;
  todos: Todo[] = [];
  filteredTodos: Todo[] = [];
  currentFilter = 'all';
  searchText = '';
  showAddForm = false;
  editingTodo: Todo | null = null;
  showEditPopup = false;
  
  // Forms
  addForm: FormGroup;
  editForm: FormGroup;
  
  // Stats
  stats = {
    total: 0,
    completed: 0,
    active: 0,
    byPriority: { high: 0, medium: 0, low: 0 }
  };

  // Simplified CKEditor config to avoid type issues while keeping balloon toolbar
  editorConfig: any = {
    toolbar: {
      items: [
        'bold', 'italic', 'underline', '|',
        'bulletedList', 'numberedList', '|',
        'link', 'blockQuote', '|',
        'undo', 'redo'
      ]
    },
    // Balloon toolbar appears on text selection - this is the key feature!
    balloonToolbar: [
      'bold', 'italic', 'underline', '|',
      'link', 'bulletedList', 'numberedList'
    ],
    language: 'en',
    placeholder: 'Start typing your todo content...'
    // Removed problematic typing and removePlugins config
  };

  private destroy$ = new Subject<void>();

  constructor(
    private todoService: TodoService,
    private fb: FormBuilder
  ) {
    this.addForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      content: ['', [Validators.required, Validators.minLength(5)]],
      priority: ['medium'],
      category: ['General']
    });

    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      content: ['', [Validators.required, Validators.minLength(5)]],
      priority: ['medium'],
      category: ['General']
    });

    // Load CKEditor dynamically to avoid type conflicts
    this.loadCKEditor();
  }

  async loadCKEditor() {
    try {
      const ClassicEditor = await import('@ckeditor/ckeditor5-build-classic');
      this.Editor = ClassicEditor.default;
      
      console.log('CKEditor loaded successfully');
    } catch (error) {
      console.error('Error loading CKEditor:', error);
      // Fallback - you could set a flag here to show a textarea instead
    }
  }

  // Event handler for CKEditor ready event
  onEditorReady(editor: any) {
    console.log('CKEditor is ready!');
    
    // Add custom event listeners for enhanced UX
    editor.model.document.on('change:data', () => {
      // Handle data changes if needed
    });

    // Add selection change listener for custom context menu behavior
    editor.model.document.selection.on('change:range', () => {
      const selection = editor.model.document.selection;
      if (!selection.isCollapsed) {
        // Text is selected - balloon toolbar will automatically appear
        console.log('Text selected - balloon toolbar should appear');
        this.onTextSelected(editor, selection);
      }
    });

    // Ensure balloon toolbar is enabled
    const balloonToolbar = editor.plugins.get('BalloonToolbar');
    if (balloonToolbar) {
      console.log('Balloon toolbar is available');
    }
  }

  private onTextSelected(editor: any, selection: any) {
    // Custom logic when text is selected
    // This is where you can add additional suggestions or context-specific tools
    console.log('Text selection detected');
    
    // You could implement custom suggestions here
    // For example, showing smart suggestions based on selected text
  }

  // Event handler for CKEditor focus
  onEditorFocus(editor: any) {
    console.log('Editor focused');
  }

  // Event handler for CKEditor blur
  onEditorBlur(editor: any) {
    console.log('Editor blurred');
  }

  ngOnInit(): void {
    this.todoService.getTodos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(todos => {
        this.todos = todos;
        this.applyFilters();
      });

    this.todoService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.stats = stats;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper method to check form validity
  isFormControlValid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return control ? (control.valid || control.untouched) : true;
  }

  onAddTodo(): void {
    if (this.addForm.valid) {
      const formValue = this.addForm.value;
      this.todoService.addTodo(
        formValue.title,
        formValue.content,
        formValue.priority,
        formValue.category
      );
      this.addForm.reset({
        title: '',
        content: '',
        priority: 'medium',
        category: 'General'
      });
      this.showAddForm = false;
    }
  }

  onEditTodo(todo: Todo): void {
    this.editingTodo = todo;
    this.editForm.patchValue({
      title: todo.title,
      content: todo.content,
      priority: todo.priority,
      category: todo.category
    });
    this.showEditPopup = true;
  }

  onUpdateTodo(): void {
    if (this.editForm.valid && this.editingTodo) {
      const formValue = this.editForm.value;
      this.todoService.updateTodo(this.editingTodo.id, {
        title: formValue.title,
        content: formValue.content,
        priority: formValue.priority,
        category: formValue.category
      });
      this.closeEditPopup();
    }
  }

  onDeleteTodo(id: string): void {
    if (confirm('Are you sure you want to delete this todo?')) {
      this.todoService.deleteTodo(id);
    }
  }

  onToggleComplete(id: string): void {
    this.todoService.toggleComplete(id);
  }

  onFilterChange(filter: string): void {
    this.currentFilter = filter;
    this.applyFilters();
  }

  onSearchChange(event: any): void {
    this.searchText = event.target.value;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.todos];

    // Apply status filter
    switch (this.currentFilter) {
      case 'active':
        filtered = filtered.filter(todo => !todo.completed);
        break;
      case 'completed':
        filtered = filtered.filter(todo => todo.completed);
        break;
      default:
        // Show all todos
        break;
    }

    // Apply search filter
    if (this.searchText.trim()) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(searchLower) ||
        todo.content.toLowerCase().includes(searchLower) ||
        todo.category.toLowerCase().includes(searchLower)
      );
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    this.filteredTodos = filtered;
  }

  closeEditPopup(): void {
    this.showEditPopup = false;
    this.editingTodo = null;
    this.editForm.reset();
  }

  clearCompleted(): void {
    if (confirm('Are you sure you want to clear all completed todos?')) {
      this.todoService.clearCompleted();
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa726';
      case 'low': return '#66bb6a';
      default: return '#757575';
    }
  }

  showAddTodoForm(): void {
    this.showAddForm = true;
  }

  hideAddTodoForm(): void {
    this.showAddForm = false;
    this.addForm.reset({
      title: '',
      content: '',
      priority: 'medium',
      category: 'General'
    });
  }
}