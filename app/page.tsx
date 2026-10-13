import { redirect } from "next/navigation";
import { SalesImport } from "@/components/sales-import";
import { getAuthStatus, isAuthRequired } from "@/lib/auth/session";

export default async function Home() {
  if ((await getAuthStatus()) !== "authenticated") {
    redirect("/login");
  }

  return <SalesImport canSignOut={isAuthRequired()} />;
}
