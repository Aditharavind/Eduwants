'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Sparkles,
  Brain,
  FileQuestion,
  BookOpen,
  Zap,
  Shield,
  Users,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Lightbulb,
  Target,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI Summarizer',
    description: 'Get instant, intelligent summaries of your study materials. Extract key concepts in seconds.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Brain,
    title: 'Flashcard Generator',
    description: 'Automatically generate flashcards from your notes for effective spaced repetition.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: FileQuestion,
    title: 'PYQ Solver',
    description: 'Solve past year questions with step-by-step explanations and expert solutions.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BookOpen,
    title: 'Smart Notes',
    description: 'Organize and access your notes anywhere. AI-enhanced for better retention.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Lightbulb,
    title: 'One-Night Prep',
    description: 'Crack your exams overnight with focused AI-powered study sessions.',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Target,
    title: 'OCR Scanner',
    description: 'Scan and digitize handwritten notes, diagrams, and textbooks instantly.',
    color: 'from-pink-500 to-rose-500',
  },
];

const stats = [
  { value: '50+', label: 'AI Credits Daily' },
  { value: '10K+', label: 'Students' },
  { value: '500+', label: 'Subjects' },
  { value: '99.9%', label: 'Uptime' },
];

const testimonials = [
  {
    quote: "EduWants transformed how I study. The AI summaries save me hours every week!",
    author: "Priya Sharma",
    role: "Engineering Student",
    avatar: "P",
  },
  {
    quote: "The flashcard generator is a game-changer. I remember everything for my exams now.",
    author: "Rahul Kumar",
    role: "Medical Student",
    avatar: "R",
  },
  {
    quote: "One-night prep feature helped me crack my semester exams. Highly recommended!",
    author: "Ananya Gupta",
    role: "Commerce Student",
    avatar: "A",
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-30 animate-float" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full text-primary-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Powered by Advanced AI
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-900 via-primary-600 to-purple-600 bg-clip-text text-transparent">
                Learn Smarter,
              </span>
              <br />
              <span className="text-slate-900">Not Harder</span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Transform your learning experience with AI-powered study tools. 
              Get instant summaries, generate flashcards, solve past questions, 
              and ace your exams with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-slate-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Powerful AI Study Tools
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to excel in your studies, powered by cutting-edge AI technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              How EduWants Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get started in minutes and transform your learning experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', description: 'Sign up in seconds with your email or social login.' },
              { step: '02', title: 'Upload Content', description: 'Add your notes, textbooks, or past papers to the platform.' },
              { step: '03', title: 'Learn Smarter', description: 'Let AI generate summaries, flashcards, and practice questions.' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-primary-100 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-transparent" style={{ width: 'calc(100% - 2rem)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Loved by Students
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Join thousands of students who are already learning smarter with EduWants.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.author}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-slate-600 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full" />
            
            <div className="relative">
              <GraduationCap className="w-16 h-16 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Join EduWants today and get 50+ AI credits daily to power your studies.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-lg"
              >
                Start Learning Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-4 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">10K+ Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Instant Results</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

