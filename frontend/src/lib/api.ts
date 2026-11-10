import { devConsoleApiOrigin } from './consoleHosts';

/** Backend API origin. Set VITE_BASE_URL in frontend/.env (see .env.example). */
export const API_BASE_URL =
  devConsoleApiOrigin()
  || import.meta.env.VITE_BASE_URL?.replace(/\/$/, '')
  || 'http://localhost:4000';
