import { connection } from "next/server";
import { SalesImport } from "@/components/sales-import";
import { getMappings } from "@/lib/db/mappings-repository";

export default async function Home() {
  // Mappings live in SQLite and change at runtime, so render per request.
  await connection();

  return <SalesImport mappings={getMappings()} />;
}
