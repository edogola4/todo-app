import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import type { Editor, EditorConfig } from '@ckeditor/ckeditor5-core';
import { 
  DxButtonModule, 
  DxTextBoxModule, 
  DxCheckBoxModule, 
  DxPopupModule, 
  DxSelectBoxModule,
  DxTextAreaModule,
  DxToolbarModule,
  DxToastModule
} from 'devextreme-angular';
import { TodoService } from '../../services/todo.service';
import { Todo } from '../../models/todo.model';

// Extended Editor type to include additional properties and methods
type ExtendedEditor = Editor & {
  // Basic editor properties
  plugins: {
    get: <T = any>(pluginName: string) => T | undefined;
  };
  
  // UI related properties
  ui: {
    element: HTMLElement;
    view: {
      document: {
        on: (event: string, callback: (event: any) => void) => void;
      };
    };
  };
  
  // Model related properties
  model: {
    document: {
      on: (event: string, callback: () => void) => void;
      selection: {
        isCollapsed: boolean;
        on: (event: string, callback: () => void) => void;
      };
    };
  };
  
  // Editing related properties
  editing: {
    view: {
      document: {
        on: (event: string, callback: (event: any) => void) => void;
      };
    };
  };
  
  // Core methods
  getData: () => string;
  execute: (command: string, ...args: unknown[]) => void;
  
  // Additional properties we might need
  [key: string]: any;
};

