/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Add hiring_type to jobs table
  pgm.addColumns('jobs', {
    hiring_type: { 
      type: 'varchar(20)', 
      notNull: true, 
      default: 'single' 
    }
  });

  // 2. Create job_milestones table
  pgm.createTable('job_milestones', {
    job_milestone_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()')
    },
    job_id: {
      type: 'uuid',
      notNull: true,
      references: 'jobs(job_id)',
      onDelete: 'CASCADE'
    },
    title: {
      type: 'varchar(255)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    tasks: {
      type: 'jsonb',
      notNull: true,
      default: '[]'
    },
    budget_percentage: {
      type: 'numeric(5, 2)',
      notNull: true,
      default: 0
    },
    budget_credits: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    slots_count: {
      type: 'integer',
      notNull: true,
      default: 1
    },
    order_index: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  pgm.createIndex('job_milestones', 'job_id');

  // 3. Add job_milestone_id to proposals
  pgm.addColumns('proposals', {
    job_milestone_id: {
      type: 'uuid',
      references: 'job_milestones(job_milestone_id)',
      onDelete: 'SET NULL'
    }
  });

  pgm.createIndex('proposals', 'job_milestone_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropIndex('proposals', 'job_milestone_id', { ifExists: true });
  pgm.dropColumns('proposals', ['job_milestone_id']);
  
  pgm.dropTable('job_milestones', { ifExists: true });
  
  pgm.dropColumns('jobs', ['hiring_type']);
};
