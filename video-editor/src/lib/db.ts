import { Pool } from "pg";
import {Kysely, PostgresDialect, Generated} from "kysely";

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

interface SessionsTable {
  session_id: Generated<number>;
  project_id: number;
  user_id: number;
  socket_id: string | null;
  connected_at: Generated<Date>;
  disconnected_at: Date | null;
}

interface SessionActivitiesTable {
  session_activity_id: Generated<number>;
  session_id: number;
  type: "edit" | "join" | "leave";
  created_at: Generated<Date>;
}

interface YjsUpdatesTable {
  yjs_update_id: Generated<number>;
  session_activity_id: number;
  update: Buffer;
  created_at: Generated<Date>;
}

interface ProjectYjsUpdatesTable {
  yjs_update_id: number;
  project_id: number;
}

interface YjsSnapshotsTable {
  yjs_snapshot_id: Generated<number>;
  document: Buffer;
  created_at: Generated<Date>;
}

interface ProjectYjsSnapshotsTable {
  yjs_snapshot_id: number;
  project_id: number;
}

interface Database {
  files: FilesTable;
  media_assets: MediaAssetsTable;
  projects: ProjectsTable;
  accounts: AccountsTable;
  users: UsersTable;

  sessions: SessionsTable;
  session_activities: SessionActivitiesTable;
  yjs_updates: YjsUpdatesTable;
  yjs_snapshots: YjsSnapshotsTable;
  project_yjs_updates: ProjectYjsUpdatesTable;
  project_yjs_snapshots: ProjectYjsSnapshotsTable;
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