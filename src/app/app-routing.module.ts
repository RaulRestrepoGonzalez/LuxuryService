import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadChildren: () => import('./modules/public/public.module').then(m => m.PublicModule) },
  { path: 'client', loadChildren: () => import('./modules/client/client.module').then(m => m.ClientModule) },
  { path: 'admin', loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule) },
  { path: '**', redirectTo: '' }
];

@NgModule({ imports: [RouterModule.forRoot(routes)], exports: [RouterModule] })
export class AppRoutingModule { }
