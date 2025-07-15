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

  // Enhanced config with more toolbar features
  public editorConfig: any = {
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'underline', '|',
      'link', 'bulletedList', 'numberedList', '|',
      'blockQuote', 'insertTable', '|',
      'undo', 'redo'
    ],
    language: 'en',
    placeholder: 'Start typing... Select text to see enhanced formatting options!'
  };

  private destroy$ = new Subject<void>();
  private balloonToolbarElement: HTMLElement | null = null;
  private currentEditor: any = null;

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

    this.loadCKEditor();
  }

  async loadCKEditor() {
    try {
      const ClassicEditor = await import('@ckeditor/ckeditor5-build-classic');
      this.Editor = (ClassicEditor as any).default;
      
      setTimeout(() => {
        this.isLayoutReady = true;
      }, 100);
      
      console.log('CKEditor loaded successfully!');
    } catch (error) {
      console.error('Error loading CKEditor:', error);
      this.isLayoutReady = true;
    }
  }

  public onEditorReady(editor: any): void {
    console.log('CKEditor is ready!');
    this.currentEditor = editor;
    
    // Log available commands for debugging
    console.log('Available commands:', Object.keys(editor.commands._commands || {}));
    
    this.setupEnhancedBalloonToolbar(editor);
    
    try {
      if (editor.model && editor.model.document && editor.model.document.selection) {
        editor.model.document.selection.on('change:range', () => {
          const selection = editor.model.document.selection;
          if (!selection.isCollapsed) {
            console.log('Text selected - showing enhanced balloon toolbar');
            this.showEnhancedBalloonToolbar(editor, selection);
          } else {
            this.hideEnhancedBalloonToolbar();
          }
        });
      }
    } catch (error) {
      console.log('Selection tracking setup failed, but that\'s okay');
    }

    try {
      if (editor.editing && editor.editing.view && editor.editing.view.document) {
        editor.editing.view.document.on('blur', () => {
          setTimeout(() => this.hideEnhancedBalloonToolbar(), 200);
        });
      }
    } catch (error) {
      console.log('Blur listener setup failed, but that\'s okay');
    }
  }

  private setupEnhancedBalloonToolbar(editor: any): void {
    if (!this.balloonToolbarElement) {
      this.balloonToolbarElement = document.createElement('div');
      this.balloonToolbarElement.className = 'enhanced-balloon-toolbar';
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
        background: rgba(255, 255, 255, 0.98);
        user-select: none;
        max-width: 600px;
        white-space: nowrap;
        overflow-x: auto;
      `;

      // Enhanced toolbar with working heading dropdown
      this.balloonToolbarElement.innerHTML = `
        <!-- Heading Dropdown -->
        <select class="balloon-select" id="heading-select" title="Change Heading">
          <option value="paragraph">Paragraph</option>
          <option value="heading1">Heading 1</option>
          <option value="heading2">Heading 2</option>
          <option value="heading3">Heading 3</option>
        </select>
        
        <span class="balloon-separator">|</span>
        
        <!-- Basic Formatting -->
        <button type="button" class="balloon-btn" data-command="bold" title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" class="balloon-btn" data-command="italic" title="Italic">
          <em>I</em>
        </button>
        <button type="button" class="balloon-btn" data-command="underline" title="Underline">
          <u>U</u>
        </button>
        
        <span class="balloon-separator">|</span>
        
        <!-- Link -->
        <button type="button" class="balloon-btn" data-command="link" title="Add Link">
          🔗
        </button>
        
        <span class="balloon-separator">|</span>
        
        <!-- Lists -->
        <button type="button" class="balloon-btn" data-command="bulletedList" title="Bullet List">
          •
        </button>
        <button type="button" class="balloon-btn" data-command="numberedList" title="Numbered List">
          1.
        </button>
        
        <span class="balloon-separator">|</span>
        
        <!-- Quote -->
        <button type="button" class="balloon-btn" data-command="blockQuote" title="Quote">
          "
        </button>
        
        <!-- Table -->
        <button type="button" class="balloon-btn" data-command="insertTable" title="Insert Table">
          ⊞
        </button>
        
        <span class="balloon-separator">|</span>
        
        <!-- Undo/Redo -->
        <button type="button" class="balloon-btn" data-command="undo" title="Undo">
          ↶
        </button>
        <button type="button" class="balloon-btn" data-command="redo" title="Redo">
          ↷
        </button>
      `;

      // Enhanced CSS for the toolbar
      const style = document.createElement('style');
      style.textContent = `
        .enhanced-balloon-toolbar {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        .balloon-btn {
          background: none;
          border: 1px solid transparent;
          padding: 6px 8px;
          margin: 0 1px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          min-width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          user-select: none;
          color: #333;
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
        
        .balloon-select {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 4px 8px;
          margin: 0 2px;
          font-size: 12px;
          cursor: pointer;
          min-width: 100px;
          height: 26px;
          transition: all 0.2s ease;
          color: #333;
        }
        
        .balloon-select:hover {
          border-color: #007ACC;
          background: #f0f8ff;
        }
        
        .balloon-select:focus {
          outline: none;
          border-color: #007ACC;
          box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
        }
        
        .balloon-separator {
          margin: 0 4px;
          color: #ddd;
          font-weight: bold;
          font-size: 14px;
        }
        
        /* Scrollbar for overflow */
        .enhanced-balloon-toolbar::-webkit-scrollbar {
          height: 4px;
        }
        
        .enhanced-balloon-toolbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        
        .enhanced-balloon-toolbar::-webkit-scrollbar-thumb {
          background: #007ACC;
          border-radius: 2px;
        }
        
        .enhanced-balloon-toolbar::-webkit-scrollbar-thumb:hover {
          background: #0056b3;
        }
      `;
      document.head.appendChild(style);

      // Enhanced event handlers
      this.balloonToolbarElement.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });

      this.balloonToolbarElement.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('.balloon-btn') as HTMLElement;
        
        if (button && button.dataset['command']) {
          event.preventDefault();
          event.stopPropagation();
          this.executeEnhancedCommand(this.currentEditor, button.dataset['command']);
          setTimeout(() => this.updateEnhancedBalloonStates(this.currentEditor), 50);
        }
      });

      // Fixed heading dropdown handler
      this.balloonToolbarElement.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        if (target.id === 'heading-select') {
          event.preventDefault();
          event.stopPropagation();
          
          const value = target.value;
          console.log('Heading dropdown changed to:', value);
          
          // Focus editor first
          this.currentEditor.editing.view.focus();
          
          // Execute the heading command properly
          this.executeHeadingCommand(this.currentEditor, value);
          
          setTimeout(() => {
            this.updateEnhancedBalloonStates(this.currentEditor);
          }, 100);
        }
      });

      document.body.appendChild(this.balloonToolbarElement);
    }
  }

  private executeHeadingCommand(editor: any, value: string): void {
    console.log('Executing heading command:', value);
    
    try {
      if (value === 'paragraph') {
        // Convert to paragraph - remove heading
        if (editor.commands.get('heading')) {
          editor.execute('heading', { value: false });
        }
      } else if (value === 'heading1' || value === 'heading2' || value === 'heading3') {
        // Apply heading
        if (editor.commands.get('heading')) {
          editor.execute('heading', { value: value });
        }
      }
      
      console.log('Heading command executed successfully');
    } catch (error) {
      console.error('Error executing heading command:', error);
      
      // Alternative method using format commands
      try {
        if (value === 'paragraph') {
          // Try to clear formatting
          editor.execute('paragraph');
        } else {
          // Try direct heading execution
          editor.execute(value);
        }
      } catch (alternativeError) {
        console.error('Alternative heading method also failed:', alternativeError);
      }
    }
  }

  private showEnhancedBalloonToolbar(editor: any, selection: any): void {
    if (!this.balloonToolbarElement) return;

    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        this.balloonToolbarElement.style.display = 'flex';
        
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
          top = rect.bottom + 10;
        }
        
        this.balloonToolbarElement.style.left = `${left}px`;
        this.balloonToolbarElement.style.top = `${top}px`;

        this.updateEnhancedBalloonStates(editor);
      }
    }
  }

  private hideEnhancedBalloonToolbar(): void {
    if (this.balloonToolbarElement) {
      this.balloonToolbarElement.style.display = 'none';
    }
  }

  private updateEnhancedBalloonStates(editor: any): void {
    if (!this.balloonToolbarElement || !editor) return;

    // Update button states
    const buttons = this.balloonToolbarElement.querySelectorAll('.balloon-btn');
    buttons.forEach((button: Element) => {
      const htmlButton = button as HTMLElement;
      const command = htmlButton.dataset['command'];
      
      if (command && editor.commands && editor.commands.get) {
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

    // Update heading dropdown state
    const headingSelect = this.balloonToolbarElement.querySelector('#heading-select') as HTMLSelectElement;
    if (headingSelect && editor.commands.get('heading')) {
      try {
        const headingCommand = editor.commands.get('heading');
        const currentHeading = headingCommand.value;
        
        console.log('Current heading value:', currentHeading);
        
        if (currentHeading === false || currentHeading === null || currentHeading === undefined) {
          headingSelect.value = 'paragraph';
        } else if (typeof currentHeading === 'string') {
          headingSelect.value = currentHeading;
        } else {
          headingSelect.value = 'paragraph';
        }
      } catch (error) {
        console.log('Could not update heading dropdown state:', error);
        headingSelect.value = 'paragraph';
      }
    }
  }

  private executeEnhancedCommand(editor: any, command: string): void {
    console.log(`Executing enhanced command: ${command}`);
    
    if (!editor || !editor.execute) {
      console.error('Editor not available for command execution');
      return;
    }

    try {
      editor.editing.view.focus();
      
      if (command === 'underline') {
        this.executeCustomUnderline(editor);
      } else if (command === 'link') {
        const selectedText = this.getSelectedText(editor);
        if (selectedText) {
          const url = prompt('Enter URL:', 'https://');
          if (url && url.trim()) {
            editor.execute('link', url.trim());
          }
        } else {
          alert('Please select text first to add a link');
        }
      } else if (command === 'insertTable') {
        editor.execute('insertTable', { rows: 2, columns: 2 });
      } else {
        editor.execute(command);
      }
      
      setTimeout(() => {
        editor.editing.view.focus();
      }, 10);
      
    } catch (error) {
      console.error(`Error executing enhanced command ${command}:`, error);
    }
  }

  private executeCustomUnderline(editor: any): void {
    try {
      if (editor.commands.get('underline')) {
        editor.execute('underline');
        return;
      }

      // Fallback method using direct DOM manipulation
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
          const parentElement = range.commonAncestorContainer.parentElement;
          const isUnderlined = parentElement?.style.textDecoration?.includes('underline') ||
                              parentElement?.tagName === 'U';
          
          if (isUnderlined) {
            const textNode = document.createTextNode(selectedText);
            range.deleteContents();
            range.insertNode(textNode);
          } else {
            const underlineElement = document.createElement('u');
            underlineElement.textContent = selectedText;
            range.deleteContents();
            range.insertNode(underlineElement);
          }
          
          selection.removeAllRanges();
        }
      }
    } catch (error) {
      console.error('Custom underline failed:', error);
    }
  }

  private getSelectedText(editor: any): string {
    try {
      const selection = editor.model.document.selection;
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
      return '';
    }
  }

  public onEditorFocus(event: any): void {
    console.log('Editor focused');
  }

  public onEditorBlur(event: any): void {
    console.log('Editor blurred');
    setTimeout(() => {
      if (!this.balloonToolbarElement?.matches(':hover')) {
        this.hideEnhancedBalloonToolbar();
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
    
    if (this.balloonToolbarElement) {
      document.body.removeChild(this.balloonToolbarElement);
      this.balloonToolbarElement = null;
    }
  }

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

    switch (this.currentFilter) {
      case 'active':
        filtered = filtered.filter(todo => !todo.completed);
        break;
      case 'completed':
        filtered = filtered.filter(todo => todo.completed);
        break;
      default:
        break;
    }

    if (this.searchText.trim()) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(searchLower) ||
        todo.content.toLowerCase().includes(searchLower) ||
        todo.category.toLowerCase().includes(searchLower)
      );
    }

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
    this.hideEnhancedBalloonToolbar();
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
    this.hideEnhancedBalloonToolbar();
  }
}