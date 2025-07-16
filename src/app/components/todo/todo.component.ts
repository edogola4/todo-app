import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { 
  DxButtonModule, 
  DxTextBoxModule, 
  DxCheckBoxModule, 
  DxPopupModule, 
  DxSelectBoxModule
} from 'devextreme-angular';

import { TodoService } from '../../services/todo.service';
import { Todo } from '../../models/todo.model';

// Interfaces for better type safety
interface EditorCommand {
  name: string;
  icon: string;
  title: string;
  action: (editor: any) => void;
}

interface FormConfig {
  title: string;
  content: string;
  priority: string;
  category: string;
}

interface CommandGroups {
  basic: EditorCommand[];
  link: EditorCommand[];
  lists: EditorCommand[];
  formatting: EditorCommand[];
  premium: EditorCommand[];
  undoRedo: EditorCommand[];
}

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
  @ViewChild('editorWordCountElement') private editorWordCount!: ElementRef<HTMLDivElement>;

  // Editor properties
  public Editor: any;
  public isLayoutReady = false;
  public editorConfig: any = {
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'underline', '|',
      'link', 'bulletedList', 'numberedList', 'todoList', '|',
      'blockQuote', 'insertTable', '|',
      'emoji', 'sourceEditing', '|',
      'undo', 'redo'
    ],
    language: 'en',
    placeholder: 'Start typing... Select text to see enhanced formatting options!',
    removePlugins: [],
    extraPlugins: []
  };

  // Todo properties
  todos: Todo[] = [];
  filteredTodos: Todo[] = [];
  currentFilter = 'all';
  searchText = '';
  showAddForm = false;
  editingTodo: Todo | null = null;
  showEditPopup = false;

  // Forms
  addForm!: FormGroup;
  editForm!: FormGroup;

  // Stats
  stats = {
    total: 0,
    completed: 0,
    active: 0,
    byPriority: { high: 0, medium: 0, low: 0 }
  };

  // Private properties
  private destroy$ = new Subject<void>();
  private balloonToolbarElement: HTMLElement | null = null;
  private currentEditor: any = null;
  private wordCountDisplay: HTMLElement | null = null;

  // Constants
  private readonly PRIORITY_COLORS = {
    high: '#ff4757',
    medium: '#ffa726',
    low: '#66bb6a',
    default: '#757575'
  };

  private readonly PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

  private readonly DEFAULT_FORM_VALUES: FormConfig = {
    title: '',
    content: '',
    priority: 'medium',
    category: 'General'
  };

  private readonly FORM_VALIDATORS = {
    title: [Validators.required, Validators.minLength(3)],
    content: [Validators.required, Validators.minLength(5)]
  };

  constructor(
    private todoService: TodoService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
    this.loadCKEditor();
  }

  // Initialization methods
  private initializeForms(): void {
    const formConfig = {
      title: ['', this.FORM_VALIDATORS.title],
      content: ['', this.FORM_VALIDATORS.content],
      priority: [this.DEFAULT_FORM_VALUES.priority],
      category: [this.DEFAULT_FORM_VALUES.category]
    };

    this.addForm = this.fb.group(formConfig);
    this.editForm = this.fb.group(formConfig);
  }

  private async loadCKEditor(): Promise<void> {
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

  // Editor event handlers
  public onEditorReady(editor: any): void {
    console.log('CKEditor is ready!');
    this.currentEditor = editor;
    
    this.setupEditorFeatures(editor);
    this.setupEditorListeners(editor);
  }

  private setupEditorFeatures(editor: any): void {
    this.setupWordCount(editor);
    this.setupEnhancedBalloonToolbar(editor);
  }

  private setupEditorListeners(editor: any): void {
    // Selection change listener
    this.safeExecute(() => {
      editor.model.document.selection.on('change:range', () => {
        const selection = editor.model.document.selection;
        if (!selection.isCollapsed) {
          this.showEnhancedBalloonToolbar(editor, selection);
        } else {
          this.hideEnhancedBalloonToolbar();
        }
      });
    });

    // Blur listener
    this.safeExecute(() => {
      editor.editing.view.document.on('blur', () => {
        setTimeout(() => this.hideEnhancedBalloonToolbar(), 200);
      });
    });

    // Content change listener
    editor.model.document.on('change:data', () => {
      this.updateWordCount(editor);
    });
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

  // Word count functionality
  private setupWordCount(editor: any): void {
    // Try to use CKEditor's built-in word count plugin
    if (this.tryBuiltInWordCount(editor)) {
      return;
    }

    // Fallback to custom implementation
    this.createCustomWordCount();
    this.updateWordCount(editor);
  }

  private tryBuiltInWordCount(editor: any): boolean {
    try {
      const wordCountPlugin = editor.plugins.get('WordCount');
      if (wordCountPlugin && this.editorWordCount?.nativeElement) {
        this.clearElement(this.editorWordCount.nativeElement);
        this.editorWordCount.nativeElement.appendChild(wordCountPlugin.wordCountContainer);
        return true;
      }
    } catch (error) {
      console.log('WordCount plugin not available, using custom implementation');
    }
    return false;
  }

  private createCustomWordCount(): void {
    this.wordCountDisplay = document.createElement('div');
    this.wordCountDisplay.className = 'custom-word-count';
    this.wordCountDisplay.style.cssText = this.getWordCountStyles();
  }

  private getWordCountStyles(): string {
    return `
      position: absolute;
      bottom: -30px;
      right: 0;
      background: #f8f9fa;
      padding: 5px 10px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
      display: flex;
      gap: 15px;
      z-index: 1000;
    `;
  }

  private updateWordCount(editor: any): void {
    if (!this.wordCountDisplay) return;

    try {
      const content = editor.getData();
      const stats = this.calculateWordStats(content);
      
      this.wordCountDisplay.innerHTML = this.formatWordCountDisplay(stats);
      this.appendWordCountToEditor(editor);
    } catch (error) {
      console.error('Error updating word count:', error);
    }
  }

  private calculateWordStats(content: string): { words: number; characters: number; charactersWithSpaces: number } {
    const textContent = this.stripHtml(content);
    const words = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    const characters = textContent.length;
    const charactersWithSpaces = content.replace(/<[^>]*>/g, '').length;

    return { words, characters, charactersWithSpaces };
  }

  private formatWordCountDisplay(stats: { words: number; characters: number; charactersWithSpaces: number }): string {
    return `
      <span>Words: <strong>${stats.words}</strong></span>
      <span>Characters: <strong>${stats.characters}</strong></span>
      <span>With spaces: <strong>${stats.charactersWithSpaces}</strong></span>
    `;
  }

  private appendWordCountToEditor(editor: any): void {
    const editorElement = editor.ui.element;
    if (editorElement && !editorElement.querySelector('.custom-word-count')) {
      editorElement.style.position = 'relative';
      editorElement.appendChild(this.wordCountDisplay);
    }
  }

  // Balloon toolbar functionality
  private setupEnhancedBalloonToolbar(editor: any): void {
    if (!this.balloonToolbarElement) {
      this.createBalloonToolbar();
      this.addBalloonToolbarStyles();
      this.setupBalloonToolbarEvents();
    }
  }

  private createBalloonToolbar(): void {
    this.balloonToolbarElement = document.createElement('div');
    this.balloonToolbarElement.className = 'premium-balloon-toolbar';
    this.balloonToolbarElement.style.cssText = this.getBalloonToolbarStyles();
    this.balloonToolbarElement.innerHTML = this.getBalloonToolbarHTML();
    document.body.appendChild(this.balloonToolbarElement);
  }

  private getBalloonToolbarStyles(): string {
    return `
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
      max-width: 700px;
      white-space: nowrap;
      overflow-x: auto;
    `;
  }

  private getBalloonToolbarHTML(): string {
    const commands = this.getEditorCommands();
    const headingSelect = this.createHeadingSelect();
    const separator = '<span class="balloon-separator">|</span>';
    
    return [
      headingSelect,
      separator,
      ...this.createCommandButtons(commands['basic']),
      separator,
      ...this.createCommandButtons(commands['link']),
      separator,
      ...this.createCommandButtons(commands['lists']),
      separator,
      ...this.createCommandButtons(commands['formatting']),
      separator,
      ...this.createCommandButtons(commands['premium']),
      separator,
      ...this.createCommandButtons(commands['undoRedo'])
    ].join('');
  }

  private getEditorCommands(): CommandGroups {
    return {
      basic: [
        { name: 'bold', icon: '<strong>B</strong>', title: 'Bold', action: (editor) => editor.execute('bold') },
        { name: 'italic', icon: '<em>I</em>', title: 'Italic', action: (editor) => editor.execute('italic') },
        { name: 'underline', icon: '<u>U</u>', title: 'Underline', action: (editor) => this.executeCustomUnderline(editor) }
      ],
      link: [
        { name: 'link', icon: '🔗', title: 'Add Link', action: (editor) => this.handleLinkCommand(editor) }
      ],
      lists: [
        { name: 'bulletedList', icon: '•', title: 'Bullet List', action: (editor) => editor.execute('bulletedList') },
        { name: 'numberedList', icon: '1.', title: 'Numbered List', action: (editor) => editor.execute('numberedList') },
        { name: 'todoList', icon: '☑', title: 'Todo List', action: (editor) => this.createTodoList(editor) }
      ],
      formatting: [
        { name: 'blockQuote', icon: '"', title: 'Quote', action: (editor) => editor.execute('blockQuote') },
        { name: 'insertTable', icon: '⊞', title: 'Insert Table', action: (editor) => editor.execute('insertTable', { rows: 2, columns: 2 }) }
      ],
      premium: [
        { name: 'emoji', icon: '😀', title: 'Add Emoji', action: (editor) => this.insertEmoji(editor) },
        { name: 'sourceEditing', icon: '&lt;/&gt;', title: 'Source Code', action: (editor) => this.toggleSourceEditing(editor) }
      ],
      undoRedo: [
        { name: 'undo', icon: '↶', title: 'Undo', action: (editor) => editor.execute('undo') },
        { name: 'redo', icon: '↷', title: 'Redo', action: (editor) => editor.execute('redo') }
      ]
    };
  }

  private createHeadingSelect(): string {
    const options = [
      { value: 'paragraph', text: 'Paragraph' },
      { value: 'heading1', text: 'Heading 1' },
      { value: 'heading2', text: 'Heading 2' },
      { value: 'heading3', text: 'Heading 3' }
    ];

    return `
      <select class="balloon-select" id="heading-select" title="Change Heading">
        ${options.map(option => `<option value="${option.value}">${option.text}</option>`).join('')}
      </select>
    `;
  }

  private createCommandButtons(commands: EditorCommand[]): string[] {
    return commands.map(command => 
      `<button type="button" class="balloon-btn" data-command="${command.name}" title="${command.title}">
        ${command.icon}
      </button>`
    );
  }

  private setupBalloonToolbarEvents(): void {
    if (!this.balloonToolbarElement) return;

    this.balloonToolbarElement.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    this.balloonToolbarElement.addEventListener('click', (event) => {
      this.handleBalloonToolbarClick(event);
    });

    this.balloonToolbarElement.addEventListener('change', (event) => {
      this.handleBalloonToolbarChange(event);
    });
  }

  private handleBalloonToolbarClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const button = target.closest('.balloon-btn') as HTMLElement;
    
    if (button && button.dataset['command']) {
      event.preventDefault();
      event.stopPropagation();
      this.executeEnhancedCommand(this.currentEditor, button.dataset['command']);
      setTimeout(() => this.updateEnhancedBalloonStates(this.currentEditor), 50);
    }
  }

  private handleBalloonToolbarChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target.id === 'heading-select') {
      event.preventDefault();
      event.stopPropagation();
      
      this.currentEditor.editing.view.focus();
      this.executeHeadingCommand(this.currentEditor, target.value);
      
      setTimeout(() => {
        this.updateEnhancedBalloonStates(this.currentEditor);
      }, 100);
    }
  }

  // Enhanced command execution
  private executeEnhancedCommand(editor: any, command: string): void {
    if (!editor?.execute) return;

    const commands = this.getEditorCommands();
    const allCommands: EditorCommand[] = [
      ...commands['basic'],
      ...commands['link'],
      ...commands['lists'],
      ...commands['formatting'],
      ...commands['premium'],
      ...commands['undoRedo']
    ];
    const commandConfig = allCommands.find(cmd => cmd.name === command);

    if (commandConfig) {
      this.safeExecute(() => {
        editor.editing.view.focus();
        commandConfig.action(editor);
        setTimeout(() => {
          editor.editing.view.focus();
          this.updateWordCount(editor);
        }, 10);
      });
    }
  }

  private executeHeadingCommand(editor: any, value: string): void {
    this.safeExecute(() => {
      const headingCommand = editor.commands.get('heading');
      if (headingCommand) {
        const headingValue = value === 'paragraph' ? false : value;
        editor.execute('heading', { value: headingValue });
      }
    });
  }

  // Specific command handlers
  private handleLinkCommand(editor: any): void {
    const selectedText = this.getSelectedText(editor);
    if (selectedText) {
      const url = prompt('Enter URL:', 'https://');
      if (url?.trim()) {
        editor.execute('link', url.trim());
      }
    } else {
      alert('Please select text first to add a link');
    }
  }

  private createTodoList(editor: any): void {
    this.safeExecute(() => {
      // Try CKEditor's built-in todo list
      if (editor.commands.get('todoList')) {
        editor.execute('todoList');
        return;
      }

      // Fallback implementation
      const selectedText = this.getSelectedText(editor);
      const todoHtml = selectedText 
        ? `<ul><li><input type="checkbox"> ${selectedText}</li></ul>`
        : `<ul><li><input type="checkbox"> New todo item</li></ul>`;
      
      editor.execute('insertHtml', todoHtml);
    });
  }

  private insertEmoji(editor: any): void {
    const emojis = ['😀', '😊', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💡', '⭐', '✅', '❌', '📝', '💼'];
    const emoji = prompt(`Choose emoji (${emojis.join(' ')}):`);
    
    if (emoji && emojis.includes(emoji)) {
      this.safeExecute(() => {
        try {
          const viewFragment = editor.data.processor.toView(emoji);
          const modelFragment = editor.data.toModel(viewFragment);
          editor.model.insertContent(modelFragment);
        } catch (error) {
          editor.execute('insertText', { text: emoji });
        }
      });
    }
  }

  private toggleSourceEditing(editor: any): void {
    this.safeExecute(() => {
      if (editor.commands.get('sourceEditing')) {
        editor.execute('sourceEditing');
        return;
      }

      // Fallback implementation
      const currentData = editor.getData();
      const newData = prompt('Edit HTML source:', currentData);
      if (newData !== null && newData !== currentData) {
        editor.setData(newData);
      }
    });
  }

  private executeCustomUnderline(editor: any): void {
    this.safeExecute(() => {
      if (editor.commands.get('underline')) {
        editor.execute('underline');
        return;
      }

      // Fallback implementation
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
          this.toggleUnderlineForSelection(range, selectedText);
          selection.removeAllRanges();
        }
      }
    });
  }

  private toggleUnderlineForSelection(range: Range, selectedText: string): void {
    const parentElement = range.commonAncestorContainer.parentElement;
    const isUnderlined = parentElement?.style.textDecoration?.includes('underline') ||
                        parentElement?.tagName === 'U';
    
    const newElement = isUnderlined 
      ? document.createTextNode(selectedText)
      : (() => {
          const u = document.createElement('u');
          u.textContent = selectedText;
          return u;
        })();
    
    range.deleteContents();
    range.insertNode(newElement);
  }

  // Balloon toolbar display management
  private showEnhancedBalloonToolbar(editor: any, selection: any): void {
    if (!this.balloonToolbarElement) return;

    const domSelection = window.getSelection();
    if (domSelection?.rangeCount) {
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        this.positionBalloonToolbar(rect);
        this.updateEnhancedBalloonStates(editor);
      }
    }
  }

  private positionBalloonToolbar(rect: DOMRect): void {
    if (!this.balloonToolbarElement) return;

    this.balloonToolbarElement.style.display = 'flex';
    
    const toolbarRect = this.balloonToolbarElement.getBoundingClientRect();
    const position = this.calculateOptimalPosition(rect, toolbarRect);
    
    this.balloonToolbarElement.style.left = `${position.left}px`;
    this.balloonToolbarElement.style.top = `${position.top}px`;
  }

  private calculateOptimalPosition(selectionRect: DOMRect, toolbarRect: DOMRect): { left: number; top: number } {
    let left = selectionRect.left + (selectionRect.width / 2) - (toolbarRect.width / 2);
    let top = selectionRect.top - toolbarRect.height - 10;
    
    // Adjust for viewport boundaries
    left = Math.max(10, Math.min(left, window.innerWidth - toolbarRect.width - 10));
    
    if (top < 10) {
      top = selectionRect.bottom + 10;
    }
    
    return { left, top };
  }

  private hideEnhancedBalloonToolbar(): void {
    if (this.balloonToolbarElement) {
      this.balloonToolbarElement.style.display = 'none';
    }
  }

  private updateEnhancedBalloonStates(editor: any): void {
    if (!this.balloonToolbarElement || !editor) return;

    this.updateButtonStates(editor);
    this.updateHeadingSelect(editor);
  }

  private updateButtonStates(editor: any): void {
    const buttons = this.balloonToolbarElement!.querySelectorAll('.balloon-btn');
    buttons.forEach((button: Element) => {
      const htmlButton = button as HTMLElement;
      const command = htmlButton.dataset['command'];
      
      if (command && editor.commands?.get) {
        this.safeExecute(() => {
          const commandObj = editor.commands.get(command);
          if (commandObj) {
            htmlButton.classList.toggle('active', commandObj.value === true);
          }
        });
      }
    });
  }

  private updateHeadingSelect(editor: any): void {
    const headingSelect = this.balloonToolbarElement!.querySelector('#heading-select') as HTMLSelectElement;
    if (headingSelect && editor.commands.get('heading')) {
      this.safeExecute(() => {
        const headingCommand = editor.commands.get('heading');
        const currentHeading = headingCommand.value;
        
        headingSelect.value = (currentHeading === false || currentHeading === null || currentHeading === undefined) 
          ? 'paragraph' 
          : typeof currentHeading === 'string' ? currentHeading : 'paragraph';
      });
    }
  }

  // Todo management methods
  ngOnInit(): void {
    this.initializeTodoSubscriptions();
  }

  private initializeTodoSubscriptions(): void {
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

  // Form handling
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
      this.resetForm(this.addForm);
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

  // Filter and search methods
  onFilterChange(filter: string): void {
    this.currentFilter = filter;
    this.applyFilters();
  }

  onSearchChange(event: any): void {
    this.searchText = event.target.value;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = this.filterByStatus([...this.todos]);
    filtered = this.filterBySearch(filtered);
    filtered = this.sortTodos(filtered);
    this.filteredTodos = filtered;
  }

  private filterByStatus(todos: Todo[]): Todo[] {
    switch (this.currentFilter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }

  private filterBySearch(todos: Todo[]): Todo[] {
    if (!this.searchText.trim()) {
      return todos;
    }

    const searchLower = this.searchText.toLowerCase();
    return todos.filter(todo =>
      todo.title.toLowerCase().includes(searchLower) ||
      todo.content.toLowerCase().includes(searchLower) ||
      todo.category.toLowerCase().includes(searchLower)
    );
  }

  private sortTodos(todos: Todo[]): Todo[] {
    return todos.sort((a, b) => {
      const priorityDiff = this.PRIORITY_ORDER[b.priority] - this.PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  // UI helper methods
  closeEditPopup(): void {
    this.showEditPopup = false;
    this.editingTodo = null;
    this.resetForm(this.editForm);
    this.hideEnhancedBalloonToolbar();
  }

  clearCompleted(): void {
    if (confirm('Are you sure you want to clear all completed todos?')) {
      this.todoService.clearCompleted();
    }
  }

  getPriorityColor(priority: string): string {
    return this.PRIORITY_COLORS[priority as keyof typeof this.PRIORITY_COLORS] || this.PRIORITY_COLORS.default;
  }

  showAddTodoForm(): void {
    this.showAddForm = true;
  }

  hideAddTodoForm(): void {
    this.showAddForm = false;
    this.resetForm(this.addForm);
    this.hideEnhancedBalloonToolbar();
  }

  // Utility methods
  private resetForm(form: FormGroup): void {
    form.reset(this.DEFAULT_FORM_VALUES);
  }

  private safeExecute(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      console.error('Safe execution failed:', error);
    }
  }

  private clearElement(element: HTMLElement): void {
    Array.from(element.children).forEach(child => child.remove());
  }

  private stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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

  // CSS styles injection for balloon toolbar
  private addBalloonToolbarStyles(): void {
    if (document.querySelector('#balloon-toolbar-styles')) {
      return; // Styles already added
    }

    const style = document.createElement('style');
    style.id = 'balloon-toolbar-styles';
    style.textContent = `
      .premium-balloon-toolbar {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
        align-items: center;
        gap: 2px;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 1px solid #e0e7ff;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(99, 102, 241, 0.1);
      }
      
      .balloon-btn {
        background: none;
        border: 1px solid transparent;
        padding: 6px 8px;
        margin: 0 1px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        min-width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        user-select: none;
        color: #374151;
        position: relative;
      }
      
      .balloon-btn:hover {
        background: linear-gradient(135deg, #f0f8ff 0%, #e0f2fe 100%);
        border: 1px solid #3b82f6;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
      }
      
      .balloon-btn:active {
        transform: translateY(0);
      }
      
      .balloon-btn.active {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border: 1px solid #1d4ed8;
        box-shadow: 0 2px 8px rgba(29, 78, 216, 0.3);
      }
      
      .balloon-select {
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 4px 8px;
        margin: 0 2px;
        font-size: 12px;
        cursor: pointer;
        min-width: 100px;
        height: 28px;
        transition: all 0.2s ease;
        color: #374151;
      }
      
      .balloon-select:hover {
        border-color: #3b82f6;
        background: #f0f8ff;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
      
      .balloon-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .balloon-separator {
        margin: 0 6px;
        color: #d1d5db;
        font-weight: bold;
        font-size: 14px;
      }
      
      .custom-word-count {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border: 1px solid #cbd5e1;
      }
      
      .custom-word-count strong {
        color: #1e293b;
      }
      
      .premium-balloon-toolbar::-webkit-scrollbar {
        height: 4px;
      }
      
      .premium-balloon-toolbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 2px;
      }
      
      .premium-balloon-toolbar::-webkit-scrollbar-thumb {
        background: #3b82f6;
        border-radius: 2px;
      }
      
      .premium-balloon-toolbar::-webkit-scrollbar-thumb:hover {
        background: #1d4ed8;
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  private cleanup(): void {
    // Remove balloon toolbar
    if (this.balloonToolbarElement) {
      document.body.removeChild(this.balloonToolbarElement);
      this.balloonToolbarElement = null;
    }
    
    // Remove word count display
    if (this.wordCountDisplay?.parentNode) {
      this.wordCountDisplay.parentNode.removeChild(this.wordCountDisplay);
      this.wordCountDisplay = null;
    }

    // Remove styles if no other instances exist
    const balloonToolbars = document.querySelectorAll('.premium-balloon-toolbar');
    if (balloonToolbars.length === 0) {
      const styleElement = document.querySelector('#balloon-toolbar-styles');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    }
  }
}