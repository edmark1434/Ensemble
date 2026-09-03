// app/not-found.tsx

import { redirect } from "next/navigation";

const MAIN_APP_URL = process.env.MAIN_APP_URL || "http://localhost:5173";

export default function NotFound() {
  redirect(MAIN_APP_URL);
}