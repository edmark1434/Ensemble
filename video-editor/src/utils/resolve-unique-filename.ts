import { db } from "@/lib/db";
import { splitExt, resolveUniqueFileNameFromTaken } from "./filename";

export async function resolveUniqueFileName(
  ownerUserId: number,
  fileName: string,
  reservedNames: Set<string> = new Set()
): Promise<string> {
  const { base, ext } = splitExt(fileName);

  const existing = await db
    .selectFrom("media_assets")
    .select("name")
    .where("owner_user_id", "=", ownerUserId)
    .where("name", "like", `${base}%${ext}`)
    .execute();

  const taken = new Set([...existing.map((row) => row.name), ...reservedNames]);

  return resolveUniqueFileNameFromTaken(fileName, taken);
}