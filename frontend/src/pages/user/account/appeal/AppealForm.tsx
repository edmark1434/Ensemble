import { FormEvent, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { formatStandingWhen } from '@/lib/standing';
import { APPEAL_LIMITS, APPEAL_TICKET_TYPE, type AppealablePenalty, appealCopyFor, errorMessage } from './appealShared';
import { ATTACHMENT_HINT, AttachButton, PendingFileList, uploadPendingFiles, usePendingFiles } from './appealAttachments';

const inputClass =
  'mt-1.5 w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-dark-base dark:text-white dark:placeholder:text-zinc-600';

function fieldBorder(hasError: boolean) {
  return hasError ? 'border-red-500/70' : 'border-gray-200 dark:border-white/10';
}

type Errors = Partial<Record<'description', string>>;

/**
 * The appeal for one penalty. Each penalty has its own appeal: the ticket names it, and the
 * decision only changes that penalty.
 */
export default function AppealForm({
  penalty,
  onCancel,
  onSubmitted,
}: {
  penalty: AppealablePenalty;
  /** Back to the list of penalties (hidden when this is the only one). */
  onCancel?: () => void;
  onSubmitted: (ticketId: string | null) => void | Promise<void>;
}) {
  const copy = appealCopyFor(penalty.type);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const evidenceFiles = usePendingFiles();

  function validate(): Errors {
    const text = description.trim();
    if (!text) return { description: 'Tell staff what happened.' };
    if (text.length < APPEAL_LIMITS.descriptionMin) {
      return { description: `Write at least ${APPEAL_LIMITS.descriptionMin} characters.` };
    }
    return {};
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const why = description.trim();
    setSubmitting(true);
    try {
      const attachments = await uploadPendingFiles(evidenceFiles.files, 'ticket-attachments');
      const res = await api.post('/api/users/tickets', {
        subject: subject.trim() || `${copy.subjectPlaceholder} · ${penalty.label}`.slice(0, APPEAL_LIMITS.subject),
        description: why,
        type: APPEAL_TICKET_TYPE,
        category: APPEAL_TICKET_TYPE,
        // The one penalty this appeal is about; the server checks it is active and appealable.
        appealTarget: { type: penalty.type, id: penalty.id },
        fields: {
          why_reverse: why,
          evidence: evidence.trim(),
        },
        ...(attachments.length ? { attachments } : {}),
      });
      setSubject('');
      setDescription('');
      setEvidence('');
      evidenceFiles.clear();
      showSuccessToast('Appeal submitted. Staff will reply on the ticket.');
      await onSubmitted((res.data?.data?.ticketId as string | undefined) || null);
    } catch (err) {
      showErrorToast(errorMessage(err, err instanceof Error && err.message ? err.message : 'Could not submit the appeal.'));
    } finally {
      setSubmitting(false);
    }
  }

  const descriptionLength = description.trim().length;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-gray-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All penalties
          </button>
        ) : null}
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{copy.formTitle}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{copy.outcome}</p>
      </div>

      {/* The penalty this appeal is about. */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">You are appealing</p>
        <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
          {penalty.label}
          {penalty.number ? <span className="font-normal text-gray-500 dark:text-zinc-400"> · {penalty.number}</span> : null}
        </p>
        {penalty.detail ? <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{penalty.detail}</p> : null}
        {penalty.reason ? (
          <p className="mt-1 text-xs text-gray-600 dark:text-zinc-300">
            <span className="font-semibold">Reason given:</span> {penalty.reason}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
          {[
            penalty.startedAt ? `Since ${formatStandingWhen(penalty.startedAt)}` : null,
            penalty.endsAt ? `ends ${formatStandingWhen(penalty.endsAt)}` : 'no end date',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
        Subject <span className="font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={APPEAL_LIMITS.subject}
          placeholder={copy.subjectPlaceholder}
          className={`${inputClass} ${fieldBorder(false)}`}
        />
      </label>

      <div>
        <label htmlFor="appeal-description" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
          What happened, and why should it be reversed?
        </label>
        <textarea
          id="appeal-description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (errors.description) setErrors({});
          }}
          maxLength={APPEAL_LIMITS.description}
          rows={6}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="appeal-description-hint"
          placeholder="Explain in your own words. Staff read your account record before deciding."
          className={`${inputClass} ${fieldBorder(Boolean(errors.description))} resize-y`}
        />
        <div id="appeal-description-hint" className="mt-1 flex items-center justify-between gap-3 text-xs">
          <span className="text-red-500">{errors.description || ''}</span>
          <span className="shrink-0 tabular-nums text-gray-400 dark:text-zinc-500">
            {descriptionLength.toLocaleString()} / {APPEAL_LIMITS.description.toLocaleString()}
          </span>
        </div>
      </div>

      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
        Supporting evidence <span className="font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
        <textarea
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          maxLength={APPEAL_LIMITS.evidence}
          rows={3}
          placeholder="Links, contract or order numbers, anything staff should check."
          className={`${inputClass} ${fieldBorder(false)} resize-y`}
        />
      </label>

      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            Images and files <span className="font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
          </span>
          <AttachButton
            onPick={evidenceFiles.add}
            disabled={submitting}
            count={evidenceFiles.files.length}
            className="-my-1.5 -mr-1.5"
          />
        </div>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          Screenshots, receipts or documents that support your appeal. {ATTACHMENT_HINT}
        </p>
        {evidenceFiles.files.length ? (
          <div className="mt-2">
            <PendingFileList files={evidenceFiles.files} onRemove={evidenceFiles.remove} disabled={submitting} />
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Submitting…' : 'Submit appeal'}
      </button>
      <p className="text-xs text-gray-400 dark:text-zinc-500">
        This appeal is about this {copy.noun} only. Each penalty on your account has its own appeal, and a decision on one does not
        change the others. If this one is denied, you can appeal it again after 12 months.
      </p>
    </form>
  );
}
