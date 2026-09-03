const redisClient = require('../lib/Redis');
const { ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');
const { generateOnboardingAvatarUploadUrl } = require('./FileServices');
const { getAllSurveysRepositoriesBySurveyName } = require('../repositories/SurveyRepositories');
const { getOnboardingCompletion, persistCompletedOnboarding, getReferencedOnboardingAvatarPaths } = require('../repositories/OnboardingRepositories');

const ONBOARDING_TTL_SECONDS = 60 * 60 * 24 * 30;
const AVATAR_CLEANUP_CURSOR_KEY = 'onboarding:avatar-cleanup-cursor';
const DEFAULT_STEP = 'avatar';
const STEP_PATHS = {
    avatar: '/setup/upload-image',
    survey_1: '/setup/survey',
    survey_2: '/setup/survey',
};
const PURPOSE_MAP = {
    'Explore / Learn': 'Casual',
    'Look for Service / Hire': 'Client',
    'Earn / Find Work': 'Freelancer',
};

class OnboardingError extends Error {
    constructor(message, statusCode = 400, code = 'ONBOARDING_ERROR') {
        super(message);
        this.name = 'OnboardingError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

const stateKey = (userId) => `onboarding:${userId}`;

async function readState(userId) {
    const raw = await redisClient.get(stateKey(userId));
    if (!raw) return { current_step: DEFAULT_STEP, data: {}, updated_at: new Date().toISOString() };
    try {
        const parsed = JSON.parse(raw);
        const data = { ...(parsed.data || {}) };
        const isLegacyPersonalState = parsed.current_step === 'personal_details' || Boolean(data.personal_details);
        delete data.personal_details;
        const requestedStep = parsed.current_step === 'personal_details' ? DEFAULT_STEP : parsed.current_step;
        const currentStep = STEP_PATHS[requestedStep] ? requestedStep : DEFAULT_STEP;
        const state = { current_step: currentStep, data, updated_at: parsed.updated_at || new Date().toISOString() };
        if (isLegacyPersonalState) return writeState(userId, state);
        return state;
    } catch (error) {
        if (error instanceof OnboardingError) throw error;
        throw new OnboardingError('Onboarding progress is unavailable.', 500, 'INVALID_ONBOARDING_STATE');
    }
}

async function writeState(userId, state) {
    const next = { ...state, updated_at: new Date().toISOString() };
    await redisClient.set(stateKey(userId), JSON.stringify(next), { EX: ONBOARDING_TTL_SECONDS });
    return next;
}

async function getOnboardingState(userId) {
    const completed = (await getOnboardingCompletion(userId)) === 'completed';
    if (completed) {
        await redisClient.del(stateKey(userId));
        return { completed: true, current_step: null, path: '/home', data: {} };
    }
    const state = await readState(userId);
    const restoredData = { ...state.data };
    delete restoredData.pending_avatar_upload;
    return { completed: false, ...state, data: restoredData, path: STEP_PATHS[state.current_step] || STEP_PATHS[DEFAULT_STEP] };
}

async function issueAvatarUpload(userId, input = {}) {
    const state = await readState(userId);
    const draft = state.data.avatar;
    if (draft?.type !== 'custom' || draft.path) throw new OnboardingError('A custom avatar draft is required.', 409, 'ONBOARDING_STEP_REQUIRED');
    const name = String(input.filename || '').trim();
    const mimeType = String(input.contentType || '').trim().toLowerCase();
    const sizeBytes = Number(input.sizeBytes);
    if (!name || name !== draft.name || mimeType !== draft.mime_type || sizeBytes !== draft.size_bytes || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 5 * 1024 * 1024) {
        throw new OnboardingError('Uploaded avatar metadata is invalid.', 422, 'INVALID_AVATAR');
    }
    let result;
    try { result = await generateOnboardingAvatarUploadUrl(userId, name, mimeType); }
    catch { throw new OnboardingError('Unable to prepare avatar upload.', 422, 'INVALID_AVATAR'); }
    state.data.pending_avatar_upload = { name, path: result.key, mime_type: mimeType, size_bytes: sizeBytes };
    await writeState(userId, state);
    return { uploadUrl: result.uploadUrl, key: result.key, expiresIn: result.expiresIn, maxFileSize: result.maxFileSize };
}

function validateAvatar(input = {}) {
    if (input.type === 'preset') {
        const fileId = String(input.fileId || '').trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId)) throw new OnboardingError('Select a valid avatar.', 422, 'INVALID_AVATAR');
        return { type: 'preset', fileId };
    }
    if (input.type === 'custom') {
        const name = String(input.name || '').trim();
        const path = String(input.path || '').trim();
        const draftId = String(input.draft_id || '').trim();
        const mimeType = String(input.mime_type || '').trim().toLowerCase();
        const sizeBytes = Number(input.size_bytes);
        const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif']);
        const validDraft = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId);
        const validPath = !path || (path.startsWith('profile/onboarding/') && !path.includes('..'));
        if (!name || name.length > 255 || !validDraft || !validPath || !allowed.has(mimeType) || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 5 * 1024 * 1024) {
            throw new OnboardingError('Uploaded avatar metadata is invalid.', 422, 'INVALID_AVATAR');
        }
        return { type: 'custom', draft_id: draftId, name, ...(path ? { path } : {}), mime_type: mimeType, size_bytes: sizeBytes };
    }
    throw new OnboardingError('Select or upload an avatar.', 422, 'INVALID_AVATAR');
}

