import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { TodoComponent } from './components/todo/todo.component';

// DevExpress imports
import { DxButtonModule, DxTextBoxModule, DxListModule, DxCheckBoxModule, DxPopupModule, DxFormModule } from 'devextreme-angular';

// CKEditor import
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

@NgModule({
  declarations: [
    AppComponent,
    TodoComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    // DevExpress modules
    DxButtonModule,
    DxTextBoxModule,
    DxListModule,
    DxCheckBoxModule,
    DxPopupModule,
    DxFormModule,
    // CKEditor module
    CKEditorModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }