'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { academicAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, Button, Loading, Badge, Input, Select } from '@/components/ui';
import toast from 'react-hot-toast';
import {
  Brain,
  Plus,
  Search,
  Edit,
  Trash2,
  RotateCw,
  Check,
  X,
  Save,
  BookOpen,
} from 'lucide-react';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  note?: number;
  note_title?: string;
  created_at: string;
}

export default function FlashcardsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    note: '',
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchFlashcards();
  }, [isAuthenticated, router]);

  const fetchFlashcards = async () => {
    try {
      const response = await academicAPI.getFlashcards();
      setFlashcards(response.data);
    } catch (error) {
      toast.error('Failed to load flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCard) {
        await academicAPI.updateFlashcard(editingCard.id, formData);
        toast.success('Flashcard updated');
      } else {
        await academicAPI.createFlashcard(formData);
        toast.success('Flashcard created');
      }

      setShowModal(false);
      setEditingCard(null);
      setFormData({ question: '', answer: '', note: '' });
      fetchFlashcards();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this flashcard?')) return;
    
    try {
      await academicAPI.deleteFlashcard(id);
      toast.success('Flashcard deleted');
      fetchFlashcards();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEditModal = (card: Flashcard) => {
    setEditingCard(card);
    setFormData({
      question: card.question,
      answer: card.answer,
      note: card.note?.toString() || '',
    });
    setShowModal(true);
  };

  const filteredCards = flashcards.filter(card =>
    card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % filteredCards.length), 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length), 150);
  };

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
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Flashcards</h1>
              <p className="text-slate-600">Study with AI-generated flashcards</p>
            </div>
            <Button onClick={() => {
              setEditingCard(null);
              setFormData({ question: '', answer: '', note: '' });
              setShowModal(true);
            }}>
              <Plus className="w-5 h-5 mr-2" />
              Create Flashcard
            </Button>
          </div>

          {/* Study Mode */}
          {filteredCards.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Study Mode</h2>
                  <p className="text-sm text-slate-500">Card {currentIndex + 1} of {filteredCards.length}</p>
                </div>

                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="min-h-[200px] bg-gradient-to-br from-primary-50 to-purple-50 rounded-xl p-8 flex items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                >
                  <div className="text-center">
                    {isFlipped ? (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Answer</p>
                        <p className="text-xl font-medium text-slate-900">{filteredCards[currentIndex].answer}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Question</p>
                        <p className="text-xl font-medium text-slate-900">{filteredCards[currentIndex].question}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-4">
                  <Button variant="outline" onClick={prevCard}>
                    <RotateCw className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button variant="outline" onClick={() => setIsFlipped(!isFlipped)}>
                    {isFlipped ? 'Show Question' : 'Show Answer'}
                  </Button>
                  <Button variant="outline" onClick={nextCard}>
                    Next
                    <RotateCw className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search flashcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Flashcards List */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : filteredCards.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Brain className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No flashcards yet</h3>
                <p className="text-slate-500 mb-4">Create flashcards or generate them from your notes</p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Flashcard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCards.map((card) => (
                <Card key={card.id} hover>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 mb-1">{card.question}</p>
                        <p className="text-sm text-slate-600">{card.answer}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(card)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(card.id)} className="text-red-500">
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fadeIn">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingCard ? 'Edit Flashcard' : 'Create Flashcard'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <Textarea
                    label="Question"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Enter the question"
                    rows={3}
                    required
                  />

                  <Textarea
                    label="Answer"
                    value={formData.answer}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    placeholder="Enter the answer"
                    rows={3}
                    required
                  />
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    {editingCard ? 'Update' : 'Create'}
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

