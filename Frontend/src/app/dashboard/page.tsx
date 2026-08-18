'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, Progress, Badge, Button, Loading } from '@/components/ui';
import { academicAPI, databankAPI } from '@/lib/api';
import {
  Sparkles,
  Brain,
  FileQuestion,
  BookOpen,
  Zap,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  Lightbulb,
  Camera,
  Shield,
  Flame,
  Calendar,
  RefreshCw,
  Bot,
} from 'lucide-react';
import Link from 'next/link';

const quickActions = [
  { icon: Bot, label: 'Manavalan Mentor', href: '/mentor', color: 'from-amber-500 to-orange-500' },
  { icon: Sparkles, label: 'Summarize', href: '/ai-tools?tab=summarize', color: 'from-blue-500 to-cyan-500' },
  { icon: Brain, label: 'Flashcards', href: '/ai-tools?tab=flashcards', color: 'from-purple-500 to-pink-500' },
  { icon: Camera, label: 'OCR Scan', href: '/ai-tools?tab=ocr', color: 'from-green-500 to-emerald-500' },
  { icon: Flame, label: 'One-Night Prep', href: '/prep', color: 'from-orange-500 to-rose-600' },
  { icon: FileQuestion, label: 'PYQ DataBank', href: '/pyqs', color: 'from-indigo-500 to-purple-500' },
  { icon: BookOpen, label: 'My Notes', href: '/notes', color: 'from-pink-500 to-rose-500' },
];

const recentActivity = [
  { type: 'summary', title: 'Chapter Summary Generated', time: 'Just now', status: 'completed' },
  { type: 'flashcard', title: 'Personalized Insights Updated', time: 'Recently', status: 'completed' },
  { type: 'pyq', title: 'Practice Session Ready', time: 'Now', status: 'completed' },
];

