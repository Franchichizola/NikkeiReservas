/// <reference types="vite/client" />

// Le avisa a TypeScript cuáles son nuestras variables del archivo .env
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WEBHOOK_SECRET?: string;
}
