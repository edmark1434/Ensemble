require('dotenv').config();
const { pool, connectPostgresDB } = require('../lib/Database');
const { connectMongoDB } = require('../lib/MongoDb');
const {
    shareProjectInvitationService,
    acceptProjectInvitationService,
    getProjectInvitationEmailHtml,
    InvitationServiceError,
} = require('../services/InvitationServices');
const {
    getProjectMemberRole,
    getProjectById,
    getUserAndAccountByAccountId,
    addOrReviveProjectMember,
} = require('../repositories/InvitationRepositories');

async function runTests() {
    console.log('=== Starting Project Invitation Tests ===');
    await connectPostgresDB();
    await connectMongoDB();

    try {
        // 1. Check HTML template
        console.log('\n[Test 1] Testing HTML email template generator...');
        const html = getProjectInvitationEmailHtml({
            recipientName: 'Alice',
            inviterDisplayName: 'Bob Builder',
            projectName: 'Epic Animation',
            invitationLink: 'http://localhost:4000/api/invitations/accept?token=test_token_123',
        });
        if (!html.includes('Epic Animation') || !html.includes('Bob Builder') || !html.includes('3 days') || !html.includes('test_token_123')) {
            throw new Error('HTML email template missing required placeholders');
        }
        console.log('✓ HTML email template generated correctly with all placeholders & 3-day expiry notice.');

        // 2. Fetch a real project & members from database to test with
        console.log('\n[Test 2] Querying database for a project and user...');
        const projectRes = await pool.query(`
            SELECT p.project_id, p.name, pm.user_id, u.account_id
            FROM projects p
            JOIN project_members pm ON pm.project_id = p.project_id
            JOIN users u ON u.user_id = pm.user_id
            WHERE p.deleted_at IS NULL AND pm.deleted_at IS NULL AND pm.role = 'Owner'
            LIMIT 1;
        `);

        if (projectRes.rows.length === 0) {
            console.log('No existing project with owner found in DB. Skipping DB integration test.');
            return;
        }

        const owner = projectRes.rows[0];
        console.log(`Found project: "${owner.name}" (${owner.project_id}) owned by user ${owner.user_id}`);

        // Find a user who is not a member of this project
        const otherUserRes = await pool.query(`
            SELECT u.user_id, u.account_id, u.email_address, a.display_name
            FROM users u
            JOIN accounts a ON a.account_id = u.account_id
            WHERE u.user_id NOT IN (
                SELECT pm.user_id FROM project_members pm WHERE pm.project_id = $1 AND pm.deleted_at IS NULL
            ) AND a.deleted_at IS NULL
            LIMIT 1;
        `, [owner.project_id]);

        if (otherUserRes.rows.length === 0) {
            console.log('Only one user in DB. Skipping invitee integration test.');
            return;
        }

        const invitee = otherUserRes.rows[0];
        console.log(`Found invitee: "${invitee.display_name}" (${invitee.email_address}, account: ${invitee.account_id})`);

        // 3. Test Authorization: verify unauthorized inviter is rejected
        console.log('\n[Test 3] Testing authorization check for non-member...');
        try {
            await shareProjectInvitationService(
                { projectId: owner.project_id, recipientAccountId: invitee.account_id },
                invitee.user_id, // other user is not owner
                invitee.account_id
            );
            throw new Error('Expected 403 Forbidden error for non-member inviter');
        } catch (err) {
            if (err.statusCode === 403) {
                console.log('✓ Non-member inviter correctly rejected with 403 Forbidden.');
            } else {
                throw err;
            }
        }

        // 4. Test Sharing flow
        console.log('\n[Test 4] Testing shareProjectInvitationService with project Owner...');
        const shareResult = await shareProjectInvitationService(
            {
                projectId: owner.project_id,
                recipientAccountId: invitee.account_id,
            },
            owner.user_id,
            owner.account_id
        );

        console.log('Share result:', {
            success: shareResult.success,
            message: shareResult.message,
            channels: shareResult.channels,
            editorUrl: shareResult.editorUrl,
        });

        if (!shareResult.success) throw new Error('shareProjectInvitationService failed');
        if (!shareResult.editorUrl.includes(owner.project_id)) throw new Error('editorUrl missing projectId');
        console.log('✓ Project invitation successfully processed across channels.');

        // 5. Test Token Acceptance
        console.log('\n[Test 5] Testing acceptProjectInvitationService with generated token...');
        const token = new URL(shareResult.invitationLink).searchParams.get('token');
        const acceptResult = await acceptProjectInvitationService(token);
        console.log('Accept result:', acceptResult);

        if (!acceptResult.success || !acceptResult.redirectUrl.includes(owner.project_id)) {
            throw new Error('acceptProjectInvitationService failed to generate redirect URL');
        }
        console.log('✓ Token accepted and correctly redirected to editor URL.');

        // 6. Verify invitee is now a project member in PostgreSQL
        console.log('\n[Test 6] Verifying project_members row in database...');
        const memberRole = await getProjectMemberRole(owner.project_id, invitee.user_id);
        if (memberRole !== 'Editor') {
            throw new Error(`Expected invitee role to be 'Editor', got ${memberRole}`);
        }
        console.log(`✓ Invitee confirmed in project_members with role: ${memberRole}`);

        // 7. Verify In-App Notification in PostgreSQL
        console.log('\n[Test 7] Verifying in-app notification in database...');
        const notifRes = await pool.query(`
            SELECT notification_id, message, reference_prefix, reference_path
            FROM notifications
            WHERE account_id = $1 AND reference_prefix = 'PROJECT_INVITATION' AND reference_id = $2
            ORDER BY created_at DESC LIMIT 1;
        `, [invitee.account_id, owner.project_id]);

        if (notifRes.rows.length === 0) {
            throw new Error('Notification not found in database');
        }
        console.log('✓ In-app notification found:', notifRes.rows[0]);

        console.log('\n=== All Tests Passed Successfully! ===');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
        process.exit();
    }
}

runTests();
