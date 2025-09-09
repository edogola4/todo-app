import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// DevExtreme modules
import { DxButtonModule } from 'devextreme-angular/ui/button';
import { DxCheckBoxModule } from 'devextreme-angular/ui/check-box';
import { DxSelectBoxModule } from 'devextreme-angular/ui/select-box';
import { DxTextAreaModule } from 'devextreme-angular/ui/text-area';
import { DxTextBoxModule } from 'devextreme-angular/ui/text-box';
import { DxToolbarModule } from 'devextreme-angular/ui/toolbar';
import { DxToastModule } from 'devextreme-angular/ui/toast';
import { DxPopupModule } from 'devextreme-angular/ui/popup';

// CKEditor
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

// Services
import { TodoService } from './app/services/todo.service';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      FormsModule,
      ReactiveFormsModule,
      DxButtonModule,
      DxCheckBoxModule,
      DxSelectBoxModule,
      DxTextAreaModule,
      DxTextBoxModule,
      DxToolbarModule,
      DxToastModule,
      DxPopupModule,
      CKEditorModule
    ),
    TodoService
  ]
}).catch(err => console.error(err));