async function saveAvatar(userId, input) {
    const state = await readState(userId);
    const avatar = validateAvatar(input);
    if (avatar.type === 'custom' && avatar.path) {
        const issued = state.data.pending_avatar_upload;
        if (!issued || issued.path !== avatar.path || issued.name !== avatar.name || issued.mime_type !== avatar.mime_type || issued.size_bytes !== avatar.size_bytes) {
            throw new OnboardingError('This avatar upload was not issued for your onboarding session.', 403, 'INVALID_AVATAR_OWNER');
        }
    }
    state.data.avatar = avatar;
    delete state.data.pending_avatar_upload;
    state.current_step = 'survey_1';
    return writeState(userId, state);
}

async function finalizeAvatarUpload(userId, input) {
    const state = await readState(userId);
    const current = state.data.avatar;
    const finalized = validateAvatar(input);
    const issued = state.data.pending_avatar_upload;
    if (current?.type !== 'custom' || finalized.type !== 'custom' || current.draft_id !== finalized.draft_id
        || current.name !== finalized.name || current.mime_type !== finalized.mime_type || current.size_bytes !== finalized.size_bytes
        || !issued || issued.path !== finalized.path) {
        throw new OnboardingError('This avatar upload was not issued for your onboarding session.', 403, 'INVALID_AVATAR_OWNER');
    }
    state.data.avatar = finalized;
    delete state.data.pending_avatar_upload;
    return writeState(userId, state);
}

async function validateSurvey(input, requiredSection = 'all') {
    const catalog = await getAllSurveysRepositoriesBySurveyName('User Onboarding Survey');
    if (!catalog || input?.survey_id !== catalog.survey_id || !Array.isArray(input.responses)) throw new OnboardingError('Invalid onboarding survey.', 422, 'INVALID_SURVEY');
    const questions = catalog.questions.filter((q) => requiredSection === 'first' ? q.display_order <= 2 : true);
    const responseMap = new Map();
    const normalized = [];
    for (const response of input.responses) {
        const question = catalog.questions.find((q) => q.question_id === response.question_id);
        const option = question?.options.find((o) => o.option_id === response.option_id);
        if (!question || !option) throw new OnboardingError('Survey response contains an invalid option.', 422, 'INVALID_SURVEY_RESPONSE');
        responseMap.set(question.question_id, true);
        normalized.push({
            question_id: question.question_id,
            option_id: option.option_id,
            response_text: response.response_text || null,
            purpose: question.question_text === 'What is your purpose on the platform?' ? PURPOSE_MAP[option.option_text] : null,
        });
    }
    if (questions.some((q) => q.is_required && !responseMap.has(q.question_id))) throw new OnboardingError('Complete all required survey questions.', 422, 'INCOMPLETE_SURVEY');
    return { survey_id: catalog.survey_id, responses: normalized };
}

