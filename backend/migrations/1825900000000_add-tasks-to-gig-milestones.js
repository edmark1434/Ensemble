/**
 * Migration: 1825900000000_add-tasks-to-gig-milestones.js
 * Adds tasks JSONB storage to gig_milestones, backfills tasks for preset milestone titles,
 * and populates tasks into contract_milestones and team_workspace_tasks for existing gig workspaces.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

const PRESET_TASKS_MAP = {
  'Discovery, Ingest & Narrative Pacing': [
    'Review client raw footage and project brief',
    'Audio sync & rough assembly',
    'Initial rough cut review'
  ],
  'Fine Cut, VFX & Audio Mixing': [
    'Dialogue cleanup & SFX layering',
    'Color grading & LUT application',
    'Motion graphics integration'
  ],
  'Final Polish, Color Grade & Delivery': [
    'Final feedback revisions',
    'High-res master exports (ProRes / H.264)',
    'Project archive delivery'
  ],
  'The Process (Combining Plan & Design)': [
    'Raw footage ingest & multitrack dialogue sync',
    'A-roll narrative assembly & story sequencing',
    'Rough pacing assembly & fine-cut sequence trimming'
  ],
  'The Final Cut (Final Touches & Result)': [
    'Motion titles, lower thirds & graphic animations',
    'Sound effects design, EQ & loudness normalization (-14 LUFS)',
    'Color grading, exposure balance & LUT look',
    'Final 4K master export & project archive delivery'
  ],
  'Phase 1: Assembly & Story Structure': [
    'Asset ingestion & audio synchronization',
    'Rough cut assembly & narrative pacing',
    'Client review draft delivery'
  ],
  'Phase 1: Rough Cut & Pacing': [
    'Asset ingestion & audio synchronization',
    'Rough cut assembly & narrative pacing',
    'Client review draft delivery'
  ],
  'Phase 1: Beat Sync & Export': [
    'Music beat-matching & footage cuts',
    'Pacing adjustments & audio alignment',
    'Export draft review'
  ],
  'Phase 2: Motion Graphics, VFX & B-Roll': [
    'Motion graphics titles & lower thirds',
    'Visual effects & transitions',
    'B-roll layering & pacing polish'
  ],
  'Phase 2: Polish, Captions & Final Render': [
    'Dynamic animated captions & subtitles',
    'Sound design & volume balancing',
    'High-definition master export'
  ],
  'Phase 3: Color Grade & Broadcast Audio Master': [
    'Color correction & cinematic grade',
    'Audio mix & loudness normalization (-14 LUFS)',
    'Final master export & project archive'
  ]
};

exports.up = async (pgm) => {
  // 1. Add tasks JSONB column to gig_milestones
  await pgm.db.query(`
    ALTER TABLE gig_milestones
    ADD COLUMN IF NOT EXISTS tasks JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  // 2. Backfill tasks for preset milestone titles in gig_milestones
  for (const [milestoneName, tasks] of Object.entries(PRESET_TASKS_MAP)) {
    await pgm.db.query(`
      UPDATE gig_milestones
      SET tasks = $1::jsonb
      WHERE name = $2 AND (tasks IS NULL OR tasks = '[]'::jsonb);
    `, [JSON.stringify(tasks), milestoneName]);
  }

  // 3. Backfill tasks for contract_milestones associated with gig contracts
  for (const [milestoneName, tasks] of Object.entries(PRESET_TASKS_MAP)) {
    await pgm.db.query(`
      UPDATE contract_milestones cm
      SET tasks = $1::jsonb
      WHERE cm.name = $2
        AND (cm.tasks IS NULL OR cm.tasks = '[]'::jsonb)
        AND EXISTS (
          SELECT 1 FROM gig_contracts gc WHERE gc.contract_id = cm.contract_id
        );
    `, [JSON.stringify(tasks), milestoneName]);
  }

  // 4. Update team_workspace_tasks for existing gig workspaces
  // If a workspace task was created simply as a placeholder with title = milestone name,
  // replace it with the individual sub-tasks
  const gigWorkspacesRes = await pgm.db.query(`
    SELECT DISTINCT tcw.workspace_id, tcw.created_by_account_id, cm.contract_milestone_id, cm.name as milestone_name, cm.tasks, cm.index as milestone_index
    FROM team_contract_workspaces tcw
    JOIN gig_contracts gc ON gc.contract_id = tcw.contract_id
    JOIN contract_milestones cm ON cm.contract_id = tcw.contract_id
    WHERE cm.tasks IS NOT NULL AND cm.tasks != '[]'::jsonb
  `);

  for (const row of gigWorkspacesRes.rows) {
    let taskList = [];
    try {
      taskList = Array.isArray(row.tasks) ? row.tasks : JSON.parse(row.tasks || '[]');
    } catch (_) {
      taskList = [];
    }

    if (taskList.length === 0) continue;

    // Check if there is only a placeholder task matching the milestone title
    const existingTasksRes = await pgm.db.query(`
      SELECT task_id, title, status, created_by_account_id
      FROM team_workspace_tasks
      WHERE workspace_id = $1 AND contract_milestone_id = $2
    `, [row.workspace_id, row.contract_milestone_id]);

    const isPlaceholderOnly = existingTasksRes.rows.length === 1 &&
      existingTasksRes.rows[0].title.trim() === row.milestone_name.trim() &&
      existingTasksRes.rows[0].status === 'todo';

    if (isPlaceholderOnly) {
      const creatorAccountId = existingTasksRes.rows[0].created_by_account_id || row.created_by_account_id;

      // Remove placeholder title task
      await pgm.db.query(`
        DELETE FROM team_workspace_tasks
        WHERE task_id = $1
      `, [existingTasksRes.rows[0].task_id]);

      const isLocked = Number(row.milestone_index) > 0;

      // Insert actual sub-tasks
      for (let i = 0; i < taskList.length; i++) {
        const item = taskList[i];
        const rawTitle = typeof item === 'string' ? item : (item.title || item.task || `Task ${i + 1}`);
        const taskTitle = String(rawTitle).trim().slice(0, 160);
        const taskDesc = typeof item === 'object' ? (item.description || '') : '';

        await pgm.db.query(`
          INSERT INTO team_workspace_tasks (
            workspace_id, contract_milestone_id, title, description, status, priority, is_locked, sort_order, created_by_account_id
          ) VALUES ($1, $2, $3, $4, 'todo', 'normal', $5, $6, $7)
        `, [
          row.workspace_id,
          row.contract_milestone_id,
          taskTitle,
          taskDesc,
          isLocked,
          i,
          creatorAccountId
        ]);
      }
    }
  }
};

exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE gig_milestones
    DROP COLUMN IF EXISTS tasks;
  `);
};
