import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Share2,
  Video,
  Users,
  MessageSquare,
  Search,
  Sparkles,
  GraduationCap,
  BookOpen,
  Briefcase,
  Laptop,
  Clock,
  Building2,
  Compass,
  UserCheck,
  Coins,
} from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid";
import api from "@/lib/axios";
import { deleteAvatarDraft, getAvatarDraft } from "@/lib/onboardingAvatarDraft";
import useGlobalState from "@/lib/global_state";
import { notifyOnboardingCompleted, notifyOnboardingStepChanged } from "@/lib/onboardingEvents";
import GlideSelect, { type GlideSelectOption } from "@/components/ui/GlideSelect";

function getOptionIcon(val: string): React.ReactNode {
  const v = val.toLowerCase();
  if (v.includes('social')) return <Share2 className="h-4 w-4" />;
  if (v.includes('youtube') || v.includes('video')) return <Video className="h-4 w-4" />;
  if (v.includes('friend') || v.includes('colleague')) return <Users className="h-4 w-4" />;
  if (v.includes('community') || v.includes('reddit') || v.includes('discord')) return <MessageSquare className="h-4 w-4" />;
  if (v.includes('search') || v.includes('google')) return <Search className="h-4 w-4" />;
  if (v.includes('other')) return <Sparkles className="h-4 w-4" />;

  if (v.includes('student_employed')) return <GraduationCap className="h-4 w-4" />;
  if (v.includes('student')) return <BookOpen className="h-4 w-4" />;
  if (v.includes('freelance')) return <Laptop className="h-4 w-4" />;
  if (v.includes('part_time')) return <Clock className="h-4 w-4" />;
  if (v.includes('business') || v.includes('owner')) return <Building2 className="h-4 w-4" />;
  if (v.includes('not_working')) return <Compass className="h-4 w-4" />;
  if (v.includes('employed') || v.includes('pro')) return <Briefcase className="h-4 w-4" />;

  return <Sparkles className="h-4 w-4" />;
}

function getPurposeIcon(val: string): React.ReactNode {
  const v = val.toLowerCase();
  if (v.includes('earn')) return <Coins className="h-5 w-5" />;
  if (v.includes('hire') || v.includes('service')) return <UserCheck className="h-5 w-5" />;
  if (v.includes('explore') || v.includes('learn')) return <Compass className="h-5 w-5" />;
  return <Sparkles className="h-5 w-5" />;
}

// Types
interface Option {
  option_id: string;
  option_text: string;
  option_value: string;
  display_order: number;
}

interface Question {
  question_id: string;
  question_text: string;
  question_type: 'dropdown' | 'multi-select' | 'text';
  is_required: boolean;
  display_order: number;
  options: Option[];
}

interface SurveyData {
  survey_id: string;
  survey_name: string;
  description: string;
  questions: Question[];
}

