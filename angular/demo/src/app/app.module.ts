import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CustomErrorHandler } from './global-error-handler';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    {
      // interceptor for HTTP errors
      provide: HTTP_INTERCEPTORS,
      useClass: CustomErrorHandler,
      multi: true // multiple interceptors are possible
    }],
  bootstrap: [AppComponent]
})
export class AppModule { }
