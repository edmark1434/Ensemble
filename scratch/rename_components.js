const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/Proposal/g, 'Order');
    content = content.replace(/proposal/g, 'order');
    content = content.replace(/Proposals/g, 'Orders');
    content = content.replace(/proposals/g, 'orders');
    content = content.replace(/Job/g, 'Gig');
    content = content.replace(/job/g, 'gig');
    content = content.replace(/Jobs/g, 'Gigs');
    content = content.replace(/jobs/g, 'gigs');
    
    // Also rename the file if it contains 'proposal' or 'job'
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    let newBase = base;
    newBase = newBase.replace(/proposal/g, 'order').replace(/job/g, 'gig');
    
    const newPath = path.join(dir, newBase);
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    if (newPath !== filePath) {
        fs.renameSync(filePath, newPath);
    }
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            replaceInFile(fullPath);
        }
    }
}

processDir('./frontend/src/pages/user/7_gigs/gig_orders/orders_components');
