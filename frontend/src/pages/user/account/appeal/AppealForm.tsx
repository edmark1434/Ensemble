import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { APPEAL_LIMITS, APPEAL_TICKET_TYPE, errorMessage } from './appealShared';
import { ATTACHMENT_HINT, AttachButton, PendingFileList, uploadPendingFiles, usePendingFiles } from './appealAttachments';

const inputClass =
  'mt-1.5 w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-dark-base dark:text-white dark:placeholder:text-zinc-600';

function fieldBorder(hasError: boolean) {
  return hasError ? 'border-red-500/70' : 'border-gray-200 dark:border-white/10';
}

type Errors = Partial<Record<'description', string>>;

export default function AppealForm({
  title,
  subjectPlaceholder,
  outcome,
  onSubmitted,
}: {
  title: string;
  subjectPlaceholder: string;
  outcome: string;
  onSubmitted: (ticketId: string | null) => void | Promise<void>;
}) {
  const [subject, setSubject] = useState('');
  const [caseId, setCaseId] = useState('');
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
        subject: subject.trim() || subjectPlaceholder,
        description: why,
        type: APPEAL_TICKET_TYPE,
        category: APPEAL_TICKET_TYPE,
        fields: {
          case_id: caseId.trim() || 'Not provided',
          why_reverse: why,
          evidence: evidence.trim(),
        },
        ...(attachments.length ? { attachments } : {}),
      });
      setSubject('');
      setCaseId('');
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
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{outcome}</p>
      </div>

      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
        Subject <span className="font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={APPEAL_LIMITS.subject}
          placeholder={subjectPlaceholder}
          className={`${inputClass} ${fieldBorder(false)}`}
        />
      </label>

      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
        Case ID <span className="font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
        <input
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
          maxLength={APPEAL_LIMITS.caseId}
          placeholder="e.g. the number on a warning in your account record"
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
        You can have one open appeal at a time. If it is denied, you can appeal again after 12 months, or sooner if a new penalty is issued.
      </p>
    </form>
  );
}