const FALLBACK_SURVEY_DATA: SurveyData = {
  survey_id: "11111111-1111-1111-1111-111111111111",
  survey_name: "User Onboarding Survey",
  description: "Initial survey for new users during account setup",
  questions: [
    {
      question_id: "22222222-2222-2222-2222-222222222222",
      question_text: "Where did you hear about us?",
      question_type: "dropdown",
      is_required: true,
      display_order: 1,
      options: [
        { option_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", option_text: "Social Media (Facebook/X/IG)", option_value: "social_media", display_order: 1 },
        { option_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", option_text: "YouTube Video / Ad", option_value: "youtube", display_order: 2 },
        { option_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", option_text: "Friend / Colleague Recommendation", option_value: "friend_recommendation", display_order: 3 },
        { option_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", option_text: "Online Community (Reddit/Discord)", option_value: "online_community", display_order: 4 },
        { option_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", option_text: "Search Engine (Google)", option_value: "search_engine", display_order: 5 },
        { option_id: "ffffffff-ffff-ffff-ffff-ffffffffffff", option_text: "Other", option_value: "other", display_order: 6 },
      ],
    },
    {
      question_id: "33333333-3333-3333-3333-333333333333",
      question_text: "What is your nature of work?",
      question_type: "dropdown",
      is_required: true,
      display_order: 2,
      options: [
        { option_id: "11111111-1111-1111-1111-aaaaaaaaaaaa", option_text: "Student (Employed)", option_value: "student_employed", display_order: 1 },
        { option_id: "22222222-2222-2222-2222-bbbbbbbbbbbb", option_text: "Student (Unemployed)", option_value: "student_unemployed", display_order: 2 },
        { option_id: "33333333-3333-3333-3333-cccccccccccc", option_text: "Full-time Employee", option_value: "pro_employed", display_order: 3 },
        { option_id: "44444444-4444-4444-4444-dddddddddddd", option_text: "Full-time Freelancer", option_value: "pro_freelance", display_order: 4 },
        { option_id: "55555555-5555-5555-5555-eeeeeeeeeeee", option_text: "Part-time Employee", option_value: "part_time_employed", display_order: 5 },
        { option_id: "66666666-6666-6666-6666-ffffffffffff", option_text: "Business Owner / Entrepreneur", option_value: "business_owner", display_order: 6 },
        { option_id: "77777777-7777-7777-7777-aaaaaaaaaaaa", option_text: "Not Working / Looking for Work", option_value: "not_working", display_order: 7 },
      ],
    },
    {
      question_id: "44444444-4444-4444-4444-444444444444",
      question_text: "What is your purpose on the platform?",
      question_type: "multi-select",
      is_required: true,
      display_order: 3,
      options: [
        { option_id: "88888888-8888-8888-8888-aaaaaaaaaaaa", option_text: "Earn / Find Work", option_value: "earn", display_order: 1 },
        { option_id: "99999999-9999-9999-9999-bbbbbbbbbbbb", option_text: "Look for Service / Hire", option_value: "hire", display_order: 2 },
        { option_id: "aaaaaaaa-aaaa-aaaa-aaaa-cccccccccccc", option_text: "Explore / Learn", option_value: "explore", display_order: 3 },
      ],
    },
  ],
};

function getApiErrorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    .response?.data?.message;
  return typeof message === 'string' ? message : null;
}

export default function Survey() {
  const storeTheme = useGlobalState((state) => state.theme);
  const searchTheme = new URLSearchParams(window.location.search).get('theme') as 'light' | 'dark' | null;
  const theme = searchTheme || storeTheme || 'dark';
  const isDark = theme === 'dark';

  const T = {
    bg: isDark ? "#0f0f11" : "#f8fafc",
    bgCard: isDark ? "rgba(18, 18, 20, 0.88)" : "rgba(255, 255, 255, 0.96)",
    bgInput: isDark ? "#18181b" : "#ffffff",
    border: isDark ? "#27272a" : "#e2e8f0",
    borderFoc: isDark ? "#52525b" : "#0f172a",
    accent: isDark ? "#f4f4f5" : "#0f172a",
    text: isDark ? "#f4f4f5" : "#0f172a",
    muted: isDark ? "#a1a1aa" : "#64748b",
    dim: isDark ? "#52525b" : "#94a3b8",
    error: "#ef4444",
    fontBody: "'Plus Jakarta Sans', sans-serif",
  };

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [surveyLoading, setSurveyLoading] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // State for survey data from API
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  
  // Local sub-step control state
  const [subStep, setSubStep] = useState<1 | 2>(1);
  
  // Dynamic state to store answers for all questions
  const [answers, setAnswers] = useState<{ [questionId: string]: string | string[] }>({});
  const [customAvatar, setCustomAvatar] = useState<CustomAvatarDraft | null>(null);

  // Fetch survey data on component mount
  useEffect(() => {
    const fetchSurvey = async () => {
      const isPreview = window.location.search.includes('preview=true');
      const searchSubstep = new URLSearchParams(window.location.search).get('substep');
      try {
        const [response, stateResponse] = await Promise.all([
          api.get('/api/surveys/User%20Onboarding%20Survey').catch(() => null),
          isPreview
            ? Promise.resolve({ data: { completed: false, path: '/setup/survey' } })
            : api.get('/api/onboarding/state'),
        ]);
        if (!isPreview && stateResponse.data.completed) return navigate('/home', { replace: true });
        if (!isPreview && stateResponse.data.path !== '/setup/survey') return navigate(stateResponse.data.path, { replace: true });
        const survey: SurveyData = response?.data || FALLBACK_SURVEY_DATA;
        setSurveyData(survey);
        const savedAvatar = stateResponse?.data?.data?.avatar;
        setCustomAvatar(savedAvatar?.type === 'custom' ? savedAvatar : null);
        
        // Initialize answers state with empty values
        const initialAnswers: { [key: string]: string | string[] } = {};
        survey.questions.forEach((q: Question) => {
          if (q.question_type === 'multi-select') {
            initialAnswers[q.question_id] = [];
          } else {
            initialAnswers[q.question_id] = '';
          }
        });
        const savedResponses = stateResponse?.data?.data?.survey?.responses || [];
        savedResponses.forEach((saved: { question_id: string; option_id: string }) => {
          const question = survey.questions.find((item: Question) => item.question_id === saved.question_id);
          const option = question?.options.find((item: Option) => item.option_id === saved.option_id);
          if (!question || !option) return;
          if (question.question_type === 'multi-select') {
            initialAnswers[question.question_id] = [...(initialAnswers[question.question_id] as string[]), option.option_value];
          } else {
            initialAnswers[question.question_id] = option.option_value;
          }
        });
        setAnswers(initialAnswers);
        if (searchSubstep === '2' || stateResponse?.data?.current_step === 'survey_2') setSubStep(2);
      } catch (error) {
        console.error('Error fetching survey:', error);
      } finally {
        setSurveyLoading(false);
      }
    };
    
    fetchSurvey();
  }, [navigate]);

  // Handle single select change (dropdown)
  const handleSingleSelectChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    // Clear error for this question
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  // Handle multi-select toggle
  const toggleMultiSelect = (questionId: string, value: string) => {
    const currentValues = answers[questionId] as string[] || [];
    let newValues: string[];
    
    if (currentValues.includes(value)) {
      newValues = currentValues.filter(v => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: newValues
    }));
    
    // Clear error for this question
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  // Get questions for current sub-step
  const getQuestionsForSubStep = () => {
    if (!surveyData) return [];
    
    if (subStep === 1) {
      return surveyData.questions.filter(q => q.display_order <= 2);
    } else {
      return surveyData.questions.filter(q => q.display_order > 2);
    }
  };

  const validateStep = () => {
    const questions = getQuestionsForSubStep();
    const newErrors: { [key: string]: string } = {};
    
    questions.forEach(question => {
      if (question.is_required) {
        const answer = answers[question.question_id];
        
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          newErrors[question.question_id] = `Please answer this question.`;
        }
      }
    });
    
    return newErrors;
  };

  const buildSubmissionData = () => ({
    survey_id: surveyData?.survey_id,
    responses: Object.entries(answers).flatMap(([questionId, value]) => {
      const question = surveyData?.questions.find(q => q.question_id === questionId);
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.map((selectedValue) => {
        const option = question?.options.find(o => o.option_value === selectedValue);
        return { question_id: questionId, option_id: option?.option_id || null, response_text: question?.question_type === 'text' ? selectedValue : null };
      }).filter((response) => response.option_id);
    }),
  });

  const handleNextAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateStep();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors({});
    
    const totalQuestions = surveyData?.questions.length || 0;
    const currentQuestions = getQuestionsForSubStep();
    const lastQuestionIndex = currentQuestions[currentQuestions.length - 1]?.display_order || 0;
    
    if (subStep === 1 && lastQuestionIndex < totalQuestions) {
      setLoading(true);
      try {
        await api.post('/api/onboarding/survey-progress', buildSubmissionData());
        setSubStep(2);
      } catch (error: unknown) {
        setErrors({ submit: getApiErrorMessage(error) || 'Failed to save survey progress.' });
      } finally {
        setLoading(false);
      }
    } else {
      executeFinalSubmissionPipeline();
    }
  };

  const executeFinalSubmissionPipeline = async () => {
    setLoading(true);
    try {
      if (customAvatar && !customAvatar.path) {
        const file = await getAvatarDraft(customAvatar.draft_id);
        if (!file) throw new Error('Your custom avatar draft is unavailable. Go back and select it again.');
        const upload = await api.post('/api/onboarding/avatar-upload-url', {
          filename: customAvatar.name,
          contentType: customAvatar.mime_type,
          sizeBytes: customAvatar.size_bytes,
        });
        const uploaded = await fetch(upload.data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': customAvatar.mime_type },
          body: file,
        });
        if (!uploaded.ok) throw new Error('Unable to upload your avatar. Please try again.');
        await api.post('/api/onboarding/avatar/finalize', { ...customAvatar, path: upload.data.key });
      }
      const completionResponse = await api.post('/api/onboarding/complete', buildSubmissionData());
      notifyOnboardingCompleted(useGlobalState.getState().user?.account_id);
      if (customAvatar?.draft_id) {
        void deleteAvatarDraft(customAvatar.draft_id).catch((error) => {
          console.warn('Unable to remove the completed avatar draft:', error);
        });
      }
      navigate(completionResponse.data.path || "/home", { replace: true });
      
    } catch (error: unknown) {
      console.error('Error submitting survey:', error);
      const apiMessage = getApiErrorMessage(error);
      
      // Show error message to user
      if (apiMessage) {
        setErrors({ submit: apiMessage });
      } else if (error instanceof Error) {
        setErrors({ submit: error.message });
      } else {
        setErrors({ submit: 'Failed to submit survey. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackAction = async () => {
    if (subStep === 2) {
      try {
        await api.post('/api/onboarding/current-step', { current_step: 'survey_1' });
        setErrors({});
        setSubStep(1);
      } catch {
        setErrors({ submit: 'Unable to return to the previous survey section.' });
      }
    } else {
      try {
        await api.post('/api/onboarding/current-step', { current_step: 'avatar' });
        notifyOnboardingStepChanged('/setup/upload-image', useGlobalState.getState().user?.account_id);
        navigate("/setup/upload-image");
      } catch {
        setErrors({ submit: 'Unable to return to the avatar step.' });
      }
    }
  };

  // Render question based on type
  const renderQuestion = (question: Question) => {
    const value = answers[question.question_id] || '';
    const error = errors[question.question_id];
    
    switch (question.question_type) {
      case 'dropdown': {
        const selectOptions: GlideSelectOption[] = question.options.map((option) => ({
          value: option.option_value,
          label: option.option_text,
          icon: getOptionIcon(option.option_value),
        }));

        return (
          <div className="survey-section" key={question.question_id}>
            <label className="survey-label">
              {question.question_text} {question.is_required && <span style={{ color: T.error }}>*</span>}
            </label>
            <GlideSelect
              options={selectOptions}
              value={(value as string) || ''}
              onChange={(newVal) => handleSingleSelectChange(question.question_id, newVal)}
              placeholder="Select an option..."
              error={!!error}
              fullWidth={true}
              surfaceColor={isDark ? '#18181b' : '#ffffff'}
              highlightColor={isDark ? '#27272a' : '#f1f5f9'}
              textColor={isDark ? '#f4f4f5' : '#0f172a'}
              borderColor={error ? '#ef4444' : T.border}
              accentColor={isDark ? '#ffffff' : '#0f172a'}
              radius={12}
              size="lg"
              defaultOpen={new URLSearchParams(window.location.search).get('open') === '1' && question.display_order === 1}
            />
            {error && <span className="error-text">{error}</span>}
          </div>
        );
      }
      
      case 'multi-select': {
        const selectedValues = (value as string[]) || [];
        return (
          <div className="survey-section" key={question.question_id}>
            <label className="survey-label">
              {question.question_text} {question.is_required && <span style={{ color: T.error }}>*</span>}
            </label>
            {question.options.length > 0 && (
              <span className="survey-sublabel">
                Select all options that apply.
              </span>
            )}
            <div className="purpose-stack">
              {question.options.map((option) => {
                const isActive = selectedValues.includes(option.option_value);
                return (
                  <button
                    type="button"
                    key={option.option_id}
                    className={`purpose-card ${isActive ? "active" : ""}`}
                    onClick={() => toggleMultiSelect(question.question_id, option.option_value)}
                  >
                    <div className="purpose-icon-wrap" aria-hidden="true">
                      {getPurposeIcon(option.option_value)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="purpose-title">
                        {option.option_text}
                      </div>
                    </div>
                    <div className={`check-indicator ${isActive ? "is-active" : ""}`} aria-hidden="true">
                      {isActive && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {error && <span className="error-text">{error}</span>}
          </div>
        );
      }
      
      case 'text':
        return (
          <div className="survey-section" key={question.question_id}>
            <label className="survey-label">
              {question.question_text} {question.is_required && <span style={{ color: T.error }}>*</span>}
            </label>
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleSingleSelectChange(question.question_id, e.target.value)}
              className="text-answer-input"
              placeholder="Type your answer..."
              style={{
                borderColor: error ? T.error : T.border,
                background: T.bgInput,
                color: T.text,
              }}
            />
            {error && <span className="error-text">{error}</span>}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (surveyLoading) {
    return (
      <div className="setup-page-wrapper">
        <div className="setup-card" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div style={{ color: T.text }}>Loading survey...</div>
        </div>
      </div>
    );
  }

  if (!surveyData) {
    return (
      <div className="setup-page-wrapper">
        <div className="setup-card" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div style={{ color: T.error }}>Failed to load survey</div>
        </div>
      </div>
    );
  }

  const currentQuestions = getQuestionsForSubStep();
  const isLastStep = subStep === 2 || currentQuestions.length === 0;
  const totalQuestions = surveyData.questions.length;

  return (
    <>
      <style>{`
        .setup-page-wrapper {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 100vh;
          background: ${T.bg};
          padding: 80px 20px;
          overflow-x: hidden;
        }

        .canvas-bg-container {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: auto;
        }

        .setup-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          font-family: ${T.fontBody};
          background: ${T.bgCard};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 32px;
          border-radius: 20px;
          border: 1px solid ${T.border};
          box-shadow: ${isDark ? "0 24px 70px rgba(0,0,0,0.65)" : "0 20px 60px rgba(15,23,42,0.08)"};
        }

        .animated-content {
          opacity: 0;
          transform: translateY(10px);
          animation: smooth-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.15s;
        }

        .survey-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .survey-label {
          color: ${T.text};
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.1px;
        }

        .survey-sublabel {
          color: ${T.muted};
          font-size: 12px;
          margin-bottom: 2px;
        }

        .text-answer-input {
          width: 100%;
          height: 44px;
          padding: 10px 14px;
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          border-radius: 12px;
          color: ${T.text};
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .text-answer-input:focus {
          border-color: ${T.accent};
          box-shadow: 0 0 0 2px ${isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(15, 23, 42, 0.15)"};
        }

        .purpose-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .purpose-card {
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          color: ${T.text};
          padding: 14px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 14px;
          text-align: left;
          width: 100%;
          font: inherit;
        }

        .purpose-card:hover {
          border-color: ${T.dim};
          background: ${isDark ? "#202024" : "#f8fafc"};
          transform: translateY(-1px);
          box-shadow: ${isDark ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 4px 12px rgba(15, 23, 42, 0.05)"};
        }

        .purpose-card.active {
          border-color: ${isDark ? "#ffffff" : "#0f172a"};
          background: ${isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.04)"};
        }

        .purpose-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 10px;
          background: ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.05)"};
          color: ${T.text};
          transition: all 0.15s ease;
        }

        .purpose-card.active .purpose-icon-wrap {
          background: ${isDark ? "#27272a" : "#e2e8f0"};
          color: ${isDark ? "#ffffff" : "#0f172a"};
        }

        .purpose-title {
          font-size: 14px;
          font-weight: 600;
          color: ${T.text};
          line-height: 1.3;
        }

        .check-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1.5px solid ${T.border};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${isDark ? "#0f0f11" : "#ffffff"};
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .check-indicator.is-active {
          background: ${isDark ? "#ffffff" : "#0f172a"};
          border-color: ${isDark ? "#ffffff" : "#0f172a"};
        }

        .purpose-card:active {
          transform: scale(0.99);
        }

        .error-text {
          color: ${T.error};
          font-size: 11px;
          margin-top: 4px;
        }

        .onboarding-secondary-button {
          transition: all 0.2s ease;
        }

        .onboarding-secondary-button:not(:disabled):hover {
          border-color: ${T.dim} !important;
          background: ${isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)"} !important;
          transform: translateY(-1px);
        }

        .onboarding-secondary-button:not(:disabled):active {
          transform: scale(0.97);
        }

        .onboarding-primary-button {
          transition: all 0.2s ease;
        }

        .onboarding-primary-button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: ${isDark ? "0 8px 20px rgba(255, 255, 255, 0.12)" : "0 8px 20px rgba(15, 23, 42, 0.12)"};
        }

        .onboarding-primary-button:not(:disabled):active {
          transform: scale(0.97);
        }

        .setup-card button:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 3px;
        }
        @keyframes smooth-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="setup-page-wrapper">
        <div className="canvas-bg-container">
          <ShapeGrid
            direction="diagonal"
            speed={0.3}
            borderColor={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
            squareSize={45}
            hoverFillColor={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}
            hoverTrailAmount={4}
            shape="square"
          />
        </div>

        <form onSubmit={handleNextAction} className="setup-card">
          {/* Progress Bar */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{subStep === 1 ? "2 / 3" : "3 / 3"}</span>
            </div>

            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: subStep === 1 ? "66.667%" : "100%", height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>

          <div className="animated-content" key={subStep}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bgInput,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, marginBottom: 20,
            }}>
              <HelpCircle className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              {subStep === 1 ? "Onboarding survey" : "Platform purpose"}
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              {subStep === 1
                ? "Please take a brief moment to share your professional background origins with us."
                : "Identify your primary objectives so we can personalize your workspace dashboards."}
            </p>

            {/* Dynamic Questions */}
            {currentQuestions.map((question) => renderQuestion(question))}

            {/* Display submit error if any */}
            {errors.submit && (
              <div style={{ 
                color: T.error, 
                fontSize: 13, 
                marginBottom: 16, 
                padding: '10px 14px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                borderRadius: '8px',
                border: `1px solid ${T.error}`
              }}>
                {errors.submit}
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className="onboarding-secondary-button"
                onClick={handleBackAction}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.text,
                  padding: "12px 20px",
                  borderRadius: 30,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="submit"
                className="onboarding-primary-button"
                disabled={loading}
                style={{
                  flex: 2,
                  background: loading ? (isDark ? "#27272a" : "#e2e8f0") : (isDark ? "#ffffff" : "#0f172a"),
                  color: loading ? (isDark ? "#71717a" : "#94a3b8") : (isDark ? "#0f0f11" : "#ffffff"),
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: 30,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all .2s ease"
                }}
              >
                {loading ? (
                  "Finalizing Workspace..."
                ) : isLastStep ? (
                  <>
                    Complete Setup
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

interface CustomAvatarDraft {
  type: 'custom';
  draft_id: string;
  name: string;
  path?: string;
  mime_type: string;
  size_bytes: number;
}