const motivationalQuotes = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "Don't let what you cannot do interfere with what you can do.",
  "The only place where success comes before work is in the dictionary.",
  "Believe you can and you're halfway there.",
  "Your time is limited, so don't waste it living someone else's life.",
  "The expert in anything was once a beginner.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
];

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, usage, fetchUsage } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentQuote, setCurrentQuote] = useState("");
  const [personalizedFlashcards, setPersonalizedFlashcards] = useState<any[]>([]);
  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false);
  const [modules, setModules] = useState<any[]>([]);
  const [isModulesLoading, setIsModulesLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchUsage();
    setIsLoading(false);

    // Initial quote
    setCurrentQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, router, fetchUsage]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPersonalizedFlashcards();
    }
  }, [isAuthenticated, user]);

  const loadPersonalizedFlashcards = async () => {
    setIsFlashcardsLoading(true);
    try {
      const response = await academicAPI.getPersonalizedFlashcards();
      setPersonalizedFlashcards(response.data);
    } catch (e) {
      console.error("Failed to load personalized flashcards", e);
    } finally {
      setIsFlashcardsLoading(false);
    }
  };

  const loadModules = async () => {
    if (!user?.course_name) return;
    setIsModulesLoading(true);
    try {
      const response = await databankAPI.getModules(undefined, user.course_name);
      setModules(response.data.results || response.data);
    } catch (e) {
      console.error("Failed to load modules", e);
    } finally {
      setIsModulesLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.course_name) {
      loadModules();
    }
  }, [isAuthenticated, user?.course_name]);

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Top Bar: Time & Welcome */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">
                Welcome back, {user?.first_name || user?.username}! 👋
              </h1>
              <p className="text-slate-600">
                You have <span className="font-bold text-primary-600">{usage?.remaining_today || 0}</span> AI credits remaining today.
              </p>
            </div>

            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
              <div className="flex items-center gap-3 border-r border-slate-100 pr-6">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 tabular-nums">{formattedTime}</p>
                  <p className="text-xs text-slate-500 font-medium">Current Time</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{formattedDate}</p>
                  <p className="text-xs text-slate-500 font-medium">Today</p>
                </div>
              </div>
            </div>
          </div>

          {/* Motivational Quote & Admin Access */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="md:col-span-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="w-32 h-32" />
              </div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-primary-400 text-sm font-bold uppercase tracking-wider mb-2">Daily Inspiration</p>
                    <h2 className="text-2xl font-serif italic text-white/95">"{currentQuote}"</h2>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-primary-100">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                {user?.user_type === 'admin' ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Admin Dashboard</h3>
                    <p className="text-sm text-slate-600 mb-4">Manage users, notes, and DataBank hierarchy.</p>
                    <Link href="/admin/dashboard" className="w-full">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">Enter Admin Panel</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                      <Flame className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{usage?.current_streak || 0} Day Streak</h3>
                    <p className="text-sm text-slate-600 mb-4">Keep learning to grow your streak!</p>
                    <Link href="/pyqs" className="w-full">
                      <Button className="w-full">Solve PYQs</Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Usage Stats Card */}
          <Card className="mb-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white border-0 shadow-xl shadow-primary-100">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold opacity-90 uppercase tracking-widest">Daily Limit</span>
                    <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      {usage?.daily_usage || 0} / {usage?.daily_limit || 50} USED
                    </span>
                  </div>
                  <Progress
                    value={usage?.daily_usage || 0}
                    max={usage?.daily_limit || 50}
                    className="h-3 bg-white/20"
                  />
                  <p className="text-sm text-white/80 italic font-medium">
                    Resetting in approximately {24 - new Date().getHours()} hours
                  </p>
                </div>

                <div className="flex items-center gap-6 md:border-x border-white/20 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Monthly Total</p>
                    <p className="text-4xl font-black">{usage?.monthly_usage || 0}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${usage?.user_type === 'premium' ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-white'}`}>
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <p className="font-bold">{usage?.user_type?.toUpperCase() || 'FREE'} PLAN</p>
                      <p className="text-xs opacity-70">Active subscription</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-8">
                    Upgrade
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personalized Flashcards Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 fill-purple-500" />
                Personalized Learning Path
              </h2>
              {user?.career_path && (
                <Badge className="bg-purple-100 text-purple-700 border-0 font-bold uppercase text-[10px] tracking-widest px-3 py-1">
                  Focus: {user.career_path}
                </Badge>
              )}
            </div>

            <Card className="border-0 shadow-xl shadow-purple-100 bg-white overflow-hidden">
              <CardContent className="p-0">
                <div className="md:flex">
                  <div className="md:w-1/3 bg-gradient-to-br from-purple-600 to-indigo-700 p-8 text-white flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                        <Brain className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4">Daily AI Insights</h3>
                      <p className="opacity-80 text-sm leading-relaxed mb-6">
                        Based on your interest in <span className="font-bold underline">{user?.career_path || 'academic excellence'}</span>,
                        we've generated these tailored flashcards to keep you ahead.
                      </p>
                    </div>
                    <Link href="/ai-tools?tab=flashcards">
                      <Button className="w-full bg-white text-purple-700 hover:bg-slate-50 font-bold">
                        Full Practice Mode
                      </Button>
                    </Link>
                  </div>

                  <div className="md:w-2/3 p-6">
                    {isFlashcardsLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loading />
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {personalizedFlashcards.length > 0 ? (
                          personalizedFlashcards.map((flash, idx) => (
                            <div key={idx} className="group p-4 rounded-2xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question</span>
                                <Badge variant="default" className={`text-[10px] font-bold uppercase transition-colors ${flash.difficulty === 'hard' ? 'text-rose-500 border-rose-200 bg-rose-50' :
                                  flash.difficulty === 'medium' ? 'text-amber-500 border-amber-200 bg-amber-50' :
                                    'text-emerald-500 border-emerald-200 bg-emerald-50'
                                  }`}>
                                  {flash.difficulty}
                                </Badge>
                              </div>
                              <p className="font-bold text-slate-800 mb-3 group-hover:text-purple-700 transition-colors">
                                {flash.question}
                              </p>
                              <div className="mt-4 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                                  <span className="font-bold text-purple-600">Answer:</span> {flash.answer}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-48 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-4">
                              <Target className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-400">No profile data found</h4>
                            <p className="text-sm text-slate-400 max-w-xs mt-2">
                              Update your career path and exams in the profile to get personalized insights!
                            </p>
                            <Link href="/profile" className="mt-4">
                              <Button variant="outline" size="sm">Go to Profile</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Modules Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              {user?.course_name ? `Your Course: ${user.course_name}` : 'Study Modules'}
            </h2>

            {isModulesLoading ? (
              <div className="flex justify-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Loading />
              </div>
            ) : modules.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {modules.slice(0, 4).map((mod, idx) => (
                  <Link key={idx} href={`/pyqs`}>
                    <Card className="hover:border-primary-500 hover:shadow-lg transition-all cursor-pointer h-full border-0 shadow-sm bg-white overflow-hidden group">
                      <div className="h-2 bg-primary-500" />
                      <CardContent className="p-5">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-primary-600 transition-colors">
                          {mod.name}
                        </h3>
                        <p className="text-xs text-slate-500">Module {mod.module_number}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">
                  {user?.course_name
                    ? `No modules found for "${user.course_name}"`
                    : "Add your course name in settings to see relevant modules"}
                </p>
                <Link href="/profile" className="inline-block mt-4">
                  <Button variant="outline" size="sm">Update Profile</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={index} href={action.href}>
                    <Card className="hover:border-primary-500 hover:shadow-lg hover:shadow-primary-50 transition-all cursor-pointer h-full group">
                      <CardContent className="p-5 text-center">
                        <div className={`w-14 h-14 mx-auto mb-4 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary-600">{action.label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity & Tips */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Recent Activity</h3>
                <Button variant="ghost" size="sm" className="text-primary-600 text-xs font-bold">VIEW ALL</Button>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activity.type === 'summary' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'flashcard' ? 'bg-purple-100 text-purple-600' :
                            activity.type === 'pyq' ? 'bg-indigo-100 text-indigo-600' :
                              'bg-orange-100 text-orange-600'
                          }`}>
                          {activity.type === 'summary' && <Sparkles className="w-6 h-6" />}
                          {activity.type === 'flashcard' && <Brain className="w-6 h-6" />}
                          {activity.type === 'pyq' && <FileQuestion className="w-6 h-6" />}
                          {activity.type === 'prep' && <Lightbulb className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{activity.title}</p>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.time}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold uppercase text-[10px] tracking-widest">{activity.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Study Tips */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="px-6 py-4 bg-white border-b border-slate-100">
                <h3 className="font-bold text-slate-900">💡 Study Smart Tips</h3>
              </div>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 mb-1">Active Recall with PYQs</p>
                      <p className="text-sm text-slate-600">Testing yourself with past questions is 3x more effective than passive reading.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-600">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 mb-1">Spaced Repetition Flashcards</p>
                      <p className="text-sm text-slate-600">Review your AI-generated flashcards every 2 days to move facts to long-term memory.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-600">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 mb-1">The 80/20 Rule</p>
                      <p className="text-sm text-slate-600">Focus on the 'One-Night Prep' summaries as they cover the most high-yield exam topics.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50">
                  <Link href="/ai-tools" className="flex items-center justify-center gap-2 text-primary-600 font-bold hover:gap-3 transition-all">
                    Explore all AI study tools
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