async function saveSurveyProgress(userId, input) {
    const state = await readState(userId);
    if (!state.data.avatar) throw new OnboardingError('Complete the avatar step first.', 409, 'ONBOARDING_STEP_REQUIRED');
    const survey = await validateSurvey(input, 'first');
    state.data.survey = survey;
    state.current_step = 'survey_2';
    return writeState(userId, state);
}

async function setCurrentStep(userId, requestedStep) {
    const state = await readState(userId);
    const step = String(requestedStep || '');
    const allowed = step === 'avatar'
        || (step === 'survey_1' && state.data.avatar)
        || (step === 'survey_2' && state.data.survey);
    if (!allowed) throw new OnboardingError('That onboarding step is not available yet.', 409, 'ONBOARDING_STEP_REQUIRED');
    state.current_step = step;
    return writeState(userId, state);
}

async function completeOnboarding(userId, accountId, input) {
    const state = await readState(userId);
    if (!state.data.avatar) throw new OnboardingError('Required onboarding steps are incomplete.', 409, 'ONBOARDING_INCOMPLETE');
    if (state.data.avatar.type === 'custom' && !state.data.avatar.path) throw new OnboardingError('Upload the custom avatar before completing onboarding.', 409, 'AVATAR_UPLOAD_REQUIRED');
    state.data.survey = await validateSurvey(input, 'all');
    state.current_step = 'survey_2';
    await writeState(userId, state);
    await persistCompletedOnboarding(userId, accountId, state.data);
    await redisClient.del(stateKey(userId));
    return { completed: true, current_step: null, path: '/home' };
}

async function cleanupExpiredOnboardingAvatars() {
    const cutoff = Date.now() - ONBOARDING_TTL_SECONDS * 1000;
    const startAfter = await redisClient.get(AVATAR_CLEANUP_CURSOR_KEY);
    const listed = await s3.send(new ListObjectsV2Command({
        Bucket: process.env.AWS_BUCKET_NAME,
        Prefix: 'profile/onboarding/',
        MaxKeys: 500,
        ...(startAfter ? { StartAfter: startAfter } : {}),
    }));
    const lastKey = listed.Contents?.at(-1)?.Key;
    if (listed.IsTruncated && lastKey) {
        await redisClient.set(AVATAR_CLEANUP_CURSOR_KEY, lastKey, { EX: ONBOARDING_TTL_SECONDS });
    } else {
        await redisClient.del(AVATAR_CLEANUP_CURSOR_KEY);
    }
    const expired = (listed.Contents || []).filter((item) => item.Key && item.LastModified && item.LastModified.getTime() < cutoff);
    if (!expired.length) return { scanned: listed.KeyCount || 0, deleted: 0 };
    const referenced = await getReferencedOnboardingAvatarPaths(expired.map((item) => item.Key));
    const removable = expired.filter((item) => !referenced.has(item.Key));
    if (removable.length) {
        await s3.send(new DeleteObjectsCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Delete: { Objects: removable.map((item) => ({ Key: item.Key })), Quiet: true },
        }));
    }
    return { scanned: listed.KeyCount || 0, deleted: removable.length };
}

module.exports = { OnboardingError, getOnboardingState, issueAvatarUpload, saveAvatar, finalizeAvatarUpload, saveSurveyProgress, setCurrentStep, completeOnboarding, cleanupExpiredOnboardingAvatars, stateKey };
