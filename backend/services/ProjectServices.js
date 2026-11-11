const projects = require('../repositories/ProjectRepositories');

function projectError(message, statusCode) {
    return Object.assign(new Error(message), { statusCode });
}

async function listProjects(userId, scope = 'active') {
    if (scope !== 'active' && scope !== 'trash') throw projectError('Invalid project list', 400);
    return projects.getProjectsForUser(userId, scope === 'trash');
}

async function notifyProjectAccessChanged(projectId) {
    if (!process.env.EDITOR_URL || !process.env.INTERNAL_API_SECRET) return;
    try {
        const response = await fetch(`${process.env.EDITOR_URL}/api/internal/projects/${projectId}/access`, {
            method: 'POST',
            headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET },
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('Editor rejected access refresh');
    } catch {
        // Committed state remains authoritative; the editor also rechecks access periodically.
        console.error('Unable to notify editor of project access change');
    }
}

async function changeProjectTrashState(projectId, userId, action) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
        throw projectError('Invalid project ID', 400);
    }
    if (!['trash', 'restore', 'permanent'].includes(action)) throw projectError('Invalid action', 400);
    await projects.withLockedProject(projectId, userId, async (project, client) => {
        if (!project || project.deleted_at) throw projectError('Project not found', 404);
        if (project.role !== 'Owner') throw projectError('Only the project owner can manage its trash', 403);
        if (String(project.status).toLowerCase() === 'frozen') throw projectError('This project is frozen', 403);
        if (action !== 'trash' && !project.trashed_at) throw projectError('Move the project to Trash first', 409);
        if (action === 'restore' && project.expired) throw projectError('The 30-day restore period has expired', 409);
        if (action === 'trash' && project.trashed_at) return;
        await projects.updateProjectTrashState(client, projectId, action);
    });
    await notifyProjectAccessChanged(projectId);
}

async function purgeExpiredProjects() {
    const rows = await projects.purgeExpiredProjectTrash();
    for (const project of rows) await notifyProjectAccessChanged(project.project_id);
    return rows.length;
}

module.exports = { listProjects, changeProjectTrashState, purgeExpiredProjects };
