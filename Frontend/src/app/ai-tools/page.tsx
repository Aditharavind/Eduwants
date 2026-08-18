'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { aiAPI, academicAPI } from '@/lib/api';
import { getErrorMessage, SUMMARY_LENGTHS } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, Button, Input, Textarea, Loading } from '@/components/ui';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Brain,
  FileQuestion,
  Camera,
  Image as ImageIcon,
  Lightbulb,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Wand2,
  FileText,
  Zap,
} from 'lucide-react';

type ToolType = 'summarize' | 'flashcards' | 'pyq' | 'ocr' | 'prep' | 'image-notes';

interface Tool {
  id: ToolType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const tools: Tool[] = [
  { id: 'summarize', label: 'Summarize', icon: Sparkles, description: 'Get concise summaries of your study material', color: 'from-blue-500 to-cyan-500' },
  { id: 'flashcards', label: 'Flashcards', icon: Brain, description: 'Generate flashcards for effective revision', color: 'from-purple-500 to-pink-500' },
  { id: 'pyq', label: 'Solve PYQ', icon: FileQuestion, description: 'Solve past year questions with explanations', color: 'from-indigo-500 to-purple-500' },
  { id: 'prep', label: 'One-Night Prep', icon: Lightbulb, description: 'Quick exam preparation for high-yield topics', color: 'from-orange-500 to-red-500' },
  { id: 'ocr', label: 'OCR Scan', icon: Camera, description: 'Extract text from images and documents', color: 'from-green-500 to-emerald-500' },
  { id: 'image-notes', label: 'Image to Notes', icon: ImageIcon, description: 'Convert images to structured notes', color: 'from-pink-500 to-rose-500' },
];

export default function AIToolsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, usage, updateUsage, fetchUsage } = useAuthStore();
  const [activeTool, setActiveTool] = useState<ToolType>('summarize');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Form states
  const [text, setText] = useState('');
  const [summaryLength, setSummaryLength] = useState('medium');
  const [flashcardCount, setFlashcardCount] = useState(5);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const tab = searchParams.get('tab');
    if (tab && tools.find(t => t.id === tab)) {
      setActiveTool(tab as ToolType);

      // Handle auto-generation for flashcards
      if (tab === 'flashcards' && searchParams.get('auto') === 'true') {
        handleAutoFlashcards();
      }
    }
  }, [isAuthenticated, router, searchParams]);

  const handleAutoFlashcards = async () => {
    setIsLoading(true);
    try {
      const res = await academicAPI.getMyNotes();
      const myNotes = res.data;
      if (myNotes && myNotes.length > 0) {
        // Use content of the most recent note
        const latestNote = myNotes[0];
        setText(latestNote.content);

        // Short delay to ensure state is set before triggering submit
        setTimeout(() => {
          handleSubmit(latestNote.content);
        }, 100);
      } else {
        toast.error('No notes found to generate flashcards from!');
        setIsLoading(false);
      }
    } catch (err) {
      toast.error('Failed to fetch notes for flashcards');
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Image must be less than 20MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (overrideText?: string) => {
    const textToUse = overrideText || text;
    if (!textToUse.trim() && !imageFile) {
      toast.error('Please provide input');
      return;
    }

    if (usage?.remaining_today === 0) {
      toast.error('Daily AI limit reached. Upgrade for more credits.');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      let response;

      switch (activeTool) {
        case 'summarize':
          response = await aiAPI.summarize(textToUse, summaryLength);
          setResult(response.data.result);
          break;

        case 'flashcards':
          response = await aiAPI.generateFlashcards(textToUse, flashcardCount);
          setResult(response.data.result);
          break;

        case 'pyq':
          response = await aiAPI.solvePyq(textToUse);
          setResult(response.data.result);
          break;

        case 'prep':
          response = await aiAPI.oneNightPrep(textToUse);
          setResult(response.data.result);
          break;

        case 'ocr':
          if (!imageFile) throw new Error('Image required');
          response = await aiAPI.ocr(imageFile);
          setResult(response.data.extracted_text || response.data.result);
          break;

        case 'image-notes':
          if (!imageFile) throw new Error('Image required');
          response = await aiAPI.imageToNotes(imageFile);
          setResult(response.data.result);
          break;
      }

      fetchUsage();
      toast.success('AI processing complete!');
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return null;
  }

  const activeToolData = tools.find(t => t.id === activeTool)!;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Study Tools</h1>
            <p className="text-slate-600">Powered by advanced AI to supercharge your learning</p>
          </div>

          {/* Tool Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id);
                    setResult('');
                    setText('');
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${activeTool === tool.id
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tool.label}
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <Card>
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${activeToolData.color} rounded-xl flex items-center justify-center`}>
                    <activeToolData.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{activeToolData.label}</h3>
                    <p className="text-sm text-slate-500">{activeToolData.description}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                {(activeTool === 'ocr' || activeTool === 'image-notes') ? (
                  <div className="space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                      ) : (
                        <>
                          <Camera className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                          <p className="text-slate-600 mb-2">Click to upload image</p>
                          <p className="text-sm text-slate-400">Max 20MB, PNG, JPG supported</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {imageFile && (
                      <Button variant="outline" onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }} className="w-full">
                        Remove Image
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`Enter your ${activeToolData.label.toLowerCase()} request...`}
                      rows={10}
                    />

                    {activeTool === 'summarize' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Summary Length</label>
                        <div className="flex gap-2">
                          {SUMMARY_LENGTHS.map((length) => (
                            <button
                              key={length.value}
                              onClick={() => setSummaryLength(length.value)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${summaryLength === length.value
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                              {length.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTool === 'flashcards' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Number of Flashcards: {flashcardCount}
                        </label>
                        <input
                          type="range"
                          min="3"
                          max="20"
                          value={flashcardCount}
                          onChange={(e) => setFlashcardCount(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <Button
                    onClick={() => handleSubmit()}
                    isLoading={isLoading}
                    disabled={(!text.trim() && !imageFile) || usage?.remaining_today === 0}
                    className="w-full"
                    size="lg"
                  >
                    <Wand2 className="w-5 h-5 mr-2" />
                    {isLoading ? 'Processing...' : `Generate ${activeToolData.label}`}
                  </Button>

                  {usage?.remaining_today !== undefined && usage.remaining_today < 10 && (
                    <p className="text-center text-sm text-orange-600 mt-3">
                      Only {usage.remaining_today} AI credits remaining today
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Result Section */}
            <Card>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Result</h3>
                {result && (
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
                  </Button>
                )}
              </div>

              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loading size="lg" />
                    <p className="text-slate-500 mt-4">AI is processing your request...</p>
                  </div>
                ) : result ? (
                  <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                      {result}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500">Your result will appear here</p>
                    <p className="text-sm text-slate-400 mt-1">Enter text or upload an image to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

