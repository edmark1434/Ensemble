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
                thumbnail: `https://placehold.co/400x225/1e2130/4a6fa5?text=${encodeURIComponent(p.name)}`
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
        await require('../repositories/ProjectRepositories').renameProject(id, userId, name.trim());
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
