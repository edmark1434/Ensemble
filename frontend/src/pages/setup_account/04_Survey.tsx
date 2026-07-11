import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid";
import api from "@/lib/axios";

const T = {
  bg:        "#080a12",
  bgInput:   "#13151f",
  border:    "#2a2d3e",
  borderFoc: "#4a6fa5",
  accent:    "#4a6fa5",
  text:      "#ffffff",
  muted:     "#888",
  dim:       "#555",
  error:     "#e05252",
  fontBody:  "'Plus Jakarta Sans', sans-serif",
};

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

export default function Survey() {
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

  // Fetch survey data on component mount
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const response = await api.get('/api/surveys/User%20Onboarding%20Survey');
        setSurveyData(response.data);
        
        // Initialize answers state with empty values
        const initialAnswers: { [key: string]: string | string[] } = {};
        response.data.questions.forEach((q: Question) => {
          if (q.question_type === 'multi-select') {
            initialAnswers[q.question_id] = [];
          } else {
            initialAnswers[q.question_id] = '';
          }
        });
        setAnswers(initialAnswers);
      } catch (error) {
        console.error('Error fetching survey:', error);
      } finally {
        setSurveyLoading(false);
      }
    };
    
    fetchSurvey();
  }, []);

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

  const handleNextAction = (e: React.FormEvent) => {
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
      setSubStep(2);
    } else {
      executeFinalSubmissionPipeline();
    }
  };

  const executeFinalSubmissionPipeline = async () => {
    setLoading(true);
    try {
      // Format the responses with question text and option text
      const formattedResponses = Object.entries(answers).map(([questionId, value]) => {
        const question = surveyData?.questions.find(q => q.question_id === questionId);
        
        // Handle multi-select answers
        if (Array.isArray(value) && value.length > 0) {
          const optionDetails = value
            .map(val => {
              const option = question?.options.find(o => o.option_value === val);
              return {
                option_id: option?.option_id || null,
                option_text: option?.option_text || null
              };
            })
            .filter(item => item.option_id !== null);

          // Return as array of objects for multi-select
          return optionDetails.map(option => ({
            question_id: questionId,
            question_text: question?.question_text || null,
            option_id: option.option_id,
            option_text: option.option_text
          }));
        } else if (value && typeof value === 'string' && value !== '') {
          // Single select
          const option = question?.options.find(o => o.option_value === value);
          
          return {
            question_id: questionId,
            question_text: question?.question_text || null,
            option_id: option?.option_id || null,
            option_text: option?.option_text || null
          };
        } else {
          // No answer selected
          return {
            question_id: questionId,
            question_text: question?.question_text || null,
            option_id: null,
            option_text: null
          };
        }
      });

      // Flatten the array (in case multi-select returns an array of arrays)
      const flattenedResponses = formattedResponses.flat();

      // Create the final submission data
      const submissionData = {
        survey_id: surveyData?.survey_id,
        survey_name: surveyData?.survey_name,
        responses: flattenedResponses
      };

      // Console log in the requested format
      console.log('Survey Submission Data:');
      console.log('survey_id:', submissionData.survey_id);
      console.log('survey_name:', submissionData.survey_name);
      console.log('responses:');
      flattenedResponses.forEach((response) => {
        console.log({
          question_id: response.question_id,
          question_text: response.question_text,
          option_id: response.option_id,
          option_text: response.option_text
        });
      });

      console.log('Full Submission Data:', JSON.stringify(submissionData, null, 2));

      // Send the data to the backend API
      const response = await api.post('/api/surveys/', submissionData);
      
      console.log('API Response:', response.data);
      const result = await api.get("/api/users/session");
          if (result.data.steps && result.data.steps !== 'completed' && result.data.steps !== 'survey' && result.data.steps === 'profile') {
            await api.put("/api/accounts/update-profile-onboarding", {
              completed_onboarding: 'completed'
            });
          }
      // Navigate to preview on success
      navigate("/home");
      
    } catch (err: any) {
      console.error('Error submitting survey:', err);
      
      // Show error message to user
      if (err.response?.data?.message) {
        setErrors({ submit: err.response.data.message });
      } else {
        setErrors({ submit: 'Failed to submit survey. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackAction = () => {
    if (subStep === 2) {
      setErrors({});
      setSubStep(1);
    } else {
      navigate("/setup/upload-image");
    }
  };

  // Render question based on type
  const renderQuestion = (question: Question) => {
    const value = answers[question.question_id] || '';
    const error = errors[question.question_id];
    
    switch (question.question_type) {
      case 'dropdown':
        return (
          <div className="survey-section" key={question.question_id}>
            <span className="survey-label">
              {question.question_text} {question.is_required && '*'}
            </span>
            <select
              value={value as string}
              onChange={(e) => handleSingleSelectChange(question.question_id, e.target.value)}
              className="dropdown-select"
              style={{ borderColor: error ? T.error : T.border }}
            >
              <option value="" disabled hidden>Select an option...</option>
              {question.options.map((option) => (
                <option key={option.option_id} value={option.option_value}>
                  {option.option_text}
                </option>
              ))}
            </select>
            {error && <span className="error-text">{error}</span>}
          </div>
        );
      
      case 'multi-select':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="survey-section" key={question.question_id}>
            <span className="survey-label">
              {question.question_text} {question.is_required && '*'}
            </span>
            {question.options.length > 0 && (
              <span className="survey-sublabel">
                Select all options that apply.
              </span>
            )}
            <div className="purpose-stack">
              {question.options.map((option) => {
                const isActive = selectedValues.includes(option.option_value);
                return (
                  <div
                    key={option.option_id}
                    className={`purpose-card ${isActive ? "active" : ""}`}
                    onClick={() => toggleMultiSelect(question.question_id, option.option_value)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: isActive ? T.text : "#e2e8f0", 
                        marginBottom: 2 
                      }}>
                        {option.option_text}
                      </div>
                    </div>
                    {isActive && (
                      <div className="check-indicator">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <span className="error-text">{error}</span>}
          </div>
        );
      
      case 'text':
        return (
          <div className="survey-section" key={question.question_id}>
            <span className="survey-label">
              {question.question_text} {question.is_required && '*'}
            </span>
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleSingleSelectChange(question.question_id, e.target.value)}
              className="dropdown-select"
              placeholder="Type your answer..."
              style={{ borderColor: error ? T.error : T.border }}
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
          background: rgba(8, 10, 18, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 32px;
          border-radius: 20px;
          border: 1px solid rgba(42, 45, 62, 0.4);
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

        .dropdown-select {
          width: 100%;
          padding: 12px 14px;
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: all .15s ease;
        }

        .dropdown-select:focus {
          border-color: ${T.borderFoc};
        }

        .purpose-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .purpose-card {
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          color: #e2e8f0;
          padding: 14px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-align: left;
        }

        .purpose-card:hover {
          border-color: ${T.dim};
        }

        .purpose-card.active {
          border-color: ${T.borderFoc};
          background: rgba(74, 111, 165, 0.1);
        }

        .check-indicator {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${T.accent};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }

        .error-text {
          color: ${T.error};
          font-size: 11px;
          margin-top: 4px;
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
            borderColor="rgba(42, 45, 62, 0.3)"
            squareSize={45}
            hoverFillColor="rgba(74, 111, 165, 0.15)"
            hoverTrailAmount={4}
            shape="square"
          />
        </div>

        <form onSubmit={handleNextAction} className="setup-card">
          {/* Progress Bar */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>5 / 5</span>
            </div>

            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: "100%", height: "100%", background: T.accent, borderRadius: 2 }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: T.muted }}>SECTION PROGRESS</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.accent }}>
                {subStep === 1 ? `${Math.round((currentQuestions.length / totalQuestions) * 50)}%` : "100%"}
              </span>
            </div>
            <div style={{ width: "100%", height: 2, background: "rgba(42, 45, 62, 0.4)", borderRadius: 1, overflow: "hidden" }}>
              <div style={{
                width: subStep === 1 ? "50%" : "100%",
                height: "100%",
                background: "rgba(74, 111, 165, 0.6)",
                borderRadius: 1,
                transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
              }} />
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
                padding: '10px', 
                background: 'rgba(224, 82, 82, 0.1)', 
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
                onClick={handleBackAction}
                style={{
                  flex: 1, background: "none", border: `1px solid ${T.border}`, color: T.text, padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, background: loading ? "#555" : "#fff", color: "#080a12", border: "none", padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s ease"
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#e8e8e8"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}
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