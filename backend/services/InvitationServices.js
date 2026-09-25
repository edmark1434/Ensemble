const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const redisClient = require('../lib/Redis');
const { getIo } = require('../lib/WebSocket');
const {
    getProjectMemberRole,
    getProjectById,
    getUserAndAccountByAccountId,
    getUserAndAccountByEmail,
    addOrReviveProjectMember,
} = require('../repositories/InvitationRepositories');
const { createNotificationServices } = require('./NotificationServices');
const {
    createOrReuseDirectChatServices,
    createMessageServices,
} = require('./InboxServices');

const INVITATION_TOKEN_TTL_SECONDS = 3 * 24 * 60 * 60; // 3 days (72 hours)
const ASSIGNABLE_ROLES = ['Editor', 'Commenter', 'Viewer'];

class InvitationServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

function getProjectInvitationEmailHtml({ recipientName, inviterDisplayName, projectName, invitationLink }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
<tr>
<td align="center">

<table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.05);">

<tr>
<td align="center" style="padding:32px 20px 10px;">
<img
    src="https://i.pinimg.com/736x/4c/0e/41/4c0e41b328ad5f3bc015686827b05fa9.jpg"
    width="120"
    alt="Ensemble"
    style="display:block;border-radius:8px;">
</td>
</tr>

<tr>
<td style="padding:20px 40px 40px;text-align:center;">

<h2 style="margin:0 0 12px;color:#1e1e2f;">
Hi ${recipientName || 'there'},
</h2>

<p style="font-size:15px;line-height:1.6;color:#555;">
<strong>${inviterDisplayName || 'A collaborator'}</strong> has invited you to collaborate on the project <strong>${projectName}</strong> in <strong>Ensemble</strong>. Click the button below to open and join the project. This invitation link is valid for <strong>3 days</strong>.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
<tr>
<td align="center">
    <a href="${invitationLink}"
       target="_blank"
       style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;box-shadow:0 2px 6px rgba(99,102,241,0.35);">
        Open Project
    </a>
</td>
</tr>
</table>

<p style="font-size:13px;color:#71717a;line-height:1.6;word-break:break-all;">
If the button above does not work, copy and paste this URL into your browser:<br/>
<a href="${invitationLink}" style="color:#6366f1;text-decoration:underline;">${invitationLink}</a>
</p>

<p style="font-size:13px;color:#94a3b8;line-height:1.6;margin-top:24px;">
If you weren't expecting this invitation, you can safely ignore this email.
</p>

</td>
</tr>

<tr>
<td align="center"
style="padding:20px;background:#fafafa;border-top:1px solid #eeeeee;font-size:12px;color:#999;">
© 2026 Ensemble. Project Invitation.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}

async function sendProjectInvitationEmail({ email, recipientName, inviterDisplayName, projectName, invitationLink }) {
    if (!email) return null;

    const payload = {
        sender: {
            name: "Ensemble",
            email: "ensemble.support@ensemble.software"
        },
        to: [
            {
                email,
                name: recipientName || 'Ensemble User'
            }
        ],
        subject: `You're invited to collaborate on "${projectName}" on Ensemble`,
        htmlContent: getProjectInvitationEmailHtml({ recipientName, inviterDisplayName, projectName, invitationLink })
    };

    if (!process.env.BREVO_API_KEY) {
        console.warn('BREVO_API_KEY is not configured. Invitation link for debugging:', invitationLink);
        return { sent: false, debugLink: invitationLink };
    }

    try {
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'Accept': 'application/json'
            }
        });
        return response.data;
    } catch (err) {
        console.error('Failed to send project invitation email via Brevo:', err.response?.data || err.message);
        return null;
    }
}

