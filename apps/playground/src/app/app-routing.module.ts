import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'app', loadComponent: () => import('./main/main.component').then(m => m.MainComponent) },
  { path: 'test', loadComponent: () => import('./test/test.component').then(m => m.TestComponent) },
  { path: '', redirectTo: '/app', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
