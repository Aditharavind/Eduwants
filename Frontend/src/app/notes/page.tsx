'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { academicAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, Button, Textarea, Loading, Badge, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Tag,
  X,
  Save,
} from 'lucide-react';

interface Note {
  id: number;
  title: string;
  content: string;
  module?: number;
  module_name?: string;
  is_public: boolean;
  user: number;
  user_name?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export default function NotesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_public: false,
    tags: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchNotes();
  }, [isAuthenticated, router]);

  const fetchNotes = async () => {
    try {
      const response = await academicAPI.getMyNotes();
      setNotes(response.data);
    } catch (error) {
      toast.error('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editingNote) {
        await academicAPI.updateNote(editingNote.id, data);
        toast.success('Note updated successfully');
      } else {
        await academicAPI.createNote(data);
        toast.success('Note created successfully');
      }

      setShowModal(false);
      setEditingNote(null);
      setFormData({ title: '', content: '', is_public: false, tags: '' });
      fetchNotes();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await academicAPI.deleteNote(id);
      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      is_public: note.is_public,
      tags: note.tags?.join(', ') || '',
    });
    setShowModal(true);
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">My Notes</h1>
              <p className="text-slate-600">Organize and manage your study notes</p>
            </div>
            <Button onClick={() => {
              setEditingNote(null);
              setFormData({ title: '', content: '', is_public: false, tags: '' });
              setShowModal(true);
            }}>
              <Plus className="w-5 h-5 mr-2" />
              Create Note
            </Button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Notes Grid */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No notes yet</h3>
                <p className="text-slate-500 mb-4">Create your first note to get started</p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredNotes.map((note) => (
                <Card key={note.id} hover>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 text-lg line-clamp-1">{note.title}</h3>
                      <Badge variant={note.is_public ? 'info' : 'default'}>
                        {note.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-4 line-clamp-3">{note.content}</p>
                    
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {note.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-slate-400 text-xs">+{note.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(note)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(note.id)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-fadeIn">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingNote ? 'Edit Note' : 'Create Note'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <Input
                    label="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter note title"
                    required
                  />
                  
                  <Textarea
                    label="Content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your note content here..."
                    rows={10}
                    required
                  />

                  <Input
                    label="Tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Comma-separated tags (e.g., physics, formulas, chapter-3)"
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="is_public" className="text-sm text-slate-700">
                      Make this note public
                    </label>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    {editingNote ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

