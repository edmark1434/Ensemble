

async function checkStaffRole(req,res){
    const isStaff = req.session.type === 'Staff';
    if(!isStaff){
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Staff role required',
        });
    }
    res.status(200).json({
        success: true,
        credentials: req.session,
    });
}
module.exports = {
    checkStaffRole
};