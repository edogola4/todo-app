import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// CKEditor imports - using the working classic build
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
  // Use any type to bypass all TypeScript conflicts
  public Editor: any;
  public isLayoutReady = false;
  
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

  // Simple config using any type to avoid conflicts
  public editorConfig: any = {
    toolbar: [
      'heading', '|',
      'bold', 'italic', '|',
      'link', 'bulletedList', 'numberedList', '|',
      'blockQuote', 'insertTable', '|',
      'undo', 'redo'
    ],
    language: 'en',
    placeholder: 'Start typing... Select text to see formatting options!'
  };

  private destroy$ = new Subject<void>();
  private balloonToolbarElement: HTMLElement | null = null;
  private currentEditor: any = null; // Store the current editor instance

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
      // Use the classic build that works
      const ClassicEditor = await import('@ckeditor/ckeditor5-build-classic');
      this.Editor = (ClassicEditor as any).default;
      
      // Set layout ready after editor loads
      setTimeout(() => {
        this.isLayoutReady = true;
      }, 100);
      
      console.log('CKEditor loaded successfully!');
    } catch (error) {
      console.error('Error loading CKEditor:', error);
      // Set layout ready even if editor fails
      this.isLayoutReady = true;
    }
  }

  // Enhanced event handlers using any type
  public onEditorReady(editor: any): void {
    console.log('CKEditor is ready!');
    
    // Store the editor instance
    this.currentEditor = editor;
    
    // Check available commands
    console.log('Available commands:', Object.keys(editor.commands._commands || {}));
    
    // Custom balloon toolbar implementation
    this.setupCustomBalloonToolbar(editor);
    
    // Track text selection
    try {
      if (editor.model && editor.model.document && editor.model.document.selection) {
        editor.model.document.selection.on('change:range', () => {
          const selection = editor.model.document.selection;
          if (!selection.isCollapsed) {
            console.log('Text selected - showing custom balloon toolbar');
            this.showCustomBalloonToolbar(editor, selection);
          } else {
            this.hideCustomBalloonToolbar();
          }
        });
      }
    } catch (error) {
      console.log('Selection tracking setup failed, but that\'s okay');
    }

    // Listen for editor blur to hide balloon toolbar
    try {
      if (editor.editing && editor.editing.view && editor.editing.view.document) {
        editor.editing.view.document.on('blur', () => {
          setTimeout(() => this.hideCustomBalloonToolbar(), 200);
        });
      }
    } catch (error) {
      console.log('Blur listener setup failed, but that\'s okay');
    }
  }

  private setupCustomBalloonToolbar(editor: any): void {
    // Create custom balloon toolbar element
    if (!this.balloonToolbarElement) {
      this.balloonToolbarElement = document.createElement('div');
      this.balloonToolbarElement.className = 'custom-balloon-toolbar';
      this.balloonToolbarElement.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 8px 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        display: none;
        z-index: 9999;
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.95);
        user-select: none;
      `;

      // Add toolbar buttons with conditional underline
      this.balloonToolbarElement.innerHTML = `
        <button type="button" class="balloon-btn" data-command="bold" title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" class="balloon-btn" data-command="italic" title="Italic">
          <em>I</em>
        </button>
        <button type="button" class="balloon-btn" data-command="customUnderline" title="Underline">
          <u>U</u>
        </button>
        <span class="balloon-separator">|</span>
        <button type="button" class="balloon-btn" data-command="link" title="Add Link">
          🔗
        </button>
        <button type="button" class="balloon-btn" data-command="bulletedList" title="Bullet List">
          •
        </button>
        <button type="button" class="balloon-btn" data-command="numberedList" title="Numbered List">
          1.
        </button>
        <span class="balloon-separator">|</span>
        <button type="button" class="balloon-btn" data-command="blockQuote" title="Quote">
          "</button>
      `;

      // Add CSS for buttons
      const style = document.createElement('style');
      style.textContent = `
        .custom-balloon-toolbar {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .balloon-btn {
          background: none;
          border: 1px solid transparent;
          padding: 8px 10px;
          margin: 0 2px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          min-width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          user-select: none;
        }
        .balloon-btn:hover {
          background: #f0f8ff;
          border: 1px solid #007ACC;
          transform: translateY(-1px);
        }
        .balloon-btn:active {
          transform: translateY(0);
        }
        .balloon-btn.active {
          background: #007ACC;
          color: white;
          border: 1px solid #007ACC;
        }
        .balloon-separator {
          margin: 0 6px;
          color: #ddd;
          font-weight: bold;
        }
        .underlined-text {
          text-decoration: underline;
        }
      `;
      document.head.appendChild(style);

      // Add click handlers with proper command execution
      this.balloonToolbarElement.addEventListener('mousedown', (event) => {
        // Prevent editor from losing focus
        event.preventDefault();
      });

      this.balloonToolbarElement.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('.balloon-btn') as HTMLElement;
        if (button && button.dataset['command']) {
          event.preventDefault();
          event.stopPropagation();
          
          // Execute command with current editor
          this.executeCommand(this.currentEditor, button.dataset['command']);
          
          // Update toolbar states
          setTimeout(() => {
            this.updateBalloonToolbarStates(this.currentEditor);
          }, 50);
        }
      });

      document.body.appendChild(this.balloonToolbarElement);
    }
  }

  private showCustomBalloonToolbar(editor: any, selection: any): void {
    if (!this.balloonToolbarElement) return;

    // Get the selection rect from the browser selection
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        // Position the balloon toolbar above the selection
        this.balloonToolbarElement.style.display = 'block';
        
        // Calculate position
        const toolbarWidth = this.balloonToolbarElement.offsetWidth;
        const toolbarHeight = this.balloonToolbarElement.offsetHeight;
        
        let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
        let top = rect.top - toolbarHeight - 10;
        
        // Keep toolbar within viewport
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
          left = window.innerWidth - toolbarWidth - 10;
        }
        if (top < 10) {
          top = rect.bottom + 10; // Show below if no space above
        }
        
        this.balloonToolbarElement.style.left = `${left}px`;
        this.balloonToolbarElement.style.top = `${top}px`;

        // Update button states based on current formatting
        this.updateBalloonToolbarStates(editor);
      }
    }
  }

  private hideCustomBalloonToolbar(): void {
    if (this.balloonToolbarElement) {
      this.balloonToolbarElement.style.display = 'none';
    }
  }

  private updateBalloonToolbarStates(editor: any): void {
    if (!this.balloonToolbarElement || !editor) return;

    const buttons = this.balloonToolbarElement.querySelectorAll('.balloon-btn');
    buttons.forEach((button: Element) => {
      const htmlButton = button as HTMLElement;
      const command = htmlButton.dataset['command'];
      
      if (command === 'customUnderline') {
        // Check for underline attribute manually
        const hasUnderline = this.checkForUnderlineAttribute(editor);
        htmlButton.classList.toggle('active', hasUnderline);
      } else if (command && editor.commands && editor.commands.get) {
        try {
          const commandObj = editor.commands.get(command);
          if (commandObj) {
            htmlButton.classList.toggle('active', commandObj.value === true);
          }
        } catch (error) {
          // Ignore command errors
        }
      }
    });
  }

  private checkForUnderlineAttribute(editor: any): boolean {
    try {
      const selection = editor.model.document.selection;
      const firstPosition = selection.getFirstPosition();
      
      if (firstPosition) {
        const attributes = firstPosition.textNode?.getAttributes() || new Map();
        return attributes.has('underline') || this.hasUnderlineInSelection(editor);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private hasUnderlineInSelection(editor: any): boolean {
    try {
      // Check if any selected content has underline styling
      const viewSelection = editor.editing.view.document.selection;
      
      for (const range of viewSelection.getRanges()) {
        for (const item of range.getItems()) {
          if (item.is && item.is('element') && item.hasStyle && item.hasStyle('text-decoration')) {
            const textDecoration = item.getStyle('text-decoration');
            if (textDecoration && textDecoration.includes('underline')) {
              return true;
            }
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private executeCommand(editor: any, command: string): void {
    console.log(`Executing command: ${command}`);
    
    if (!editor || !editor.execute) {
      console.error('Editor not available for command execution');
      return;
    }

    try {
      // Focus the editor first to ensure proper command execution
      editor.editing.view.focus();
      
      if (command === 'customUnderline') {
        // Custom underline implementation
        this.executeCustomUnderline(editor);
      } else if (command === 'link') {
        // Handle link command specially
        const selection = editor.model.document.selection;
        const selectedText = this.getSelectedText(editor);
        
        if (selectedText) {
          const url = prompt('Enter URL:', 'https://');
          if (url && url.trim()) {
            editor.execute('link', url.trim());
            console.log('Link command executed successfully');
          }
        } else {
          alert('Please select text first to add a link');
        }
      } else {
        // Execute other commands
        editor.execute(command);
        console.log(`Command ${command} executed successfully`);
      }
      
      // Keep editor focused
      setTimeout(() => {
        editor.editing.view.focus();
      }, 10);
      
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
    }
  }

  private executeCustomUnderline(editor: any): void {
    try {
      // Try the standard underline command first
      if (editor.commands.get('underline')) {
        editor.execute('underline');
        return;
      }

      // Fallback: Use HTML support to add underline styling
      const selection = editor.model.document.selection;
      const ranges = Array.from(selection.getRanges());
      
      if (ranges.length === 0) return;

      editor.model.change((writer: any) => {
        for (const range of ranges) {
          // Cast range to any to avoid type issues
          const typedRange = range as any;
          
          // Check if text is already underlined
          const hasUnderline = this.checkForUnderlineAttribute(editor);
          
          if (hasUnderline) {
            // Remove underline
            writer.removeAttribute('underline', typedRange);
            // Also try to remove style attribute
            try {
              for (const item of typedRange.getItems()) {
                if (item.is && item.is('element')) {
                  writer.removeAttribute('style', item);
                }
              }
            } catch (e) {
              // Ignore if getItems doesn't work
            }
          } else {
            // Add underline
            writer.setAttribute('underline', true, typedRange);
            // Also add HTML style as fallback
            try {
              for (const item of typedRange.getItems()) {
                if (item.is && item.is('element')) {
                  writer.setAttribute('style', 'text-decoration: underline;', item);
                }
              }
            } catch (e) {
              // Ignore if getItems doesn't work
            }
          }
        }
      });

      console.log('Custom underline executed successfully');
    } catch (error) {
      console.error('Custom underline failed, trying alternative method:', error);
      this.executeUnderlineAlternative(editor);
    }
  }

  private executeUnderlineAlternative(editor: any): void {
    try {
      // Alternative: Insert HTML with underline
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
          // Check if already underlined
          const parentElement = range.commonAncestorContainer.parentElement;
          const isUnderlined = parentElement?.style.textDecoration?.includes('underline') ||
                              parentElement?.tagName === 'U';
          
          if (isUnderlined) {
            // Remove underline
            const textNode = document.createTextNode(selectedText);
            range.deleteContents();
            range.insertNode(textNode);
          } else {
            // Add underline
            const underlineElement = document.createElement('u');
            underlineElement.textContent = selectedText;
            range.deleteContents();
            range.insertNode(underlineElement);
          }
          
          // Clear selection
          selection.removeAllRanges();
          
          console.log('Alternative underline method executed');
        }
      }
    } catch (error) {
      console.error('Alternative underline method failed:', error);
    }
  }

  private getSelectedText(editor: any): string {
    try {
      const selection = editor.model.document.selection;
      const selectedElement = selection.getSelectedElement();
      
      if (selectedElement) {
        return selectedElement.data || '';
      }
      
      // Get text from range
      let text = '';
      for (const range of selection.getRanges()) {
        for (const item of (range as any).getItems()) {
          if (item.data) {
            text += item.data;
          }
        }
      }
      return text;
    } catch (error) {
      console.error('Error getting selected text:', error);
      return '';
    }
  }

  // Event handlers using any type to avoid TypeScript conflicts
  public onEditorFocus(event: any): void {
    console.log('Editor focused');
  }

  public onEditorBlur(event: any): void {
    console.log('Editor blurred');
    // Hide balloon toolbar when editor loses focus (with delay to allow clicking toolbar)
    setTimeout(() => {
      if (!this.balloonToolbarElement?.matches(':hover')) {
        this.hideCustomBalloonToolbar();
      }
    }, 150);
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
    
    // Clean up custom balloon toolbar
    if (this.balloonToolbarElement) {
      document.body.removeChild(this.balloonToolbarElement);
      this.balloonToolbarElement = null;
    }
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
    
    // Hide balloon toolbar when closing popup
    this.hideCustomBalloonToolbar();
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
    
    // Hide balloon toolbar when hiding form
    this.hideCustomBalloonToolbar();
  }
}