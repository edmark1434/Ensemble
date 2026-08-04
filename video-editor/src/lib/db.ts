import { Pool } from "pg";
import { Kysely, PostgresDialect, Generated } from "kysely";

interface FilesTable {
  file_id: Generated<number>;
  name: string;
  path: string;
  mime_type: string;
  size_bytes: number;
  created_at: Generated<Date>;
  deleted_at: Date | null;
}

interface MediaAssetsTable {
  media_asset_id: Generated<number>;
  public_id: string;
  owner_user_id: number;
  project_id: number;
  name: string;
  original_file_id: number;
  proxy_file_id: number | null;
  thumbnail_file_id: number | null;
  type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  is_marketed: Generated<boolean>;
  created_at: Generated<Date>;
  deleted_at: Date | null;
}

interface ProjectsTable {
  project_id: Generated<number>;
  public_id: string;
}

interface AccountsTable {
  account_id: Generated<number>;
  public_id: string;
}

interface UsersTable {
  user_id: Generated<number>;
  account_id: number;
}

interface Database {
  files: FilesTable;
  media_assets: MediaAssetsTable;
  projects: ProjectsTable;
  accounts: AccountsTable;
  users: UsersTable;
}

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool })
});