const { getProjectsForUser } = require('../repositories/ProjectRepositories');

function formatBytes(bytes) {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getProjectsController(req, res) {
    try {
        const userId = req.user.userId || req.user.user_id;
        const projects = await getProjectsForUser(userId);
        
        return res.status(200).json({
            success: true,
            projects: projects.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                width: p.width,
                height: p.height,
                duration_seconds: p.duration_seconds,
                lastUpdated: p.lastUpdated,
                role: p.role,
                sharedBy: p.role === 'Owner' ? null : p.sharedBy,
                size: formatBytes(Number(p.size_bytes)),
                thumbnailUrl: p.thumbnailPath && process.env.CLOUDFRONT_URL
                    ? `${process.env.CLOUDFRONT_URL}/${p.thumbnailPath}`
                    : null
            }))
        });
    } catch (error) {
        console.error('Error in getProjectsController:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

async function deleteProjectController(req, res) {
    try {
        const userId = req.user.userId || req.user.user_id;
        const { id } = req.params;
        await require('../repositories/ProjectRepositories').softDeleteProject(id, userId);
        return res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error in deleteProjectController:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function renameProjectController(req, res) {
    try {
        const userId = req.user.userId || req.user.user_id;
        const { id } = req.params;
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        const newName = name.trim();
        const updated = await require('../repositories/ProjectRepositories').renameProject(id, userId, newName);

        // Zero rows means the user isn't an Owner/Editor of this project (or it
        // doesn't exist). Nothing was saved, so don't notify the editor either.
        if (!updated) {
            return res.status(403).json({ success: false, message: 'You do not have permission to rename this project' });
        }

        // Tell the editor so anyone with this project open sees the new name live.
        // Not awaited: the rename already succeeded, and if the editor is down the
        // next open takes the DB name anyway.
        fetch(`${process.env.EDITOR_URL}/api/internal/projects/${id}/name`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': process.env.INTERNAL_API_SECRET,
            },
            body: JSON.stringify({ name: newName }),
        }).catch((err) => console.error('failed to notify editor of rename', err));

        return res.status(200).json({ success: true, message: 'Project renamed successfully' });
    } catch (error) {
        console.error('Error in renameProjectController:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getProjectsController,
    deleteProjectController,
    renameProjectController
};
