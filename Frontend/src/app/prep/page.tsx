'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { databankAPI } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import {
    Zap, Flame, BookOpen, ChevronRight, MessageSquare,
    Sparkles, ArrowRight, Clock, Target, Info,
    ShieldCheck, Star
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Question {
    id: number;
    text: string;
    solution: string;
    repetition_count: number;
    last_seen_years: number[];
    semester_details: {
        semester_number: number;
        course_name: string;
    };
}

interface PrepInsights {
    strategy: string;
    probabilities: { label: string; prob: number }[];
    tips: string[];
}

export default function OneNightPrepPage() {
    const { user, isAuthenticated } = useAuthStore();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [insights, setInsights] = useState<PrepInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSolution, setExpandedSolution] = useState<number | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadPrepData();
    }, [isAuthenticated, user?.field_of_study, user?.course_name]);

    // The active study identifier: prefer field_of_study over course_name
    const activeStudyId = user?.field_of_study || user?.course_name || null;

    const loadPrepData = async () => {
        setLoading(true);
        try {
            const params: { field_of_study?: string; course_name?: string } = {};
            if (user?.field_of_study) params.field_of_study = user.field_of_study;
            else if (user?.course_name) params.course_name = user.course_name;

            const reqParam = Object.keys(params).length ? params : undefined;

            // Parallel fetch
            const [questionsRes, insightsRes] = await Promise.all([
                databankAPI.getQuestionBank(reqParam),
                databankAPI.getPrepInsights(reqParam)
            ]);

            setQuestions(questionsRes.data.results || questionsRes.data);
            setInsights(insightsRes.data);
        } catch (e) {
            toast.error('Failed to load study insights');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Flame className="w-6 h-6 text-orange-500 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Calculating High-Priority Patterns...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
                {/* Hero section with glassmorphism */}
                <div className="relative mb-20">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />

                    <div className="relative z-10 p-8 md:p-12 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-widest mb-6 animate-bounce">
                                <Flame className="w-4 h-4" />
                                Midnight Mode Active
                            </div>
                            {activeStudyId && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wide mb-4 ml-3">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Tailored for <span className="text-white font-black ml-1">{activeStudyId}</span>
                                </div>
                            )}
                            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-orange-400">One-Night</span> <br /> Prep Engine
                            </h1>
                            <p className="text-xl text-slate-400 mb-8 max-w-xl font-medium leading-relaxed">
                                Don't study harder, study smarter. We analyzed 5+ years of <span className="text-white font-bold">{activeStudyId || 'your course'}</span> papers to find exactly what matters.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-3 px-6 py-4 bg-white/[0.05] border border-white/5 rounded-2xl">
                                    <Target className="w-5 h-5 text-indigo-400" />
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Accuracy</p>
                                        <p className="text-lg font-black text-slate-200">89% Precision</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-4 bg-white/[0.05] border border-white/5 rounded-2xl">
                                    <Zap className="w-5 h-5 text-orange-400" />
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Time Saved</p>
                                        <p className="text-lg font-black text-slate-200">4+ Hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Left: Most Repeated Questions */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Star className="w-6 h-6 text-amber-400" />
                                High-Frequency Questions
                            </h2>
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{questions.length} Items found</span>
                        </div>

                        {questions.length === 0 ? (
                            <div className="p-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                <Sparkles className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest">No pattern data available yet for your course.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {questions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className={`group rounded-3xl transition-all duration-300 ${expandedSolution === q.id ? 'bg-white/[0.08] border-white/20' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10'} border`}
                                    >
                                        <button
                                            onClick={() => setExpandedSolution(expandedSolution === q.id ? null : q.id)}
                                            className="w-full text-left p-6 flex items-start gap-4"
                                        >
                                            <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 group-hover:border-indigo-500/30 transition-all">
                                                <span className="text-xs font-black text-slate-500">HIT</span>
                                                <span className="text-xl font-black text-indigo-400">{q.repetition_count}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${q.repetition_count > 3 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                        {q.repetition_count > 3 ? 'CRITICAL REPEAT' : 'FREQUENT'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Last seen: {q.last_seen_years.join(', ')}</span>
                                                </div>
                                                <p className="text-lg font-medium leading-relaxed text-slate-200 group-hover:text-white transition-colors">{q.text}</p>
                                                <div className="flex items-center gap-2 mt-4 text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                                                    {expandedSolution === q.id ? 'Hide Solution' : 'View Master Solution'}
                                                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedSolution === q.id ? 'rotate-90' : ''}`} />
                                                </div>
                                            </div>
                                        </button>

                                        {expandedSolution === q.id && (
                                            <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-300">
                                                <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 leading-loose prose prose-invert max-w-none">
                                                    {q.solution || 'Our AI is still finalizing the perfect solution for this question. Refer to your class notes for now!'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: AI Insights & Patterns */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3 mb-8">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                                AI Pattern Lab
                            </h2>

                            <div className="space-y-6">
                                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/10 shadow-xl overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <MessageSquare className="w-20 h-20" />
                                    </div>
                                    <h3 className="text-lg font-black mb-3 text-white flex items-center gap-2">
                                        <Info className="w-4 h-4 text-indigo-400" />
                                        Prediction Strategy
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                        {insights?.strategy || "Based on recurring concept analysis, prioritize the most repeated questions first as they have the highest probability of appearing."}
                                    </p>
                                </div>

                                <div className="p-1 border border-white/5 rounded-[2rem] bg-slate-900/50">
                                    <div className="p-6 rounded-[1.8rem] bg-white/[0.02] space-y-4">
                                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Upcoming Probabilities</h2>
                                        {(insights?.probabilities || [
                                            { label: 'Core Concepts', prob: 80, color: 'bg-indigo-500' },
                                            { label: 'Previous Patterns', prob: 65, color: 'bg-orange-500' },
                                            { label: 'Related Theories', prob: 40, color: 'bg-purple-500' },
                                        ]).map((stat, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                                    <span className="text-slate-400">{stat.label}</span>
                                                    <span className="text-white">{stat.prob}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-orange-500' : 'bg-purple-500'}`}
                                                        style={{ width: `${stat.prob}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-3xl bg-orange-500/5 border border-orange-500/10 space-y-4">
                                    <div className="flex items-center gap-3 text-orange-400">
                                        <Clock className="w-5 h-5" />
                                        <h2 className="font-black text-sm uppercase tracking-widest">Time Pressure Tips</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {(insights?.tips || [
                                            "Concentrate on the most recent 2 year patterns.",
                                            "Master all block diagrams and flowcharts.",
                                            "Focus on the most repeated definitions."
                                        ]).map((tip, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                                <p className="text-sm text-slate-400 font-medium leading-relaxed">{tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="w-full py-5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 group">
                            Generate Flashcard Set
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
