import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CASE_CONVERSATION_EVENT } from '@/components/ui/chat_bubble/chat_state';
import { CASES_PATH, casePath } from '@/lib/cases';
import { APPEAL_PATH, isAppealLimitedMember } from '@/lib/appealAccess';
import useGlobalState from '@/lib/global_state';

type CaseConversationDetail = {
  kind: 'ticket' | 'dispute';
  id: string | null;
  conversationId: string;
};

/**
 * Tickets and disputes are not chats. When an old notification, a bookmarked inbox link or a
 * stray chat window opens one, the chat store refuses it (`memberCaseTarget`) and this sends
 * the member to the case in Cases instead (the appeal page for banned and locked members).
 */
export function CaseConversationRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const onCase = (event: Event) => {
      const detail = (event as CustomEvent<CaseConversationDetail>).detail;
      if (!detail) return;
      const user = useGlobalState.getState().user;
      const base = isAppealLimitedMember(user) ? APPEAL_PATH : CASES_PATH;
      const target = detail.id
        ? base === CASES_PATH
          ? casePath(detail.kind, detail.id)
          : `${APPEAL_PATH}?${detail.kind}=${encodeURIComponent(detail.id)}`
        : `${base}?conversation=${encodeURIComponent(detail.conversationId)}`;
      navigate(target, { replace: window.location.pathname.startsWith('/inbox') });
    };
    window.addEventListener(CASE_CONVERSATION_EVENT, onCase);
    return () => window.removeEventListener(CASE_CONVERSATION_EVENT, onCase);
  }, [navigate]);

  return null;
}
