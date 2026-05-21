import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { routes } from './app.routes';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    importProvidersFrom(FormsModule),
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    provideClientHydration(withEventReplay())
  ]
};
