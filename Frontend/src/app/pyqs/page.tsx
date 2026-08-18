'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { databankAPI } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import toast from 'react-hot-toast';
import {
  BookOpen, ChevronRight, Sparkles, CheckCircle, ArrowRight,
  ArrowLeft, RotateCcw, Trophy, Brain, Clock, Send, Loader2,
  Star, TrendingUp, FileQuestion, Flame,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface Subject { id: number; name: string; module_number?: number; is_indexed: boolean; document_count?: number; }
interface QuestionData { id: number; question_text: string; question_index: number; options?: string[]; correct_answer?: string; answer?: any; }
interface SessionData { id: number; subject?: number; module?: number; subject_name: string; questions: QuestionData[]; total_score: number | null; completed: boolean; }
interface EvalResult { score: number; feedback: string; strengths: string; improvements: string; session_completed?: boolean; total_score?: number; }

type Step = 'select' | 'generating' | 'quiz' | 'done';

// ── Gradient colours per subject index ──────────────────────────────────
const GRADIENTS = [
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-purple-700',
  'from-sky-500 to-blue-700',
  'from-green-500 to-emerald-700',
];

const ScoreRing = ({ score, max = 10, size = 80 }: { score: number; max?: number; size?: number }) => {
  const pct = score / max;
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = pct >= 0.7 ? '#22c55e' : pct >= 0.4 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  );
};

