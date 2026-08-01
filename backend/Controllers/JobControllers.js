async function getJobs(req, res) {
    const users = req.session;
    console.log("Redis connection response:", users);
}

module.exports= {
    getJobs
}