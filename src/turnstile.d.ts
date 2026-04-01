// src/turnstile.d.ts
export {};

declare global {
  interface Window {
    turnstile?: {
      reset(): void;
    };
  }
}