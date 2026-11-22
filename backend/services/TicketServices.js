const {
    createStaffTicketForAccount,
    createSupportTicket,
    assertCanFileAppeal,
    findRecentOpenTicketLike,
    listOpenTicketTypes,
    listOpenTicketsWithAnswers,
    listingAssetIdMap,
    accountIdsForHandles,
} = require('../repositories/AdminTicketsRepositories');
const redisClient = require('../lib/Redis');
const { isValidTicketType, normalizeTicketType, ticketCategoryOf } = require('../lib/TicketEnums');
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
    /** Open tickets a member may have per category (Account, Billing, Forum, Marketplace, …). */
    openPerCategory: 5,
});

/**
 * Account penalty appeals are already limited to one open appeal per penalty, and banned or
 * suspended members can file nothing else, so they neither count toward nor hit the category limit.
 */
const CATEGORY_LIMIT_EXEMPT_TYPES = new Set(['Appeal an account penalty']);

/** Open tickets per category for one member: `{ limit, open: { [category]: count } }`. */
async function getOpenTicketCountsByCategory(accountId) {
    const open = {};
    for (const storedType of await listOpenTicketTypes(accountId)) {
        const type = normalizeTicketType(storedType);
        if (CATEGORY_LIMIT_EXEMPT_TYPES.has(type)) continue;
        const category = ticketCategoryOf(type);
        if (category) open[category] = (open[category] || 0) + 1;
    }
    return { limit: MEMBER_TICKET_LIMITS.openPerCategory, open };
}

async function assertCategoryHasRoom(accountId, ticketType) {
    if (CATEGORY_LIMIT_EXEMPT_TYPES.has(ticketType)) return;
    const category = ticketCategoryOf(ticketType);
    if (!category) return;
    const { limit, open } = await getOpenTicketCountsByCategory(accountId);
    if ((open[category] || 0) >= limit) {
        throw memberTicketError(
            `You already have ${limit} open ${category} tickets. Add to one of them from Cases, or wait for one to close, before opening another.`,
            409,
            { code: 'TICKET_CATEGORY_LIMIT', data: { category, limit, open: open[category] || 0 } }
        );
    }
}

/** The same ticket filed again within this many minutes is treated as a double submit. */
const DUPLICATE_WINDOW_MINUTES = 10;

/* ------------------------------------------------------------------ */
/* One open ticket per record                                          */
/* ------------------------------------------------------------------ */

/** A uuid (listing, asset, contract, job, gig, team, project, transaction) or a forum id, in any answer. */
const RECORD_ID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|\b[0-9a-f]{24}\b/gi;
/** Report answers that name a person: reporting the same person again while a report is open. */
const REPORTED_PERSON_KEYS = new Set(['reported_username', 'seller_username', 'link_or_username']);
/** Payment references a member types: the same payment or payout in two tickets. */
const PAYMENT_REFERENCE_KEYS = new Set(['transaction_id', 'reference_id', 'payout_reference']);

function personKey(text) {
    const value = String(text || '').trim();
    const fromLink = value.match(/\/profile\/([A-Za-z0-9_.-]+)/i);
    const handle = (fromLink ? fromLink[1] : value.split(/\s+/)[0])
        .replace(/^@/, '')
        .replace(/[^A-Za-z0-9_.-]/g, '')
        .toLowerCase();
    return handle && handle.length <= 60 ? handle : null;
}