// Interfaces for better type safety
interface EditorCommand {
  name: string;
  icon: string;
  title: string;
  action: (editor: ExtendedEditor) => void;
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

interface WordCountStats {
  words: number;
  characters: number;
  charactersWithSpaces: number;
}

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CKEditorModule,
    DxButtonModule,
    DxTextBoxModule,
    DxCheckBoxModule,
    DxPopupModule,
    DxSelectBoxModule,
    DxTextAreaModule,
    DxToolbarModule,
    DxToastModule,
    NgIf,
    NgFor
  ],
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit, OnDestroy {
  @ViewChild('editorWordCountElement') private editorWordCount!: ElementRef<HTMLDivElement>;

  // Services
  private todoService = inject(TodoService);
  private fb = inject(FormBuilder);

  // Editor properties
  public Editor: any; // Using any for CKEditor to avoid type issues with dynamic imports
  public isLayoutReady = false;
  public editorConfig: EditorConfig = {
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
  private currentEditor: ExtendedEditor | null = null;
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

  constructor() {
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
      // Use dynamic import to load CKEditor
      const { default: ClassicEditor } = await import('@ckeditor/ckeditor5-build-classic');
      this.Editor = ClassicEditor; // Update the assignment to use the correct type
      this.isLayoutReady = true;
    } catch (error) {
      console.error('Error loading CKEditor:', error);
      this.isLayoutReady = true;
    }
  }

  // Editor event handlers
  public onEditorReady(editor: Editor): void {
    try {
      // Type assertion to ExtendedEditor
      const extendedEditor = editor as unknown as ExtendedEditor;
      this.currentEditor = extendedEditor;
      
      // Setup editor features and listeners
      this.setupEditorFeatures(extendedEditor);
      this.setupEditorListeners(extendedEditor);
      
      // Setup word count after a small delay to ensure editor is fully initialized
      setTimeout(() => {
        this.setupWordCount(extendedEditor);
      }, 100);
    } catch (error) {
      console.error('Error initializing editor:', error);
    }
  }

  private setupEditorFeatures(editor: ExtendedEditor): void {
    // Word count is now initialized in onEditorReady after a delay
    this.setupEnhancedBalloonToolbar(editor);
  }

  private setupEditorListeners(editor: ExtendedEditor): void {
    // Selection change listener
    this.safeExecute(() => {
      if (editor.model?.document?.selection) {
        editor.model.document.selection.on('change:range', () => {
          if (editor.model?.document?.selection) {
            const selection = editor.model.document.selection;
            if (!selection.isCollapsed) {
              this.showEnhancedBalloonToolbar(editor, selection);
            } else {
              this.hideEnhancedBalloonToolbar();
            }
          }
        });
      }
    });

    // Blur listener
    this.safeExecute(() => {
      if (editor.editing?.view?.document) {
        editor.editing.view.document.on('blur', () => {
          setTimeout(() => this.hideEnhancedBalloonToolbar(), 200);
        });
      }
    });

    // Content change listener
    if (editor.model?.document) {
      editor.model.document.on('change:data', () => {
        this.updateWordCount(editor);
      });
    }
  }

  public onEditorFocus(event: { editor: Editor }): void {
    const editor = event.editor as unknown as ExtendedEditor;
    this.setupEditorListeners(editor);
  }

  public onEditorBlur(event: { editor: Editor }): void {
    // Blur handling is already managed in setupEditorListeners
    // No additional action needed here
  }

  // Word count functionality
  private setupWordCount(editor: ExtendedEditor): void {
    if (!editor) return;
    
    // Try to use CKEditor's built-in word count plugin
    if (this.tryBuiltInWordCount(editor)) {
      return;
    }

    // Fallback to custom word count implementation
    this.createCustomWordCount();
    this.appendWordCountToEditor(editor);
    
    // Initial count
    this.updateWordCount(editor);
    
    // Update count on content changes
    if (editor.model?.document) {
      editor.model.document.on('change:data', () => {
        this.updateWordCount(editor);
      });
    }
  }

  private tryBuiltInWordCount(editor: ExtendedEditor): boolean {
    try {
      if (!editor.plugins) return false;
      
      const wordCountPlugin = editor.plugins.get('WordCount');
      if (!wordCountPlugin || !this.editorWordCount?.nativeElement) {
        return false;
      }
      
      const container = wordCountPlugin.wordCountContainer;
      if (!container) return false;
      
      this.clearElement(this.editorWordCount.nativeElement);
      this.editorWordCount.nativeElement.appendChild(container);
      return true;
    } catch (error) {
      console.warn('WordCount plugin not available, falling back to custom implementation:', error);
      return false;
    }
  }

  private createCustomWordCount(): void {
    if (!this.editorWordCount?.nativeElement) return;
    
    this.wordCountDisplay = document.createElement('div');
    this.wordCountDisplay.className = 'word-count-display';
    this.wordCountDisplay.style.cssText = this.getWordCountStyles();
    this.wordCountDisplay.textContent = '0 words | 0 characters';
    
    this.clearElement(this.editorWordCount.nativeElement);
    this.editorWordCount.nativeElement.appendChild(this.wordCountDisplay);
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

  private updateWordCount(editor: ExtendedEditor | null): void {
    if (!editor) return;
    
    try {
      const content = editor.getData();
      const stats = this.calculateWordStats(content);
      const displayText = this.formatWordCountDisplay(stats);
      
      // Update the word count display in the editor UI
      if (this.wordCountDisplay) {
        this.wordCountDisplay.textContent = displayText;
      }
      
      // Also update the word count in the editor's native element if available
      if (this.editorWordCount?.nativeElement) {
        this.clearElement(this.editorWordCount.nativeElement);
        this.editorWordCount.nativeElement.textContent = displayText;
      }
    } catch (error) {
      console.error('Error updating word count:', error);
    }
  }

  private calculateWordStats(content: string): WordCountStats {
    const textContent = this.stripHtml(content);
    const words = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    const characters = textContent.length;
    const charactersWithSpaces = content.replace(/<[^>]*>/g, '').length;

    return { words, characters, charactersWithSpaces };
  }

  private formatWordCountDisplay(stats: WordCountStats): string {
    return `${stats.words} ${stats.words === 1 ? 'word' : 'words'} | ${stats.characters} ${stats.characters === 1 ? 'character' : 'characters'}`;
  }

  private appendWordCountToEditor(editor: ExtendedEditor): void {
    if (!editor.ui?.element || !this.wordCountDisplay) return;
    
    const editorElement = editor.ui.element;
    if (!editorElement.querySelector('.word-count-display')) {
      editorElement.style.position = 'relative';
      editorElement.appendChild(this.wordCountDisplay);
    }
  }

  // Balloon toolbar functionality
  private setupEnhancedBalloonToolbar(editor: ExtendedEditor): void {
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
    
    if (button && button.dataset['command'] && this.currentEditor) {
      event.preventDefault();
      event.stopPropagation();
      this.executeEnhancedCommand(this.currentEditor, button.dataset['command']);
      setTimeout(() => this.updateEnhancedBalloonStates(this.currentEditor!), 50);
    }
  }

  private handleBalloonToolbarChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target.id === 'heading-select' && this.currentEditor) {
      event.preventDefault();
      event.stopPropagation();
      
      this.currentEditor.editing.view.focus();
      this.executeHeadingCommand(this.currentEditor, target.value);
      
      setTimeout(() => {
        if (this.currentEditor) {
          this.updateEnhancedBalloonStates(this.currentEditor);
        }
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
  private handleLinkCommand(editor: ExtendedEditor): void {
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

  private createTodoList(editor: ExtendedEditor): void {
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

  private insertEmoji(editor: ExtendedEditor): void {
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

  private toggleSourceEditing(editor: ExtendedEditor): void {
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

  private executeCustomUnderline(editor: ExtendedEditor): void {
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
  private showEnhancedBalloonToolbar(editor: ExtendedEditor, selection: any): void {
    if (!this.balloonToolbarElement) {
      this.createBalloonToolbar();
      if (!this.balloonToolbarElement) return;
    }

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

    const editorElement = document.querySelector('.ck-editor__editable');
    if (!editorElement) return;

    const editorRect = editorElement.getBoundingClientRect();
    const toolbarHeight = this.balloonToolbarElement.offsetHeight;
    const padding = 8;

    // Calculate position relative to the editor
    const top = rect.top - editorRect.top - toolbarHeight - padding;
    const left = rect.left - editorRect.left + (rect.width / 2) - (this.balloonToolbarElement.offsetWidth / 2);

    // Ensure the toolbar stays within the editor bounds
    const maxLeft = editorRect.width - this.balloonToolbarElement.offsetWidth - padding;
    const boundedLeft = Math.max(padding, Math.min(left, maxLeft));

    this.balloonToolbarElement.style.top = `${Math.max(padding, top)}px`;
    this.balloonToolbarElement.style.left = `${boundedLeft}px`;
    this.balloonToolbarElement.style.display = 'block';
  }

  private calculateOptimalPosition(toolbarRect: DOMRect, selection: unknown): { left: number; top: number } {
    let left = toolbarRect.left + (toolbarRect.width / 2) - (toolbarRect.width / 2);
    let top = toolbarRect.top - toolbarRect.height - 10;
    
    // Adjust for viewport boundaries
    left = Math.max(10, Math.min(left, window.innerWidth - toolbarRect.width - 10));
    
    if (top < 10) {
      top = toolbarRect.bottom + 10;
    }
    
    return { left, top };
  }

  private hideEnhancedBalloonToolbar(): void {
    if (this.balloonToolbarElement) {
      this.balloonToolbarElement.style.display = 'none';
    }
  }

  private updateEnhancedBalloonStates(editor: ExtendedEditor): void {
    if (!this.balloonToolbarElement) return;

    // Update button states
    this.updateButtonStates(editor);
    
    // Update heading select
    this.updateHeadingSelect(editor);
    
    // Make sure the toolbar is visible
    if (this.balloonToolbarElement) {
      this.balloonToolbarElement.style.display = 'block';
    }
  }

  private updateButtonStates(editor: ExtendedEditor): void {
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

  private updateHeadingSelect(editor: ExtendedEditor): void {
    if (!this.balloonToolbarElement) return;
    
    const headingSelect = this.balloonToolbarElement.querySelector('#heading-select') as HTMLSelectElement | null;
    if (!headingSelect) return;
    
    this.safeExecute(() => {
      const headingCommand = editor.commands?.get('heading');
      if (!headingCommand) return;
      
      const currentHeading = headingCommand.value;
      headingSelect.value = (currentHeading === false || currentHeading === null || currentHeading === undefined) 
        ? 'paragraph' 
        : typeof currentHeading === 'string' ? currentHeading : 'paragraph';
    });
  }

  // Todo management methods
  ngOnInit(): void {
    this.initializeTodoSubscriptions();
  }

  private initializeTodoSubscriptions(): void {
    // Subscribe to filtered todos
    this.todoService.filteredTodos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(todos => {
        this.todos = todos;
        this.filteredTodos = [...todos];
      });

    // Subscribe to stats
    this.todoService.stats$
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
      this.todoService.addTodo(formValue.title, formValue.content, {
        priority: formValue.priority,
        category: formValue.category
      });
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
    this.todoService.updateFilter({ status: filter as any });
  }

  onSearchChange(event: any): void {
    this.todoService.updateSearch(event.target.value);
  }

  // Filter methods are now handled by the service
  applyFilters(): void {
    // This method is kept for compatibility but does nothing
    // as filtering is now handled by the service
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

  private safeExecute(callback: () => void): void {
    try {
      callback();
    } catch (error: unknown) {
      console.error('Error in editor operation:', error instanceof Error ? error.message : String(error));
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
    // Clean up RxJS subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up editor resources
    this.cleanup();
    
    // Clean up word count display
    if (this.wordCountDisplay && this.wordCountDisplay.parentNode) {
      this.wordCountDisplay.parentNode.removeChild(this.wordCountDisplay);
      this.wordCountDisplay = null;
    }
    
    // Clean up balloon toolbar
    if (this.balloonToolbarElement && this.balloonToolbarElement.parentNode) {
      this.balloonToolbarElement.parentNode.removeChild(this.balloonToolbarElement);
      this.balloonToolbarElement = null;
    }
    
    // Remove any global styles we added
    const styleElement = document.getElementById('balloon-toolbar-styles');
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
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