export default function PYQsPage() {
  const router = useRouter();
  const { isAuthenticated, user, usage } = useAuthStore();

  const [step, setStep] = useState<Step>('select');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [session, setSession] = useState<SessionData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // questionId → text
  const [evalResults, setEvalResults] = useState<Record<number, EvalResult>>({}); // questionId → result
  const [submitting, setSubmitting] = useState<number | null>(null); // questionId being submitted

  // Load modules (instead of legacy subjects)
  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }

    // Use course_name from user profile for filtering
    const filter = user?.course_name || user?.field_of_study;

    databankAPI.getModules(undefined, filter)
      .then(res => {
        const data = res.data.results || res.data;
        // Map modules to Subject interface for UI compatibility
        const mapped = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          module_number: m.module_number,
          is_indexed: true, // Modules are usually ready if they exist in this view
          document_count: m.document_count || 1
        }));
        setSubjects(mapped);
      })
      .catch(() => toast.error('Failed to load modules'))
      .finally(() => setLoadingSubjects(false));
  }, [isAuthenticated, router, user?.course_name, user?.field_of_study]);

  // Start a session
  const startSession = useCallback(async (subject: Subject) => {
    setSelectedSubject(subject);
    setStep('generating');
    try {
      // Use module_id for hierarchical modules
      const res = await databankAPI.createSessionByModule(subject.id);
      setSession(res.data);
      setCurrentQ(0);
      setAnswers({});
      setEvalResults({});
      setStep('quiz');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to generate questions. Make sure PDFs are indexed.');
      setStep('select');
    }
  }, []);

  // Submit answer for current question
  const submitAnswer = useCallback(async (directValue?: string) => {
    if (!session) return;
    const question = session.questions[currentQ];
    const answer = directValue || answers[question.id]?.trim();
    if (!answer) { toast.error('Please write your answer first'); return; }

    setSubmitting(question.id);
    try {
      const res = await databankAPI.submitAnswer(question.id, answer);
      const result: EvalResult = res.data;
      setEvalResults(prev => ({ ...prev, [question.id]: result }));
      if (result.session_completed && result.total_score !== undefined) {
        // All answered — update session
        setSession(prev => prev ? { ...prev, total_score: result.total_score!, completed: true } : prev);
        // Refresh usage (for streaks/credits)
        useAuthStore.getState().fetchUsage();
      }
    } catch (e: any) {
      toast.error('Failed to evaluate answer');
    } finally {
      setSubmitting(null);
    }
  }, [session, currentQ, answers]);

  const submitAnswerWithDirectValue = (questionId: number, value: string) => {
    submitAnswer(value);
  };

  const goNext = () => {
    if (!session) return;
    if (currentQ < session.questions.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      setStep('done');
    }
  };

  const goPrev = () => setCurrentQ(q => Math.max(0, q - 1));

  const reset = () => {
    setStep('select');
    setSession(null);
    setSelectedSubject(null);
    setAnswers({});
    setEvalResults({});
    setCurrentQ(0);
  };

  // Derived
  const totalScore = session
    ? Object.values(evalResults).reduce((sum, r) => sum + r.score, 0)
    : 0;
  const answeredCount = Object.keys(evalResults).length;
  const totalQ = session?.questions.length ?? 10;

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">

        {/* ── Step: select ─────────────────────────────────────────────── */}
        {step === 'select' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                  <Brain className="w-4 h-4" />
                  AI-Powered Practice
                </div>
                {usage && usage.current_streak > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-bold animate-bounce">
                    <Flame className="w-4 h-4 fill-orange-500" />
                    {usage.current_streak} Day Streak
                  </div>
                )}
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Past Year Questions</h1>
              <p className="text-slate-500 text-lg">
                Select a module from <strong>{user?.course_name || user?.field_of_study || 'your study field'}</strong> to practice
              </p>
            </div>

            {loadingSubjects ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <FileQuestion className="w-14 h-14 mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">No modules found</h3>
                <p className="text-slate-400 text-sm">
                  {user?.course_name
                    ? `No PYQ modules registered for course: ${user.course_name}`
                    : "Update your profile with your course name to see relevant PYQs"}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => startSession(s)}
                    className="group relative p-6 rounded-2xl text-left overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center mb-4 shadow-md`}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{s.name}</h3>
                    <p className="text-slate-400 text-sm">Module {s.module_number || i + 1}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Ready
                      </span>
                      <span className="text-xs text-slate-400">10 questions</span>
                    </div>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-400 transition" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: generating ─────────────────────────────────────────── */}
        {step === 'generating' && (
          <div className="max-w-md mx-auto text-center py-24">
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6 relative">
              <Sparkles className="w-10 h-10 text-purple-600" />
              <div className="absolute inset-0 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Generating Questions…</h2>
            <p className="text-slate-500">
              AI is reading <strong>{selectedSubject?.name}</strong> question papers and crafting 10 unique questions for you
            </p>
          </div>
        )}

        {/* ── Step: quiz ───────────────────────────────────────────────── */}
        {step === 'quiz' && session && (
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-slate-500 mb-0.5">{session.subject_name}</p>
                <h1 className="text-xl font-bold text-slate-900">
                  Question {currentQ + 1} of {totalQ}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Answered</p>
                  <p className="text-lg font-bold text-slate-900">{answeredCount}/{totalQ}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-sm">{answeredCount}/{totalQ}</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
              />
            </div>

            {/* Question dots */}
            <div className="flex gap-1.5 mb-6">
              {session.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  className={`flex-1 h-1.5 rounded-full transition-all ${i === currentQ ? 'bg-purple-600' :
                    evalResults[q.id] ? 'bg-green-400' :
                      'bg-slate-200'
                    }`}
                />
              ))}
            </div>

            {/* Question card */}
            {(() => {
              const q = session.questions[currentQ];
              const evalResult = evalResults[q.id];
              const userAnswer = answers[q.id] || '';

              return (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Question header */}
                  <div className="px-6 py-5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                        {q.question_index}
                      </span>
                      <p className="text-slate-900 font-medium text-lg leading-relaxed">{q.question_text}</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Answer input */}
                    {!evalResult && (
                      <div className="space-y-4">
                        {q.options && q.options.length > 0 ? (
                          <div className="grid gap-3">
                            {q.options.map((opt: string, idx: number) => {
                              const labels = ['A', 'B', 'C', 'D'];
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setAnswers(prev => ({ ...prev, [q.id]: opt }));
                                    // Small delay to show selection before submit if needed
                                    // or just submit immediately
                                    setTimeout(() => submitAnswerWithDirectValue(q.id, opt), 100);
                                  }}
                                  disabled={submitting === q.id}
                                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${answers[q.id] === opt
                                    ? 'border-purple-600 bg-purple-50 text-purple-900'
                                    : 'border-slate-100 hover:border-purple-200 hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${answers[q.id] === opt ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {labels[idx] || (idx + 1)}
                                  </span>
                                  <span className="font-medium">{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Your Answer</label>
                              <textarea
                                id={`answer-${q.id}`}
                                value={userAnswer}
                                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                rows={5}
                                placeholder="Write your detailed answer here..."
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition text-sm"
                              />
                            </div>
                            <button
                              onClick={() => submitAnswer()}
                              disabled={submitting === q.id || !userAnswer.trim()}
                              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition text-sm"
                            >
                              {submitting === q.id ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />Evaluating…</>
                              ) : (
                                <><Send className="w-4 h-4" />Submit & Evaluate</>
                              )}
                            </button>
                          </>
                        )}
                        {submitting === q.id && q.options && q.options.length > 0 && (
                          <div className="flex items-center justify-center gap-2 text-purple-600 font-medium py-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Evaluating with AI...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evaluation result */}
                    {evalResult && (
                      <div className="space-y-4">
                        {/* Score display */}
                        <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-xl">
                          <div className="relative w-20 h-20 flex items-center justify-center">
                            <ScoreRing score={evalResult.score} />
                            <span className="absolute text-lg font-bold text-slate-900">
                              {evalResult.score.toFixed(1)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5">Score</p>
                            <p className="text-2xl font-bold text-slate-900">{evalResult.score.toFixed(1)}<span className="text-slate-400 text-lg">/10</span></p>
                            <p className={`text-sm font-medium ${evalResult.score >= 7 ? 'text-green-600' : evalResult.score >= 4 ? 'text-amber-600' : 'text-red-600'}`}>
                              {evalResult.score >= 7 ? 'Excellent!' : evalResult.score >= 4 ? 'Good effort' : 'Needs improvement'}
                            </p>
                          </div>
                        </div>

                        {/* Your answer */}
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1.5">Your Answer</p>
                          <div className="p-3 bg-slate-50 rounded-lg text-slate-700 text-sm">{userAnswer}</div>
                        </div>

                        {/* Feedback */}
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1.5">AI Feedback</p>
                          <p className="text-slate-700 text-sm leading-relaxed">{evalResult.feedback}</p>
                        </div>

                        {evalResult.strengths && (
                          <div className="flex gap-3 p-3 bg-green-50 rounded-xl">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-0.5">Strengths</p>
                              <p className="text-green-800 text-sm">{evalResult.strengths}</p>
                            </div>
                          </div>
                        )}

                        {evalResult.improvements && (
                          <div className="flex gap-3 p-3 bg-amber-50 rounded-xl">
                            <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-amber-700 mb-0.5">Improvements</p>
                              <p className="text-amber-800 text-sm">{evalResult.improvements}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={goPrev}
                      disabled={currentQ === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" /> Previous
                    </button>

                    {currentQ < totalQ - 1 ? (
                      <button
                        onClick={goNext}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm transition"
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setStep('done')}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition"
                      >
                        See Results <Trophy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Step: done ───────────────────────────────────────────────── */}
        {step === 'done' && session && (
          <div className="max-w-2xl mx-auto text-center">
            {/* Trophy */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-300/50">
              <Trophy className="w-12 h-12 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">Session Complete!</h1>
            <p className="text-slate-500 mb-8">{session.subject_name}</p>

            {/* Score summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <ScoreRing score={totalScore} max={totalQ * 10} size={128} />
                  <div className="absolute text-center">
                    <p className="text-2xl font-bold text-slate-900">{totalScore.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">/{totalQ * 10}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-4xl font-bold text-slate-900 mb-1">
                    {Math.round((totalScore / (totalQ * 10)) * 100)}%
                  </p>
                  <p className="text-lg text-slate-500">
                    {totalScore / (totalQ * 10) >= 0.7 ? '🎉 Great work!' :
                      totalScore / (totalQ * 10) >= 0.4 ? '📚 Keep practicing!' :
                        '💪 More study needed'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">{answeredCount}/{totalQ} answered</p>
                </div>
              </div>

              {/* Per-question breakdown */}
              <div className="space-y-2">
                {session.questions.map((q, i) => {
                  const result = evalResults[q.id];
                  return (
                    <div key={q.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                      <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-sm text-slate-700 truncate text-left">{q.question_text}</p>
                      {result ? (
                        <div className="text-right">
                          <span className={`text-sm font-bold block ${result.score >= 7 ? 'text-green-600' :
                            result.score >= 4 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                            {result.score.toFixed(1)}/10
                          </span>
                          {q.correct_answer && <span className="text-xs text-slate-500">Correct: {q.correct_answer}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Skipped</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition shadow-lg shadow-purple-200"
              >
                <RotateCcw className="w-4 h-4" />
                Practice Again
              </button>
              <button
                onClick={() => { setStep('quiz'); setCurrentQ(0); }}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 transition"
              >
                Review Answers
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