/** A typed reference or case number; "N/A", "none" or "unknown" (no digit) never counts. */
function plainKey(text) {
    const value = String(text || '').trim().replace(/^#/, '').toLowerCase().split(/\s+/)[0] || '';
    return value.length >= 4 && /\d/.test(value) ? value.slice(0, 120) : null;
}

function reportedHandle(answer) {
    if (!REPORTED_PERSON_KEYS.has(answer.key) || answer.id) return null;
    const value = String(answer.value || '');
    return value.match(RECORD_ID_PATTERN) ? null : personKey(value);
}

/**
 * What a ticket is about, as comparable keys: every record it names (picked, or an id inside a
 * pasted link), the person a report names (`people`: handle → account id, real accounts only),
 * the payment reference it quotes and the warning or report number an appeal gives. A listing
 * and its asset share one key (`assets`).
 */
function ticketRecordKeys(answers, assets, people) {
    const keys = new Set();
    const addId = (raw) => {
        const id = String(raw).toLowerCase();
        keys.add(`record:${assets.get(id) || id}`);
    };
    for (const answer of answers || []) {
        const value = String(answer.value || '');
        if (answer.id) addId(answer.id);
        const embedded = value.match(RECORD_ID_PATTERN) || [];
        embedded.forEach(addId);
        const handle = reportedHandle(answer);
        if (handle && people.has(handle)) keys.add(`person:${people.get(handle)}`);
        if (PAYMENT_REFERENCE_KEYS.has(answer.key) && !embedded.length) {
            const reference = plainKey(value);
            if (reference) keys.add(`payment:${reference}`);
        }
        if (answer.key === 'case_id' && !/^not provided$/i.test(value.trim())) {
            const caseNumber = plainKey(value);
            if (caseNumber) keys.add(`case:${caseNumber}`);
        }
    }
    return keys;
}

function idsInAnswers(answers) {
    return (answers || []).flatMap((answer) => [
        ...(answer.id ? [String(answer.id)] : []),
        ...(String(answer.value || '').match(RECORD_ID_PATTERN) || []),
    ]);
}

/**
 * A member keeps one open ticket per record: a second ticket about the same listing, purchase,
 * contract, job, gig, team, project, forum post, payment, reported person or case number is
 * refused with the ticket to add to instead. Penalty appeals have their own one-per-penalty rule.
 */
async function assertNoOpenTicketForSameRecord(accountId, ticketType, formAnswers) {
    if (CATEGORY_LIMIT_EXEMPT_TYPES.has(ticketType) || !formAnswers?.length) return;
    const open = (await listOpenTicketsWithAnswers(accountId))
        .filter((ticket) => normalizeTicketType(ticket.type) !== 'Appeal an account penalty');
    if (!open.length) return;
    const everyAnswer = [...formAnswers, ...open.flatMap((ticket) => ticket.answers)];
    const [assets, people] = await Promise.all([
        listingAssetIdMap(idsInAnswers(everyAnswer)),
        accountIdsForHandles(everyAnswer.map(reportedHandle).filter(Boolean)),
    ]);
    const wanted = ticketRecordKeys(formAnswers, assets, people);
    if (!wanted.size) return;
    const clash = open.find((ticket) => [...ticketRecordKeys(ticket.answers, assets, people)].some((key) => wanted.has(key)));
    if (!clash) return;
    throw memberTicketError(
        `You already have an open ticket about this (${clash.number}). Add what is new on that ticket instead of opening another.`,
        409,
        { code: 'TICKET_RECORD_OPEN', data: { ticketId: clash.id, ticketNumber: clash.number, type: clash.type } }
    );
}

/**
 * A report names someone else. The asset and posting pickers already refuse the member's own
 * items; this covers the typed username fields (reported user, seller, forum member).
 */
async function assertNotReportingSelf(accountId, formAnswers) {
    const ownId = String(accountId).toLowerCase();
    const refuse = () => memberTicketError('You cannot report your own account.', 400, { code: 'TICKET_SELF_REPORT' });
    // A pasted profile link carries the account id.
    const pastedSelf = (formAnswers || []).some((answer) =>
        REPORTED_PERSON_KEYS.has(answer.key)
        && (String(answer.value || '').match(RECORD_ID_PATTERN) || []).some((id) => id.toLowerCase() === ownId)
    );
    if (pastedSelf) throw refuse();
    const handles = (formAnswers || []).map(reportedHandle).filter(Boolean);
    if (!handles.length) return;
    const people = await accountIdsForHandles(handles);
    if (handles.some((handle) => String(people.get(handle) || '').toLowerCase() === ownId)) throw refuse();
}

/* ------------------------------------------------------------------ */
/* One submit at a time per member                                     */
/* ------------------------------------------------------------------ */

const INTAKE_LOCK_TTL_MS = 30 * 1000;
const INTAKE_LOCK_WAIT_MS = 10 * 1000;

/**
 * Serializes a member's ticket submits, so two at once (a double click, two tabs, a script) cannot
 * both pass the duplicate, same-record and category checks. A second submit waits for the first,
 * then sees its ticket. A Redis outage never blocks filing, as with the rate limiter.
 */
async function withTicketIntakeLock(accountId, work) {
    const key = `ticket-intake:${accountId}`;
    const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const deadline = Date.now() + INTAKE_LOCK_WAIT_MS;
    let held = false;
    for (;;) {
        try {
            const result = await redisClient.set(key, token, { NX: true, PX: INTAKE_LOCK_TTL_MS });
            held = result !== null && result !== undefined;
        } catch (err) {
            console.warn('Ticket intake lock unavailable, continuing without it:', err.message);
            return work();
        }
        if (held) break;
        if (Date.now() >= deadline) {
            throw memberTicketError(
                'Your last ticket is still being submitted. Check Cases in a moment before trying again.',
                409,
                { code: 'TICKET_SUBMIT_IN_PROGRESS' }
            );
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    try {
        return await work();
    } finally {
        try {
            if ((await redisClient.get(key)) === token) await redisClient.del(key);
        } catch {
            // The lock expires on its own.
        }
    }
}

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
    }

    const clientContext = plainObject(body.context);
    // Checks and insert run under the member's intake lock, so parallel submits cannot all pass.
    const data = await withTicketIntakeLock(requesterAccountId, async () => {
        if (!isAppeal) {
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
            await assertCategoryHasRoom(requesterAccountId, ticketType);
        }
        return createSupportTicket(
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
                // After the picked records are resolved: one open ticket per record.
                beforeInsert: isAppeal
                    ? undefined
                    : async ({ formAnswers }) => {
                        await assertNotReportingSelf(requesterAccountId, formAnswers);
                        await assertNoOpenTicketForSameRecord(requesterAccountId, ticketType, formAnswers);
                    },
            },
            session
        );
    });

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
    getOpenTicketCountsByCategory,
    createStaffTicketService,
};
