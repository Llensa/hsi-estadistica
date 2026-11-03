import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

// --- Firebase (opcional, se activa más adelante) ---
// 1) Instalá los paquetes:  npm install @angular/fire@20.0.3 firebase@^12
// 2) Completá src/app/firebase.config.ts con tu firebaseConfig.
// 3) Descomentá estos imports y las dos líneas de providers.
//
// import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
// import { getFirestore, provideFirestore } from '@angular/fire/firestore';
// import { firebaseConfig } from './firebase.config';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // provideFirebaseApp(() => initializeApp(firebaseConfig)),
    // provideFirestore(() => getFirestore()),
  ],
};
