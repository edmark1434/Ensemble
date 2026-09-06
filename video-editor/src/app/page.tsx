// app/page.tsx

import { redirect } from "next/navigation";

const MAIN_APP_URL = process.env.MAIN_APP_URL || "http://localhost:5173";

export default function Home() {
  redirect(MAIN_APP_URL);
}