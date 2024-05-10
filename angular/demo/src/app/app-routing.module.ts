import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: "",
    redirectTo: "generic-setup",
    pathMatch: "full"

  },
  {
    path: 'generic-setup',
    loadChildren: () => import("./generic-setup/generic-setup-module").then(m => m.GenericSetupModule)

  }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
