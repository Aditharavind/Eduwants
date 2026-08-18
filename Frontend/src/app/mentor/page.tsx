'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, Button, Badge, Progress } from '@/components/ui';
import {
    Send,
    Bot,
    User,
    Plus,
    Trash2,
    CheckCircle2,
    Circle,
    Clock,
    Music,
    StickyNote,
    Play,
    Pause,
    Square,
    X,
    Zap,
    Coffee,
    Brain,
    MessageSquareShare,
    Pin
} from 'lucide-react';
import { aiAPI, academicAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Task {
    id: number;
    description: string;
    is_completed: boolean;
    is_sticky: boolean;
}

export default function MentorPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'സഖാക്കളേ! Manavalan is here. വരിക സഖാക്കളേ, വരിക! What are we conquering today? ഓ മൈ ഗോഡ്, looks like you have some serious studying to do!' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [isPodramoMode, setIsPodramoMode] = useState(false);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [podramoLink, setPodramoLink] = useState('https://www.youtube.com/embed/skhZ7idMy0U?autoplay=1');
    const [showPodramoSettings, setShowPodramoSettings] = useState(false);
    const [tempLink, setTempLink] = useState('https://www.youtube.com/live/skhZ7idMy0U?si=JeXedivr52Ax6JeF');

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        let interval: any;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
            toast.success('സഖാക്കളേ! Time is up. Take a break! ഓ മൈ ഗോഡ്, what a session!');
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    const fetchTasks = async () => {
        try {
            const res = await academicAPI.getMentorTasks();
            setTasks(res.data);
        } catch (err) {
            toast.error('Failed to fetch tasks');
        }
    };

    const addTask = async () => {
        if (!newTaskText.trim()) return;
        try {
            const res = await academicAPI.createMentorTask({ description: newTaskText });
            setTasks([res.data, ...tasks]);
            setNewTaskText('');
            toast.success('Task added! സഖാക്കളേ!');
        } catch (err) {
            toast.error('Failed to add task');
        }
    };

    const toggleTask = async (id: number) => {
        try {
            await academicAPI.toggleTaskComplete(id);
            setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const toggleSticky = async (id: number) => {
        try {
            await academicAPI.toggleTaskSticky(id);
            setTasks(tasks.map(t => t.id === id ? { ...t, is_sticky: !t.is_sticky } : t));
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const deleteTask = async (id: number) => {
        try {
            await academicAPI.deleteMentorTask(id);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages([...messages, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.slice(-5); // Send last 5 messages for context
            const res = await aiAPI.mentorChat(input, history);
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.result }]);
        } catch (err) {
            toast.error('Manavalan is out of range! Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const updatePodramoLink = () => {
        // Extract ID from youtube link to make embed link
        let vidId = '';
        if (tempLink.includes('v=')) {
            vidId = tempLink.split('v=')[1].split('&')[0];
        } else if (tempLink.includes('/live/')) {
            vidId = tempLink.split('/live/')[1].split('?')[0];
        } else if (tempLink.includes('youtu.be/')) {
            vidId = tempLink.split('youtu.be/')[1].split('?')[0];
        }

        if (vidId) {
            setPodramoLink(`https://www.youtube.com/embed/${vidId}?autoplay=1`);
            setShowPodramoSettings(false);
            toast.success('Music link updated! സഖാക്കളേ!');
        } else {
            toast.error('Invalid YouTube link, ഓ മൈ ഗോഡ്!');
        }
    };

    if (isPodramoMode) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
                {/* Podramo Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse" />
                </div>

                {/* Podramo Header */}
                <header className="p-6 md:px-12 flex justify-between items-center z-10 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase italic">Podramo Mode</h1>
                            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">By Manavalan & Sons</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-white/10 rounded-full"
                        onClick={() => setIsPodramoMode(false)}
                    >
                        <X className="w-6 h-6 mr-2" />
                        Exit
                    </Button>
                </header>

                <main className="flex-1 p-6 md:p-12 grid lg:grid-cols-3 gap-8 z-10">
                    {/* Left Column: Music & Timer */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Timer Card */}
                        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
                            <CardContent className="p-12 flex flex-col items-center">
                                <div className="text-8xl md:text-9xl font-black tabular-nums tracking-tighter mb-8 drop-shadow-xl">
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="flex gap-4">
                                    <Button
                                        size="lg"
                                        className="h-16 px-10 text-xl font-bold rounded-2xl bg-white text-slate-900 hover:bg-slate-200"
                                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                                    >
                                        {isTimerRunning ? <Pause className="w-6 h-6 mr-2 fill-current" /> : <Play className="w-6 h-6 mr-2 fill-current" />}
                                        {isTimerRunning ? 'Pause' : 'Start Focus'}
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-16 px-10 text-xl border-white/20 text-white hover:bg-white/10 rounded-2xl"
                                        onClick={() => { setTimeLeft(25 * 60); setIsTimerRunning(false); }}
                                    >
                                        <Square className="w-6 h-6 mr-1" />
                                        Reset
                                    </Button>
                                </div>
                                <div className="mt-8 flex gap-3">
                                    <button onClick={() => setTimeLeft(25 * 60)}>
                                        <Badge className="bg-white/10 text-white hover:bg-white/20 cursor-pointer py-1 px-4">25:00 POMODORO</Badge>
                                    </button>
                                    <button onClick={() => setTimeLeft(5 * 60)}>
                                        <Badge className="bg-white/10 text-white hover:bg-white/20 cursor-pointer py-1 px-4">05:00 BREAK</Badge>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Music Card */}
                        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden h-[300px] relative">
                            <iframe
                                width="100%"
                                height="100%"
                                src={podramoLink}
                                title="YouTube music"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="rounded-xl opacity-80"
                            />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <Button
                                    size="sm"
                                    className="bg-black/60 backdrop-blur-md border border-white/20"
                                    onClick={() => setShowPodramoSettings(!showPodramoSettings)}
                                >
                                    <Music className="w-4 h-4 mr-2" />
                                    Change Station
                                </Button>
                            </div>

                            {showPodramoSettings && (
                                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 z-30">
                                    <h3 className="text-xl font-bold mb-4">Paste YouTube Link</h3>
                                    <input
                                        type="text"
                                        className="w-full max-w-md bg-white/10 border border-white/20 rounded-xl px-4 py-3 mb-4 text-white"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        value={tempLink}
                                        onChange={(e) => setTempLink(e.target.value)}
                                    />
                                    <div className="flex gap-4">
                                        <Button className="bg-purple-600 hover:bg-purple-500" onClick={updatePodramoLink}>Update Link</Button>
                                        <Button variant="ghost" onClick={() => setShowPodramoSettings(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Sticky Notes */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black flex items-center gap-3">
                            <StickyNote className="w-6 h-6 text-amber-400" />
                            STICKY TASKS
                        </h2>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                            {tasks.filter(t => t.is_sticky).length > 0 ? (
                                tasks.filter(t => t.is_sticky).map((task) => (
                                    <Card key={task.id} className="bg-amber-100/10 border-amber-500/30 backdrop-blur-sm relative group">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <button onClick={() => toggleTask(task.id)} className="mt-1">
                                                    {task.is_completed ? (
                                                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                                                    ) : (
                                                        <Circle className="w-6 h-6 text-amber-400" />
                                                    )}
                                                </button>
                                                <p className={`text-lg font-medium leading-tight ${task.is_completed ? 'line-through opacity-50' : 'text-amber-100'}`}>
                                                    {task.description}
                                                </p>
                                            </div>
                                            <Pin
                                                className="absolute top-2 right-2 w-4 h-4 text-amber-500 cursor-pointer"
                                                onClick={() => toggleSticky(task.id)}
                                            />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                                    <p className="text-slate-500 font-bold mb-2">No sticky tasks!</p>
                                    <p className="text-xs text-slate-600 uppercase tracking-widest">Pin tasks in regular chat to see them here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    {/* Left Side: Manavalan Mentor Chat */}
                    <div className="lg:col-span-8 flex flex-col h-[75vh] md:h-[82vh]">
                        <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-2xl rounded-[2rem] bg-white">
                            {/* Chat Header */}
                            <div className="px-8 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                                            <Bot className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black italic tracking-tighter">Manavalan Mentor</h2>
                                        <p className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                                            Dubai Business Legend
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    className="bg-black hover:bg-slate-900 text-white font-black uppercase italic tracking-tighter rounded-xl px-6"
                                    onClick={() => setIsPodramoMode(true)}
                                >
                                    Podramo Mode
                                </Button>
                            </div>

                            {/* Chat Messages */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30"
                            >
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-white shadow-md text-purple-600'
                                                }`}>
                                                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                            </div>
                                            <div className={`px-5 py-4 rounded-2xl shadow-sm text-sm font-medium ${msg.role === 'user'
                                                ? 'bg-primary-600 text-white rounded-tr-none'
                                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-md text-purple-600 flex items-center justify-center animate-pulse">
                                                <Bot className="w-5 h-5" />
                                            </div>
                                            <div className="px-5 py-4 bg-white rounded-2xl rounded-tl-none shadow-sm flex gap-2 items-center">
                                                <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce" />
                                                <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce delay-100" />
                                                <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce delay-200" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="p-6 bg-white border-t border-slate-100">
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder="Ask Manavalan anything... ഓ മൈ ഗോഡ്!"
                                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 border-0 focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-800"
                                    />
                                    <Button
                                        className="w-14 h-14 rounded-2xl bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200"
                                        onClick={sendMessage}
                                        disabled={isLoading}
                                    >
                                        <Send className="w-6 h-6" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Side: To-Do List */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="rounded-[2rem] border-0 shadow-xl bg-white overflow-hidden">
                            <div className="px-8 py-6 bg-slate-900 text-white flex items-center gap-3">
                                <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
                                <h2 className="text-xl font-black italic tracking-tighter uppercase">Focus List</h2>
                            </div>

                            <CardContent className="p-6">
                                <div className="flex gap-2 mb-6">
                                    <input
                                        type="text"
                                        value={newTaskText}
                                        onChange={(e) => setNewTaskText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addTask()}
                                        placeholder="Add a new goal..."
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    />
                                    <Button onClick={addTask} className="rounded-xl px-4">
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                </div>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                                    {tasks.length > 0 ? (
                                        tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className={`flex items-center justify-between p-4 rounded-2xl group transition-all ${task.is_completed ? 'bg-slate-50 opacity-60' : 'bg-slate-50/50 hover:bg-slate-100 border border-slate-100'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <button onClick={() => toggleTask(task.id)}>
                                                        {task.is_completed ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-slate-300" />
                                                        )}
                                                    </button>
                                                    <span className={`${task.is_completed ? 'line-through text-slate-400' : 'text-slate-700 font-bold'} text-sm leading-tight`}>
                                                        {task.description}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => toggleSticky(task.id)}
                                                        className={`p-2 rounded-lg hover:bg-amber-100 transition-colors ${task.is_sticky ? 'text-amber-600' : 'text-slate-400'}`}
                                                        title="Pin to Podramo"
                                                    >
                                                        <Pin className={`w-4 h-4 ${task.is_sticky ? 'fill-current' : ''}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteTask(task.id)}
                                                        className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Coffee className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-bold">No tasks yet!</p>
                                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Start by adding one above.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* motivational helper */}
                        <Card className="rounded-[2rem] bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center flex-shrink-0">
                                        <Brain className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-black italic tracking-tighter text-slate-900 uppercase">Tip from Dubai</h3>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                                            സഖാക്കളേ, study in blocks! Use Podramo mode for 25 minutes of deep focus. Don't check your phone, unless it's a message from me, obviously!
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
