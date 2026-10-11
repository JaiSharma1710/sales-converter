import { redirect } from "next/navigation";
import { SalesImport } from "@/components/sales-import";
import { getAuthStatus, isAuthRequired } from "@/lib/auth/session";
import { getMappings } from "@/lib/db/mappings-repository";

export default async function Home() {
  // Reading the session cookie also renders this page per request, which the
  // mappings need since they change at runtime.
  if ((await getAuthStatus()) !== "authenticated") {
    redirect("/login");
  }

  return (
    <SalesImport
      canSignOut={isAuthRequired()}
      mappings={await getMappings()}
    />
  );
}
