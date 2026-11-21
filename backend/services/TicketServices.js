const {
    createStaffTicketForAccount,
    createSupportTicket,
    assertCanFileAppeal,
    findRecentOpenTicketLike,
} = require('../repositories/AdminTicketsRepositories');
const { isValidTicketType, normalizeTicketType } = require('../lib/TicketEnums');
const { notifyCaseOpened } = require('./CaseServices');

/**
 * Limits for every ticket a member files. The member form and the appeal page
 * (frontend/src/pages/user/account/appeal/appealShared.ts) show the same numbers.
 */
const MEMBER_TICKET_LIMITS = Object.freeze({
    subject: 200,
    descriptionMin: 10,
    description: 5000,
    appealCaseId: 80,
    appealEvidence: 2000,
});

/** The same ticket filed again within this many minutes is treated as a double submit. */
const DUPLICATE_WINDOW_MINUTES = 10;

function memberTicketError(message, statusCode = 400, extra = {}) {
    const error = new Error(message);
    error.statusCode = statusCode;
    Object.assign(error, extra);
    return error;
}

function plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function assertMemberTicketText(subject, description) {
    const limits = MEMBER_TICKET_LIMITS;
    if (!subject) throw memberTicketError('Subject is required');
    if (subject.length > limits.subject) {
        throw memberTicketError(`Subject must be ${limits.subject} characters or less`);
    }
    if (!description) throw memberTicketError('Description is required');
    if (description.length < limits.descriptionMin) {
        throw memberTicketError(`Description must be at least ${limits.descriptionMin} characters`);
    }
    if (description.length > limits.description) {
        throw memberTicketError(`Description must be ${limits.description.toLocaleString('en-US')} characters or less`);
    }
}

/**
 * A member files a ticket on their own account (`POST /api/users/tickets`).
 * The server decides the requester, the priority (the type's default) and the contact email
 * (the account's own); the body only supplies the type, the text, the type's answers, files the
 * member uploaded, and browser context.
 */
async function createMemberTicket({ session, accountAccess, body: rawBody }) {
    const body = plainObject(rawBody);
    const requesterAccountId = session?.account_id || session?.accountId || null;
    if (!requesterAccountId) {
        throw memberTicketError('Authentication required to submit a ticket', 401);
    }

    const { APPEAL_TICKET_TYPE, appealTicketsOnly } = require('../lib/AccountRestriction');
    const requestedType = String(body.type || body.category || '').trim();
    let ticketType;
    // Banned, locked and suspended members may still appeal, and do nothing else here.
    if (appealTicketsOnly(accountAccess)) {
        if ((requestedType || APPEAL_TICKET_TYPE) !== APPEAL_TICKET_TYPE) {
            throw memberTicketError(
                accountAccess?.suspended
                    ? 'While your account is suspended you can only open an appeal ticket.'
                    : 'This account can only open an appeal ticket.',
                403,
                { code: accountAccess?.code || 'ACCOUNT_BANNED' }
            );
        }
        ticketType = APPEAL_TICKET_TYPE;
    } else {
        if (!isValidTicketType(requestedType)) throw memberTicketError('Pick a ticket type');
        ticketType = normalizeTicketType(requestedType);
    }
    const isAppeal = ticketType === APPEAL_TICKET_TYPE;

    // Each penalty is appealed on its own: the body names it as `appealTarget: { type, id }`.
    const appealTarget = isAppeal ? await assertCanFileAppeal(requesterAccountId, body.appealTarget) : null;

    const subject = String(body.reason || body.subject || '').trim();
    const description = String(body.description || '').trim();
    assertMemberTicketText(subject, description);

    const answers = plainObject(body.fields);
    if (isAppeal) {
        if (String(answers.case_id || '').trim().length > MEMBER_TICKET_LIMITS.appealCaseId) {
            throw memberTicketError(`Case ID must be ${MEMBER_TICKET_LIMITS.appealCaseId} characters or less`);
        }
        if (String(answers.evidence || '').trim().length > MEMBER_TICKET_LIMITS.appealEvidence) {
            throw memberTicketError('Supporting evidence must be 2,000 characters or less');
        }
    } else {
        // Appeals already allow one open ticket per penalty; this catches a double submit or a retry.
        const duplicate = await findRecentOpenTicketLike(
            requesterAccountId,
            ticketType,
            subject,
            DUPLICATE_WINDOW_MINUTES
        );
        if (duplicate) {
            throw memberTicketError(
                `You already filed this as ticket ${duplicate.number}. Add anything new on that ticket instead.`,
                409,
                { code: 'TICKET_DUPLICATE', data: { ticketId: duplicate.id, ticketNumber: duplicate.number } }
            );
        }
    }

    const clientContext = plainObject(body.context);
    const data = await createSupportTicket(
        {
            subject,
            reason: subject,
            type: ticketType,
            description,
            attachments: body.attachments,
            // Appeals always store the same three answers; "Case ID" is the penalty they name.
            fields: isAppeal
                ? {
                    case_id: appealTarget?.reference || String(answers.case_id || '').trim() || 'Not provided',
                    why_reverse: answers.why_reverse || description,
                    evidence: answers.evidence || '',
                }
                : answers,
            ...(appealTarget ? { appealTarget } : {}),
            context: {
                browser: clientContext.browser,
                device: clientContext.device,
                page: clientContext.page,
            },
            requesterAccountId,
        },
        session
    );

    await notifyCaseOpened({
        accountId: requesterAccountId,
        kind: 'ticket',
        id: data.ticket.id,
        number: data.ticket.number,
    });

    return {
        ticketId: data.ticket.id,
        ticketNumber: data.ticket.number,
        chatAvailable: data.chatAvailable,
    };
}

async function createStaffTicketService(payload, session) {
    return createStaffTicketForAccount(payload, session);
}

module.exports = {
    MEMBER_TICKET_LIMITS,
    createMemberTicket,
    createStaffTicketService,
};
