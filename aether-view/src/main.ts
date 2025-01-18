import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import 'zone.js';
import { register as registerSwiperElements } from 'swiper/element/bundle';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TmdbService } from './app/services/tmdb.service';

registerSwiperElements();
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), 
    importProvidersFrom(HttpClientModule), 
    provideAnimationsAsync(),
    provideAppInitializer(() => {
      const tmdbService = inject(TmdbService);
      return tmdbService.initializeRegion();
    }),
  ],
}).catch(err => console.error(err));
