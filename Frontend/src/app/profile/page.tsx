'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { getErrorMessage, USER_TYPES, ACADEMIC_LEVELS } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, Button, Input, Loading } from '@/components/ui';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Edit,
  Save,
  X,
  Camera,
  Award,
  Calendar,
  TrendingUp,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, fetchUser, usage } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    academic_level: '',
    field_of_study: '',
    course_name: '',
    career_path: '',
    upcoming_exams: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        academic_level: user.academic_level || '',
        field_of_study: user.field_of_study || '',
        course_name: user.course_name || '',
        career_path: user.career_path || '',
        upcoming_exams: user.upcoming_exams?.join(', ') || '',
      });
    }
  }, [isAuthenticated, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSave = {
        ...formData,
        upcoming_exams: formData.upcoming_exams.split(',').map(e => e.trim()).filter(e => e !== '')
      };
      await authAPI.updateProfile(dataToSave);
      await fetchUser();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                    {user.first_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {user.first_name} {user.last_name}
                  </h1>
                  <p className="text-slate-500 mb-2">@{user.username}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {user.user_type}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                      {user.email}
                    </span>
                  </div>
                </div>

                <Button
                  variant={isEditing ? 'outline' : 'primary'}
                  onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 mx-auto text-primary-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{usage?.daily_limit || 50}</p>
                <p className="text-sm text-slate-500">Daily AI Credits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{usage?.remaining_today || 0}</p>
                <p className="text-sm text-slate-500">Credits Remaining</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{usage?.monthly_usage || 0}</p>
                <p className="text-sm text-slate-500">Monthly Usage</p>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Profile Information</h2>
            </div>

            <CardContent className="p-6">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      icon={<User className="w-5 h-5" />}
                    />
                    <Input
                      label="Last Name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    icon={<Phone className="w-5 h-5" />}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">User Type</label>
                      <select
                        value={user.user_type}
                        disabled
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                      >
                        {USER_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Academic Level</label>
                      <select
                        value={formData.academic_level}
                        onChange={(e) => setFormData({ ...formData, academic_level: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Level</option>
                        {ACADEMIC_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Input
                    label="Field of Study"
                    value={formData.field_of_study}
                    onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                    icon={<BookOpen className="w-5 h-5" />}
                  />

                  <Input
                    label="Course Name (as in DB)"
                    value={formData.course_name}
                    onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                    icon={<TrendingUp className="w-5 h-5" />}
                    placeholder="e.g. Computer Science, Mechanical Eng."
                  />

                  <Input
                    label="Career Path"
                    value={formData.career_path}
                    onChange={(e) => setFormData({ ...formData, career_path: e.target.value })}
                    icon={<Award className="w-5 h-5" />}
                    placeholder="e.g. Software Engineer, Doctor, etc."
                  />

                  <Input
                    label="Upcoming Exams"
                    value={formData.upcoming_exams}
                    onChange={(e) => setFormData({ ...formData, upcoming_exams: e.target.value })}
                    icon={<Calendar className="w-5 h-5" />}
                    placeholder="e.g. UPSC, Finals 2026, SAT (separate by comma)"
                  />

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" isLoading={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">First Name</span>
                    </div>
                    <span className="font-medium text-slate-900">{user.first_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Last Name</span>
                    </div>
                    <span className="font-medium text-slate-900">{user.last_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Email</span>
                    </div>
                    <span className="font-medium text-slate-900">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Phone</span>
                    </div>
                    <span className="font-medium text-slate-900">{user.phone || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Field of Study</span>
                    </div>
                    <span className="font-medium text-slate-900">{user.field_of_study || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Academic Level</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {ACADEMIC_LEVELS.find(l => l.value === user.academic_level)?.label || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Course Name</span>
                    </div>
                    <span className="font-medium text-slate-900">{user.course_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Career Path</span>
                    </div>
                    <span className="font-medium text-slate-900">{user.career_path || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-600">Upcoming Exams</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {user.upcoming_exams?.join(', ') || '-'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

