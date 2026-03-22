import { redirect } from "next/navigation";
import { isAuthenticatedRequest } from "../lib/auth";

export default async function HomePage() {
  if (await isAuthenticatedRequest()) {
    redirect("/rapido");
  }
  redirect("/login");
}
