import { db } from "@/lib/db";
import { uniqueNameLookup, resolveUniqueFileNameFromTaken } from "./filename";

export async function resolveUniqueFileName(
  ownerUserId: string,
  fileName: string,
  reservedNames: Set<string> = new Set()
): Promise<string> {
  const { prefix, ext } = uniqueNameLookup(fileName);

  const existing = await db
    .selectFrom("media_assets")
    .select("name")
    .where("owner_user_id", "=", ownerUserId)
    .where("name", "like", `${prefix}%${ext}`)
    .execute();

  const taken = new Set([...existing.map((row) => row.name), ...reservedNames]);

  return resolveUniqueFileNameFromTaken(fileName, taken);
}