async function shareProjectInvitationService(params, inviterUserId, inviterAccountId) {
    const { projectId, recipientAccountId, role = 'Editor' } = params;

    if (!projectId) {
        throw new InvitationServiceError('Project ID is required', 400);
    }
    if (!recipientAccountId) {
        throw new InvitationServiceError('Recipient account ID is required', 400);
    }
    if (role && !ASSIGNABLE_ROLES.includes(role)) {
        throw new InvitationServiceError(`Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`, 400);
    }

    // 1. Authorization: verify inviter has access to the project
    const inviterRole = await getProjectMemberRole(projectId, inviterUserId);
    if (!inviterRole || !['Owner', 'Editor'].includes(inviterRole)) {
        throw new InvitationServiceError('You do not have permission to invite members to this project', 403);
    }

    // 2. Fetch project details
    const project = await getProjectById(projectId);
    if (!project) {
        throw new InvitationServiceError('Project not found', 404);
    }

    // 3. Resolve recipient user & email from users table via account ID
    const recipient = await getUserAndAccountByAccountId(recipientAccountId);
    if (!recipient) {
        throw new InvitationServiceError('No user found for the provided account ID', 404);
    }

    const email = recipient.email_address;
    if (!email) {
        throw new InvitationServiceError('Recipient user does not have a registered email address', 400);
    }

    // Fetch inviter account details for display name
    const inviter = await getUserAndAccountByAccountId(inviterAccountId);
    const inviterDisplayName = inviter?.display_name || (inviter ? `${inviter.first_name} ${inviter.last_name}`.trim() : 'A collaborator');
    const recipientName = recipient?.display_name || (recipient ? `${recipient.first_name} ${recipient.last_name}`.trim() : '');

    // 4. Ensure member is registered in project_members if they are an existing user
    if (recipient?.user_id) {
        await addOrReviveProjectMember(projectId, recipient.user_id, role);
    }

    // 5. Generate secure 3-day invitation token
    const tokenSecret = process.env.ACCESS_TOKEN_JWT_SECRET || 'ensemble-invitation-secret';
    const tokenPayload = {
        projectId,
        projectName: project.name,
        inviterAccountId,
        inviterUserId,
        recipientAccountId: recipient?.account_id || null,
        recipientUserId: recipient?.user_id || null,
        recipientEmail: email,
        role,
        createdAt: Date.now(),
    };

    const token = jwt.sign(tokenPayload, tokenSecret, { expiresIn: '3d' });

    // Store in Redis with 3-day TTL
    await redisClient.set(
        `project-invitation:${token}`,
        JSON.stringify(tokenPayload),
        { EX: INVITATION_TOKEN_TTL_SECONDS }
    );

    const editorBaseUrl = (process.env.EDITOR_URL || 'http://localhost:3000').replace(/\/$/, '');
    const backendBaseUrl = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
    const editorProjectUrl = `${editorBaseUrl}/editor/${projectId}`;
    const acceptInvitationLink = `${backendBaseUrl}/api/invitations/accept?token=${token}`;

    // 6. Channel 1: Email notification (Brevo)
    let emailResult = null;
    if (email) {
        emailResult = await sendProjectInvitationEmail({
            email,
            recipientName,
            inviterDisplayName,
            projectName: project.name,
            invitationLink: acceptInvitationLink,
        });
    }

    // 7. Channel 2: In-app Notification
    let notification = null;
    const targetAccountId = recipient?.account_id || recipientAccountId;
    if (targetAccountId) {
        try {
            notification = await createNotificationServices({
                account_id: targetAccountId,
                message: `${inviterDisplayName} invited you to collaborate on "${project.name}".`,
                is_read: false,
                reference_table: 'projects',
                reference_prefix: 'PROJECT_INVITATION',
                reference_id: projectId,
                reference_path: editorProjectUrl,
            });

            try {
                getIo().to(String(targetAccountId)).emit('notification', notification);
            } catch (_socketErr) {
                // Sockets deliver best-effort; durable notification is already persisted
            }
        } catch (notifErr) {
            console.error('Failed to create in-app project invitation notification:', notifErr.message);
        }
    }

    // 8. Channel 3: Direct Inbox Message with embed button
    let chatMessage = null;
    if (targetAccountId && String(targetAccountId) !== String(inviterAccountId)) {
        try {
            const inbox = await createOrReuseDirectChatServices(
                { recipientId: targetAccountId },
                inviterAccountId
            );

            if (inbox?._id) {
                const messageContent = `[project-invite:${projectId}:${encodeURIComponent(project.name)}] You're invited to collaborate on the project "${project.name}".`;

                chatMessage = await createMessageServices(
                    {
                        conversation_id: String(inbox._id),
                        message_content: messageContent,
                        links: [editorProjectUrl],
                    },
                    inviterAccountId,
                    { suppressNotifications: true }
                );

                try {
                    getIo().to(String(inbox._id)).emit('newMessage', chatMessage);
                    getIo().to(String(targetAccountId)).emit('conversationMessageNotification', {
                        conversation_id: String(inbox._id),
                        message_content: messageContent,
                    });
                } catch (_socketErr) {
                    // Best-effort realtime emit
                }
            }
        } catch (chatErr) {
            console.error('Failed to send direct chat invitation message:', chatErr.message);
        }
    }

    return {
        success: true,
        message: `Invitation to "${project.name}" has been sent successfully.`,
        project: {
            id: project.project_id,
            name: project.name,
        },
        invitationLink: acceptInvitationLink,
        editorUrl: editorProjectUrl,
        channels: {
            email: Boolean(email),
            notification: Boolean(notification),
            chatMessage: Boolean(chatMessage),
        },
    };
}

async function acceptProjectInvitationService(token) {
    if (!token || typeof token !== 'string') {
        throw new InvitationServiceError('Invalid or missing invitation token', 400);
    }

    const tokenSecret = process.env.ACCESS_TOKEN_JWT_SECRET || 'ensemble-invitation-secret';
    let decoded;
    try {
        decoded = jwt.verify(token, tokenSecret);
    } catch (err) {
        throw new InvitationServiceError('Invitation token has expired or is invalid', 410);
    }

    // Check Redis verification
    const cached = await redisClient.get(`project-invitation:${token}`);
    if (!cached) {
        // Fallback: token valid by signature, but expired from Redis cache
        // If JWT hasn't expired yet, we still honor it or proceed safely
    }

    const { projectId, recipientUserId, role = 'Editor' } = decoded;

    // If recipient user ID is known, ensure their project membership is active
    if (recipientUserId) {
        await addOrReviveProjectMember(projectId, recipientUserId, role);
    }

    const editorBaseUrl = (process.env.EDITOR_URL || 'http://localhost:3000').replace(/\/$/, '');
    const redirectUrl = `${editorBaseUrl}/editor/${projectId}`;

    return {
        success: true,
        projectId,
        redirectUrl,
    };
}

module.exports = {
    InvitationServiceError,
    shareProjectInvitationService,
    acceptProjectInvitationService,
    sendProjectInvitationEmail,
    getProjectInvitationEmailHtml,
};