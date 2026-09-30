import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import api from '@/lib/axios';
import { UserOverviewModal } from './components/AccountModals';
import type { PlatformUserAccount } from './userTeamTypes';

type SurveyResponse = {
  user_id: string;
  account_id: string;
  email_address: string;
  handle: string;
  display_name: string;
  first_name: string;
  last_name: string;
  question_text: string;
  option_text: string;
  option_value_text: string;
  created_at: string;
};

export default function SurveyResponsesTab({ refreshToken }: { refreshToken: number }) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // For clicking a row to show the user profile
  const [selectedUser, setSelectedUser] = useState<PlatformUserAccount | null>(null);
  const [usersCache, setUsersCache] = useState<PlatformUserAccount[] | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchResponses = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/admin/survey-responses');
        if (mounted && res.data.success) {
          const data = res.data.data;
          setResponses(data);
          
          const uniqueQs = Array.from(new Set(data.map((r: SurveyResponse) => r.question_text)));
          if (uniqueQs.length > 0 && !selectedQuestion) {
            setSelectedQuestion(uniqueQs[0] as string);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.message || 'Failed to load survey responses');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchResponses();
    return () => {
      mounted = false;
    };
  }, [refreshToken]);

  // Derived data
  const uniqueQuestions = useMemo(() => {
    return Array.from(new Set(responses.map(r => r.question_text))).filter(Boolean);
  }, [responses]);

  const filteredResponses = useMemo(() => {
    let filtered = responses.filter(r => r.question_text === selectedQuestion);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.first_name?.toLowerCase().includes(q) ||
        r.last_name?.toLowerCase().includes(q) ||
        r.display_name?.toLowerCase().includes(q) ||
        r.email_address?.toLowerCase().includes(q) ||
        r.handle?.toLowerCase().includes(q) ||
        r.option_text?.toLowerCase().includes(q) ||
        r.option_value_text?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [responses, selectedQuestion, searchQuery]);

  const summary = useMemo(() => {
    // We base the summary ONLY on the question, ignoring the search filter 
    // so the stats don't change wildly when searching for a specific user.
    const allForQuestion = responses.filter(r => r.question_text === selectedQuestion);
    return allForQuestion.reduce((acc, curr) => {
      const answer = curr.option_text || curr.option_value_text || 'Unknown';
      acc[answer] = (acc[answer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [responses, selectedQuestion]);

  const totalAnswers = responses.filter(r => r.question_text === selectedQuestion).length;

  const handleRowClick = async (accountId: string) => {
    setLoadingUser(true);
    try {
      let currentUsers = usersCache;
      if (!currentUsers) {
        // Fetch users to populate modal if we haven't already
        const res = await api.get('/api/admin/users-management');
        if (res.data.success) {
          currentUsers = res.data.data;
          setUsersCache(currentUsers);
        }
      }
      const found = currentUsers?.find(u => u.accountId === accountId);
      if (found) {
        setSelectedUser(found);
      }
    } catch (err) {
      console.error('Failed to load user profile for modal:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-500">Loading survey responses…</p>;
  }

  if (error) {
    return <p className="py-12 text-center text-sm text-rose-500">{error}</p>;
  }

  if (!responses.length) {
    return <p className="py-12 text-center text-sm text-zinc-500">No survey responses found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs for Questions */}
      <div className="flex gap-4 overflow-x-auto border-b border-white/[0.08] pb-0">
        {uniqueQuestions.map(q => (
          <button
            key={q as string}
            onClick={() => setSelectedQuestion(q as string)}
            className={`whitespace-nowrap border-b-2 px-2 py-3 text-sm font-medium transition-colors ${
              selectedQuestion === q
                ? 'border-rose-400 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {q as string}
          </button>
        ))}
      </div>

      {/* Summary Cards with Visual Bars */}
      {totalAnswers > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Object.entries(summary)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .map(([answer, count]) => {
              const percentage = Math.round((count / totalAnswers) * 100);
              return (
                <div
                  key={answer}
                  className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-[#0c0d12] p-4"
                >
                  <span className="truncate text-xs font-medium text-zinc-400" title={answer}>
                    {answer}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {count}{' '}
                    <span className="text-sm font-normal text-zinc-500">
                      ({percentage}%)
                    </span>
                  </span>
                  {/* Progress Bar */}
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Table Section with Search */}
      <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d12]">
        <div className="flex items-center gap-3 border-b border-white/[0.04] p-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, email, or answer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 transition-colors focus:border-rose-500/50 focus:bg-white/[0.04] focus:outline-none"
            />
          </div>
          {loadingUser && <span className="text-xs text-zinc-500">Loading user profile...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.01]">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-400">User</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Email</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Response</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredResponses.map((resp, i) => (
                <tr 
                  key={`${resp.user_id}-${i}`} 
                  onClick={() => handleRowClick(resp.account_id)}
                  className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="font-medium text-white">
                      {resp.display_name ||
                        [resp.first_name, resp.last_name].filter(Boolean).join(' ') ||
                        'User'}
                    </div>
                    <div className="text-xs text-zinc-500">@{resp.handle}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                    {resp.email_address}
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-400">
                    {resp.option_text || resp.option_value_text}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {new Date(resp.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredResponses.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    {searchQuery ? 'No responses match your search.' : 'No responses for this question yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <UserOverviewModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          // If you want to enable Credits or Verification buttons here, you can pass handlers.
          // For now, it's just a view-only modal overview.
        />
      )}
    </div>
  );
}
