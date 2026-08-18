'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import {
    Users, Zap, TrendingUp, Database, BookOpen, FileText,
    Upload, Plus, Trash2, RefreshCw, LogOut, Key, ChevronRight,
    BarChart2, Shield, CheckCircle, XCircle, X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Stats {
    total_users: number;
    total_tokens_used: number;
    total_ai_requests: number;
    total_cost_usd: number;
    daily_breakdown: any[];
    endpoint_stats: any[];
    databank: { subjects: number; documents: number; pyq_sessions: number };
}

interface SubjectItem {
    id: number;
    name: string;
    slug: string;
    document_count: number;
    is_indexed: boolean;
}

interface DocItem {
    id: number;
    filename: string;
    page_count: number;
    chunk_count: number;
    is_indexed: boolean;
    uploaded_at: string;
}

type Tab = 'overview' | 'users' | 'databank' | 'settings';

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
    const [tab, setTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showNewSubject, setShowNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectDesc, setNewSubjectDesc] = useState('');
    const [showChangePass, setShowChangePass] = useState(false);
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');

    // State for Hierarchy
    const [univs, setUnivs] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);

    const [selectedUniv, setSelectedUniv] = useState<any>(null);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [selectedSem, setSelectedSem] = useState<any>(null);
    const [selectedModule, setSelectedModule] = useState<any>(null);
    const [papers, setPapers] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState<number | null>(null);

    const [showNewUniv, setShowNewUniv] = useState(false);
    const [showNewCourse, setShowNewCourse] = useState(false);
    const [showNewSem, setShowNewSem] = useState(false);
    const [showNewModule, setShowNewModule] = useState(false);
    const [showNewPaper, setShowNewPaper] = useState(false);

    // Form states
    const [univName, setUnivName] = useState('');
    const [univLoc, setUnivLoc] = useState('');
    const [courseName, setCourseName] = useState('');
    const [courseLevel, setCourseLevel] = useState<'UG' | 'PG'>('UG');
    const [semNumber, setSemNumber] = useState(1);
    const [modName, setModName] = useState('');
    const [modNumber, setModNumber] = useState(1);
    const [modPdf, setModPdf] = useState<File | null>(null);

    // Paper form state
    const [paperYear, setPaperYear] = useState(new Date().getFullYear());
    const [paperType, setPaperType] = useState('end');
    const [paperFile, setPaperFile] = useState<File | null>(null);

    const checkAuth = useCallback(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin');
            return false;
        }
        return true;
    }, [router]);

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefresh');
        localStorage.removeItem('adminUser');
        router.push('/admin');
    };

    const loadStats = useCallback(async () => {
        try {
            const res = await adminAPI.getStats();
            setStats(res.data);
        } catch (e: any) {
            if (e.response?.status === 401 || e.response?.status === 403) {
                logout();
            }
        }
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            const res = await adminAPI.getUsers();
            setUsers(res.data.users || []);
        } catch { }
    }, []);

    const loadUnivs = useCallback(async () => {
        try {
            const res = await adminAPI.universities.list();
            setUnivs(res.data.results || res.data);
        } catch { }
    }, []);

    const loadCourses = useCallback(async (univId: number) => {
        try {
            const res = await adminAPI.courses.list(univId);
            setCourses(res.data.results || res.data);
        } catch { }
    }, []);

    const loadSemesters = useCallback(async (courseId: number) => {
        try {
            const res = await adminAPI.semesters.list(courseId);
            setSemesters(res.data.results || res.data);
        } catch { }
    }, []);

    const loadModules = useCallback(async (semId: number) => {
        try {
            const res = await adminAPI.modules.list(semId);
            setModules(res.data.results || res.data);
        } catch { }
    }, []);

    const loadDocs = useCallback(async (moduleId?: number) => {
        if (!moduleId) return;
        try {
            const res = await adminAPI.getDocuments(moduleId); // Backend needs to handle module filter or we update API
            setDocs(res.data.results || res.data);
        } catch { }
    }, []);

    useEffect(() => {
        if (!checkAuth()) return;
        setLoading(false);
        loadStats();
        loadUnivs();
        loadUsers();
    }, [checkAuth, loadStats, loadUnivs, loadUsers]);

    useEffect(() => {
        if (selectedUniv) loadCourses(selectedUniv.id);
        else { setCourses([]); setSelectedCourse(null); }
    }, [selectedUniv, loadCourses]);

    useEffect(() => {
        if (selectedCourse) loadSemesters(selectedCourse.id);
        else { setSemesters([]); setSelectedSem(null); }
    }, [selectedCourse, loadSemesters]);

    useEffect(() => {
        if (selectedSem) loadModules(selectedSem.id);
        else { setModules([]); setSelectedModule(null); }
    }, [selectedSem, loadModules]);

    useEffect(() => {
        if (selectedModule) loadDocs(selectedModule.id);
        else setDocs([]);
    }, [selectedModule, loadDocs]);

    const handleUserAction = async (userId: number, action: 'blacklist' | 'whitelist' | 'delete') => {
        if (action === 'delete' && !confirm('Are you sure you want to delete this user?')) return;
        try {
            await adminAPI.manageUser(userId, action);
            toast.success(`User ${action}ed`);
            loadUsers();
            loadStats();
        } catch {
            toast.error(`Failed to ${action} user`);
        }
    };

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedModule || !e.target.files?.[0]) return;
        const file = e.target.files[0];
        if (!file.name.endsWith('.pdf')) { toast.error('Only PDF files allowed'); return; }

        setUploading(true);
        try {
            await adminAPI.uploadPDF(selectedModule.id, file, true);
            toast.success(`"${file.name}" uploaded and indexed!`);
            loadDocs(selectedModule.id);
            loadStats();
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminAPI.changePassword(currentPass, newPass);
            toast.success('Password changed successfully');
            setShowChangePass(false);
            setCurrentPass('');
            setNewPass('');
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to change password');
        }
    };

    const handleAddUniv = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminAPI.universities.create({ name: univName, location: univLoc });
            toast.success('University added successfully');
            setShowNewUniv(false);
            setUnivName(''); setUnivLoc('');
            loadUnivs();
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to add university');
        }
    };

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUniv) return;
        try {
            await adminAPI.courses.create({ university: selectedUniv.id, name: courseName, level: courseLevel });
            toast.success('Course added successfully');
            setShowNewCourse(false);
            setCourseName('');
            loadCourses(selectedUniv.id);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to add course');
        }
    };

    const handleAddSem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;
        try {
            await adminAPI.semesters.create({ course: selectedCourse.id, semester_number: semNumber });
            toast.success('Semester added successfully');
            setShowNewSem(false);
            setSemNumber(semNumber + 1);
            loadSemesters(selectedCourse.id);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to add semester');
        }
    };

    const handleAddMod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSem) return;
        try {
            await adminAPI.modules.create({
                semester: selectedSem.id,
                name: modName,
                module_number: modNumber,
                pdf: modPdf || undefined
            });
            toast.success('Module added successfully');
            setShowNewModule(false);
            setModName(''); setModNumber(modNumber + 1);
            setModPdf(null);
            loadModules(selectedSem.id);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to add module');
        }
    };

    const handleDeleteModule = async (id: number) => {
        if (!confirm('Are you sure you want to delete this module and all its contents?')) return;
        try {
            await adminAPI.modules.delete(id);
            toast.success('Module deleted successfully');
            if (selectedModule?.id === id) setSelectedModule(null);
            if (selectedSem) loadModules(selectedSem.id);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to delete module');
        }
    };

    const handleReindexModule = async (id: number) => {
        toast.loading('Re-indexing all PDFs...', { id: 'reindex' });
        try {
            const res = await adminAPI.modules.reindex(id);
            toast.success(res.data.message || 'Re-indexing complete', { id: 'reindex' });
            if (selectedModule?.id === id) loadDocs(selectedModule.id);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to re-index module', { id: 'reindex' });
        }
    };

    const loadPapers = async (semId: number) => {
        try {
            const res = await adminAPI.questionPapers.list(semId);
            setPapers(res.data.results || res.data);
        } catch (e) {
            toast.error('Failed to load papers');
        }
    };

    const handleCreatePaper = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paperFile || !selectedSem) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('university', selectedUniv.id.toString());
        formData.append('course', selectedCourse.id.toString());
        formData.append('semester', selectedSem.id.toString());
        formData.append('year', paperYear.toString());
        formData.append('exam_type', paperType);
        formData.append('file', paperFile);

        try {
            await adminAPI.questionPapers.create(formData);
            toast.success('Paper uploaded successfully');
            setShowNewPaper(false);
            setPaperFile(null);
            loadPapers(selectedSem.id);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to upload paper');
        } finally {
            setUploading(false);
        }
    };

    const handleAnalyzePaper = async (paperId: number) => {
        setIsAnalyzing(paperId);
        toast.loading('AI is analyzing patterns...', { id: 'analyze' });
        try {
            const res = await adminAPI.questionPapers.analyze(paperId);
            toast.success(`Analysis Complete: ${res.data.repeated} matches found!`, { id: 'analyze' });
            if (selectedSem) loadPapers(selectedSem.id);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Analysis failed', { id: 'analyze' });
        } finally {
            setIsAnalyzing(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.total_users ?? '—', icon: Users, color: 'purple', sub: 'registered students' },
        { label: 'Total Tokens', value: stats?.total_tokens_used?.toLocaleString() ?? '—', icon: Zap, color: 'yellow', sub: 'AI tokens used' },
        { label: 'AI Requests', value: stats?.total_ai_requests?.toLocaleString() ?? '—', icon: TrendingUp, color: 'green', sub: 'total API calls' },
        { label: 'PYQ Sessions', value: stats?.databank?.pyq_sessions ?? '—', icon: BookOpen, color: 'blue', sub: 'practice sessions' },
    ];

    const colorMap: Record<string, string> = {
        purple: 'from-purple-600 to-purple-800',
        yellow: 'from-amber-500 to-orange-600',
        green: 'from-emerald-500 to-teal-600',
        blue: 'from-blue-500 to-indigo-600',
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            {/* Sidebar */}
            <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-white/5 flex flex-col z-40">
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm">EduWants Admin</p>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">System Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {([
                        { id: 'overview', label: 'Overview', icon: BarChart2 },
                        { id: 'users', label: 'User Control', icon: Users },
                        { id: 'databank', label: 'Data Hierarchy', icon: Database },
                        { id: 'settings', label: 'Security', icon: Key },
                    ] as const).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${tab === id
                                ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg shadow-purple-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-3">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-64 p-8 min-h-screen">
                {/* Overview Tab */}
                {tab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Platform Health</h1>
                                <p className="text-slate-400 text-sm mt-1">Live metrics and resource consumption</p>
                            </div>
                            <button
                                onClick={() => { loadStats(); loadUnivs(); loadUsers(); }}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm transition"
                            >
                                <RefreshCw className="w-4 h-4" /> Sync Stats
                            </button>
                        </div>

                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                            {statCards.map(({ label, value, icon: Icon, color, sub }) => (
                                <div
                                    key={label}
                                    className="group relative p-6 rounded-2xl bg-slate-900 border border-white/5 overflow-hidden transition-all hover:border-white/10"
                                >
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorMap[color]} opacity-[0.03] rounded-bl-full group-hover:opacity-[0.06] transition-opacity`} />
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-bold text-white mb-1">{value}</p>
                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
                                    <p className="text-slate-500 text-[10px] mt-3 font-semibold tracking-wide">{sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Middle Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Endpoint Usage */}
                            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    AI Workload Distribution
                                </h3>
                                <div className="space-y-4">
                                    {stats?.endpoint_stats?.slice(0, 5).map((ep: any) => (
                                        <div key={ep.endpoint} className="group">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-slate-300 font-medium">{ep.endpoint}</span>
                                                <span className="text-slate-500 font-bold">{ep.count} req</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${(ep.count / (stats.endpoint_stats[0]?.count || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Data Resource Map */}
                            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                                <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                                    <Database className="w-5 h-5 text-blue-500" />
                                    Repository Intelligence
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Indexed Nodes', value: stats?.databank?.subjects ?? 0, icon: BookOpen, color: 'text-purple-400' },
                                        { label: 'Total Corpora', value: stats?.databank?.documents ?? 0, icon: FileText, color: 'text-blue-400' },
                                        { label: 'Est. Operational Cloud Cost', value: `$${stats?.total_cost_usd?.toFixed(3)}`, icon: Zap, color: 'text-amber-400' },
                                        { label: 'Avg Latency', value: '142ms', icon: TrendingUp, color: 'text-green-400' },
                                    ].map((item) => (
                                        <div key={item.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">{item.label}</p>
                                            <div className="flex items-center gap-2">
                                                <item.icon className={`w-4 h-4 ${item.color}`} />
                                                <p className="text-xl font-bold">{item.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {tab === 'users' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold">User Central</h1>
                                <p className="text-slate-400 text-sm mt-1">Manage permissions and monitor student activity</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-400 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    {users.length} Active Users
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-white/5 text-slate-400 uppercase text-[10px] tracking-widest font-bold">
                                        <th className="text-left px-6 py-4">Student Identity</th>
                                        <th className="text-left px-6 py-4">Resource Burn</th>
                                        <th className="text-left px-6 py-4">Activity</th>
                                        <th className="text-center px-6 py-4 w-32">Status</th>
                                        <th className="text-right px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-400">
                                                        {u.username[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-200">{u.username}</p>
                                                        <p className="text-slate-500 text-xs">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between w-32 text-[10px]">
                                                        <span className="text-slate-500 uppercase font-bold text-xs">{u.monthly_ai_usage} / 10K</span>
                                                    </div>
                                                    <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-purple-500" style={{ width: `${(u.monthly_ai_usage / 10000) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-slate-400 text-xs font-medium">Joined {new Date(u.date_joined).toLocaleDateString()}</p>
                                                <p className="text-slate-600 text-[10px] uppercase font-bold mt-1">Last Active 2h ago</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {u.is_blacklisted ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-400/10 text-red-500 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
                                                        Blacklisted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-400/10 text-green-500 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {u.is_blacklisted ? (
                                                        <button
                                                            onClick={() => handleUserAction(u.id, 'whitelist')}
                                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                                            title="Unblock User"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUserAction(u.id, 'blacklist')}
                                                            className="p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-all border border-orange-500/20"
                                                            title="Block User"
                                                        >
                                                            < Shield className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleUserAction(u.id, 'delete')}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                                                        title="Terminate Account"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* DataBank Tab - Hierarchical Management */}
                {tab === 'databank' && (
                    <div className="animate-in fade-in duration-500 flex flex-col h-[calc(100vh-160px)]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold">Data Architecture</h1>
                                <p className="text-slate-400 text-sm mt-1">Univ → Course → Sem → Module hierarchy</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 flex-1 overflow-hidden">
                            {/* Universities */}
                            <div className="bg-slate-900 border border-white/5 rounded-2xl flex flex-col">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400">University</h3>
                                    <button onClick={() => setShowNewUniv(true)} className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {univs.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedUniv(u);
                                                setSelectedCourse(null);
                                                setSelectedSem(null);
                                                setSelectedModule(null);
                                                loadCourses(u.id);
                                            }}
                                            className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center justify-between group ${selectedUniv?.id === u.id ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'}`}
                                        >
                                            <span className="truncate">{u.name}</span>
                                            <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${selectedUniv?.id === u.id ? 'opacity-100' : ''}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Courses */}
                            <div className="bg-slate-900 border border-white/5 rounded-2xl flex flex-col">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400">Course</h3>
                                    <button disabled={!selectedUniv} onClick={() => setShowNewCourse(true)} className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {!selectedUniv ? (
                                        <p className="text-[10px] text-slate-600 text-center mt-12 px-4 uppercase font-bold tracking-tighter">Select Univ First</p>
                                    ) : courses.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedCourse(c)}
                                            className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center justify-between group ${selectedCourse?.id === c.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="truncate">{c.name}</span>
                                                <span className={`text-[10px] ${selectedCourse?.id === c.id ? 'text-blue-200' : 'text-slate-500'}`}>{c.level}</span>
                                            </div>
                                            <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${selectedCourse?.id === c.id ? 'opacity-100' : ''}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Semesters */}
                            <div className="bg-slate-900 border border-white/5 rounded-2xl flex flex-col">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400">Semester</h3>
                                    <button disabled={!selectedCourse} onClick={() => setShowNewSem(true)} className="p-1.5 rounded-lg bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white transition-all disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {!selectedCourse ? (
                                        <p className="text-[10px] text-slate-600 text-center mt-12 px-4 uppercase font-bold tracking-tighter">Select Course First</p>
                                    ) : semesters.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setSelectedSem(s);
                                                loadModules(s.id);
                                                loadPapers(s.id);
                                            }}
                                            className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center justify-between group ${selectedSem?.id === s.id ? 'bg-teal-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'}`}
                                        >
                                            <span>Sem {s.semester_number}</span>
                                            <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${selectedSem?.id === s.id ? 'opacity-100' : ''}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Modules */}
                            <div className="bg-slate-900 border border-white/5 rounded-2xl flex flex-col">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400">Module</h3>
                                    <button disabled={!selectedSem} onClick={() => setShowNewModule(true)} className="p-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white transition-all disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {!selectedSem ? (
                                        <p className="text-[10px] text-slate-600 text-center mt-12 px-4 uppercase font-bold tracking-tighter">Select Sem First</p>
                                    ) : modules.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModule(m)}
                                            className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center justify-between group ${selectedModule?.id === m.id ? 'bg-amber-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="truncate">{m.name}</span>
                                                <span className={`text-[10px] ${selectedModule?.id === m.id ? 'text-amber-200' : 'text-slate-500'}`}>Unit {m.module_number}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id); }}
                                                    className="p-1 rounded bg-black/20 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                                <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${selectedModule?.id === m.id ? 'opacity-100' : ''}`} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Document Management for Selected Module */}
                        {selectedModule && (
                            <div className="mt-8 p-6 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20">
                                            <Database className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">{selectedModule.name} Content</h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
                                                <span>{selectedUniv.name}</span>
                                                <ChevronRight className="w-2 h-2" />
                                                <span>{selectedCourse.name}</span>
                                                <ChevronRight className="w-2 h-2" />
                                                <span>Semester {selectedSem.semester_number}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleReindexModule(selectedModule.id)}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-white/5"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            RE-INDEX ALL
                                        </button>
                                        <label htmlFor="file-up" className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer ${uploading ? 'bg-slate-800' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'}`}>
                                            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {uploading ? 'INGESTING...' : 'INGEST PDF'}
                                        </label>
                                        <input id="file-up" type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {docs.length === 0 ? (
                                        <div className="col-span-full py-12 flex flex-col items-center gap-2 text-slate-600 border-2 border-dashed border-white/5 rounded-2xl">
                                            <FileText className="w-12 h-12 opacity-20" />
                                            <p className="font-bold uppercase tracking-widest text-[10px]">No Neural Data Found</p>
                                        </div>
                                    ) : docs.map(doc => (
                                        <div key={doc.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><FileText className="w-5 h-5" /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-200 truncate">{doc.filename}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-black">{doc.page_count} PAGES • {doc.chunk_count} CHUNKS</p>
                                            </div>
                                            {doc.is_indexed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Question Papers Section for Selected Semester */}
                        {selectedSem && (
                            <div className="mt-8 p-6 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
                                            <FileText className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Past Question Papers</h3>
                                            <p className="text-slate-400 text-xs mt-1">Managed papers for {selectedCourse?.name || 'Selected'} - Sem {selectedSem.semester_number}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowNewPaper(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-500/20"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload Paper
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {papers.length === 0 ? (
                                        <div className="col-span-full py-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                                            <FileText className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                                            <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">No papers uploaded for this semester</p>
                                        </div>
                                    ) : papers.map(paper => (
                                        <div key={paper.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-200">{paper.year} Paper</p>
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{paper.exam_type} SEMESTER</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {paper.is_analyzed ? (
                                                        <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest border border-green-500/20">Analyzed</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAnalyzePaper(paper.id)}
                                                            disabled={isAnalyzing === paper.id}
                                                            className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-50"
                                                        >
                                                            {isAnalyzing === paper.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                                            Analyze Patterns
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Uploaded {new Date(paper.created_at).toLocaleDateString()}</span>
                                                <a href={paper.file} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 transition">
                                                    <ChevronRight className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Security Tab */}
                {tab === 'settings' && (
                    <div className="animate-in fade-in duration-500 max-w-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center">
                                <Key className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Security & Access</h1>
                                <p className="text-slate-400 text-sm">Manage administrative credentials and security policies</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-900 border border-white/5 rounded-2xl p-8">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-purple-600" />
                                    Change Admin Password
                                </h3>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Admin Password</label>
                                        <input
                                            type="password"
                                            value={currentPass}
                                            onChange={(e) => setCurrentPass(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">New Admin Password</label>
                                        <input
                                            type="password"
                                            value={newPass}
                                            onChange={(e) => setNewPass(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Update Credentials
                                    </button>
                                </form>
                            </div>

                            <div className="bg-slate-900 border border-white/5 rounded-2xl p-8 opacity-50">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-500" />
                                    Session Management
                                </h3>
                                <p className="text-sm text-slate-400">Advanced session controls and IP blacklisting features are currently under development.</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals for Hierarchy Items */}
            {showNewUniv && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold">New University</h3>
                            <button onClick={() => setShowNewUniv(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddUniv} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">University Name</label>
                                <input type="text" value={univName} onChange={e => setUnivName(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition" placeholder="e.g. Tribhuvan University" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Location</label>
                                <input type="text" value={univLoc} onChange={e => setUnivLoc(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition" placeholder="e.g. Kathmandu, Nepal" />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-500/20">Add University</button>
                        </form>
                    </div>
                </div>
            )}

            {showNewCourse && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold">New Course for {selectedUniv?.name}</h3>
                            <button onClick={() => setShowNewCourse(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddCourse} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Course Name</label>
                                <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" placeholder="e.g. B.Sc. CSIT" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Degree Level</label>
                                <select value={courseLevel} onChange={e => setCourseLevel(e.target.value as any)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition">
                                    <option value="UG">Undergraduate (UG)</option>
                                    <option value="PG">Postgraduate (PG)</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/20">Add Course</button>
                        </form>
                    </div>
                </div>
            )}

            {showNewSem && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold">New Semester</h3>
                                <p className="text-xs text-slate-500">{selectedCourse?.name}</p>
                            </div>
                            <button onClick={() => setShowNewSem(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddSem} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Semester Number</label>
                                <input type="number" min="1" max="12" value={semNumber} onChange={e => setSemNumber(parseInt(e.target.value))} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 transition" required />
                            </div>
                            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-teal-500/20">Add Semester</button>
                        </form>
                    </div>
                </div>
            )}

            {showNewModule && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold">New Module</h3>
                                <p className="text-xs text-slate-500">Sem {selectedSem?.semester_number} - {selectedCourse?.name}</p>
                            </div>
                            <button onClick={() => setShowNewModule(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddMod} className="p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-24">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Unit</label>
                                    <input type="number" min="1" value={modNumber} onChange={e => setModNumber(parseInt(e.target.value))} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition" required />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Module Name</label>
                                    <input type="text" value={modName} onChange={e => setModName(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition" placeholder="e.g. Operating Systems" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Reference PDF (Optional)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={e => setModPdf(e.target.files?.[0] || null)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition text-slate-400"
                                />
                                <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold">This PDF will be used to generate PYQs for this module.</p>
                            </div>
                            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-amber-500/20">Add Module</button>
                        </form>
                    </div>
                </div>
            )}
            {showNewPaper && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold">New Question Paper</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">COURSE: {selectedCourse?.name}</p>
                            </div>
                            <button onClick={() => setShowNewPaper(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreatePaper} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Year</label>
                                    <input
                                        type="number"
                                        value={paperYear}
                                        onChange={e => setPaperYear(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Exam Type</label>
                                    <select
                                        value={paperType}
                                        onChange={e => setPaperType(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
                                    >
                                        <option value="mid">Mid Semester</option>
                                        <option value="end">End Semester</option>
                                        <option value="supple">Supplementary</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Question Paper PDF</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={e => setPaperFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        required
                                    />
                                    <div className="w-full bg-slate-950 border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-indigo-500/50 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                            {paperFile ? <CheckCircle className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-300">{paperFile ? paperFile.name : 'Select PDF File'}</p>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">Only PDF supported</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {uploading ? 'Uploading...' : 'Publish Question Paper'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
