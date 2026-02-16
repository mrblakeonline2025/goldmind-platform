import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, Enrollment, GroupInstance, Announcement, User, PlatformSettings, GroupFormat, RecurringSlot, BespokeOffer, StudentProfile } from './types';
import { supabase } from './lib/supabase';
import CourseCatalog from './components/CourseCatalog';
import AdvisorAI from './components/AdvisorAI';
import AdminPanel from './components/AdminPanel';
import LearningPortal from './components/LearningPortal';
import Login from './components/Login';
import Logo from './components/Logo';
import TutorApplicationForm from './components/TutorApplicationForm';
import BespokeOfferPage from './components/BespokeOfferPage';
import OnboardingGate from './components/OnboardingGate';

const INITIAL_SETTINGS: PlatformSettings = {
  supportEmail: 'support@goldmind.com',
  logoUrl: 'https://xftzmpmgmklpfgifzzqs.supabase.co/storage/v1/object/public/branding/goldmind-logo.png',
  companyName: 'GoldMind Tuition'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicView, setPublicView] = useState<'login' | 'tutor-apply' | 'bespoke'>('login');
  const [bespokeToken, setBespokeToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>(INITIAL_SETTINGS);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [instances, setInstances] = useState<GroupInstance[]>([]);
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'portal' | 'admin'>('catalog');
  const [highlightedSubject, setHighlightedSubject] = useState<string | null>(null);

  const currentUserRef = useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('bespoke');
    if (token) {
      setBespokeToken(token);
      setPublicView('bespoke');
    }
  }, []);

  const mapEnrollment = (e: any): Enrollment => ({
    id: e.id,
    packageId: e.package_id,
    instanceId: e.instance_id,
    enrolledAt: e.enrolled_at,
    notes: e.notes,
    studentName: e.student_name,
    studentId: e.student_id,
    paymentStatus: (e.payment_status || 'Pending') as 'Paid' | 'Pending'
  });

  const mapInstance = (i: any): GroupInstance => ({
    id: i.id,
    slotId: i.slot_id,
    packageId: i.package_id,
    label: i.label,
    dayOfWeek: i.day_of_week,
    startTime: i.start_time,
    durationMinutes: i.duration_minutes || 60,
    keyStage: i.key_stage,
    groupType: i.group_type as GroupFormat,
    maxCapacity: i.max_capacity,
    assignedTutorId: i.assigned_tutor_id,
    tutorName: i.profiles?.name || i.assigned_tutor_id,
    isBookingEnabled: i.is_booking_enabled,
    createdAt: i.created_at,
    sessionDate: i.session_date,
    classroomUrl: i.classroom_url,
    classroomProvider: i.classroom_provider,
    classroomNotes: i.classroom_notes,
    recordingUrl: i.recording_url
  });

  const mapSlot = (s: any): RecurringSlot => ({
    id: s.id,
    packageId: s.package_id,
    label: s.label,
    dayOfWeek: s.day_of_week,
    startTime: s.start_time,
    durationMinutes: s.duration_minutes,
    keyStage: s.key_stage,
    groupType: s.group_type as GroupFormat,
    maxCapacity: s.max_capacity,
    assignedTutorId: s.assigned_tutor_id,
    isBookingEnabled: s.is_booking_enabled,
    classroomProvider: s.classroom_provider,
    classroomUrl: s.classroom_url,
    classroomNotes: s.classroom_notes,
    createdAt: s.created_at
  });

  const fetchPublicSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data && !error) {
        setSettings({
          supportEmail: data.support_email,
          logoUrl: data.logo_url,
          companyName: data.company_name
        });
      }
    } catch (e) {
      console.error("Public settings fetch error:", e);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data && !error) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user && authData.user.id === userId) {
          setCurrentUser({
            id: data.id,
            email: authData.user?.email || '',
            name: data.name,
            role: data.role as UserRole,
            linkedUserId: data.linked_user_id
          });
        }
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const clearAppState = useCallback(() => {
    setCurrentUser(null);
    setStudentProfile(null);
    setAllUsers([]);
    setEnrollments([]);
    setInstances([]);
    setRecurringSlots([]);
    setAnnouncements([]);
    setActiveTab('catalog');
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    clearAppState();
    try { await supabase.auth.signOut(); } catch (err) { console.error("Sign out error:", err); }
  };

  const fetchGlobalData = async (active: { current: boolean }) => {
    const user = currentUserRef.current;
    if (!user) return;

    try {
      const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (active.current && annData) setAnnouncements(annData);

      const { data: slotData } = await supabase.from('recurring_slots').select('*');
      if (active.current && slotData) setRecurringSlots(slotData.map(mapSlot));

      if (user.role === UserRole.ADMIN) {
        const { data: instData } = await supabase.from('group_instances').select('*, profiles:assigned_tutor_id(name)').order('session_date', { ascending: true }).order('start_time', { ascending: true });
        if (active.current && instData) setInstances(instData.map(mapInstance));

        const { data: enrolData } = await supabase.from('enrollments').select('*').order('enrolled_at', { ascending: false });
        if (active.current && enrolData) setEnrollments(enrolData.map(mapEnrollment));
      } else {
        const studentId = user.role === UserRole.PARENT ? user.linkedUserId : user.id;
        if (!studentId) return;

        const { data: enrolData } = await supabase.from('enrollments').select('*').eq('student_id', studentId);
        if (active.current && enrolData) {
          const mappedEnrols = enrolData.map(mapEnrollment);
          setEnrollments(mappedEnrols);
          
          const instIds = mappedEnrols.map(e => e.instanceId);
          if (instIds.length > 0) {
            const { data: instData } = await supabase.from('group_instances').select('*, profiles:assigned_tutor_id(name)').in('id', instIds).order('session_date', { ascending: true }).order('start_time', { ascending: true });
            if (active.current && instData) setInstances(instData.map(mapInstance));
          }
        }
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    }
  };

  useEffect(() => {
    fetchPublicSettings();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        clearAppState();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [clearAppState]);

  useEffect(() => {
    const active = { current: true };
    if (currentUser) fetchGlobalData(active);
    return () => { active.current = false; };
  }, [currentUser]);

  const handleRefresh = async () => {
    const active = { current: true };
    await fetchGlobalData(active);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gm-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    if (publicView === 'bespoke' && bespokeToken) {
      return <BespokeOfferPage token={bespokeToken} onGoToLogin={() => setPublicView('login')} />;
    }

    return (
      <div className="min-h-screen">
        {publicView === 'login' ? (
          <Login onLoginSuccess={() => {}} settings={settings} onGoToApply={() => setPublicView('tutor-apply')} />
        ) : (
          <div className="gm-section-padding">
            <TutorApplicationForm onBack={() => setPublicView('login')} />
          </div>
        )}
      </div>
    );
  }

  return (
    <OnboardingGate 
        currentUser={currentUser} 
        settings={settings} 
        instances={instances}
        recurringSlots={recurringSlots}
        enrollments={enrollments}
        onProfileLoaded={setStudentProfile}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
    >
        <div className="min-h-screen pb-20">
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-8 py-4 mb-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Logo url={settings.logoUrl} companyName={settings.companyName} size="md" />
                <div className="flex items-center gap-8">
                    <div className="flex bg-gray-50 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab('catalog')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'catalog' ? 'bg-white text-brand-grey shadow-sm' : 'text-gray-400 hover:text-brand-grey'}`}>Catalog</button>
                    <button onClick={() => setActiveTab('portal')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'portal' ? 'bg-white text-brand-grey shadow-sm' : 'text-gray-400 hover:text-brand-grey'}`}>My Portal</button>
                    {currentUser.role === UserRole.ADMIN && (
                        <button onClick={() => setActiveTab('admin')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'admin' ? 'bg-white text-brand-grey shadow-sm' : 'text-gray-400 hover:text-brand-grey'}`}>Admin</button>
                    )}
                    </div>
                    <div className="h-8 w-px bg-gray-100"></div>
                    <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-brand-grey uppercase tracking-tight leading-none">{currentUser.name}</p>
                        <p className="text-[8px] font-bold text-gold uppercase tracking-[0.2em] mt-1">{currentUser.role}</p>
                    </div>
                    <button onClick={handleLogout} className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-brand-grey transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    </button>
                    </div>
                </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-8">
                {activeTab === 'catalog' && (
                <div className="space-y-12">
                    <AdvisorAI onSuggest={setHighlightedSubject} />
                    <CourseCatalog 
                    onEnroll={async (slotId, startDate, pkgId) => {
                        const { error } = await supabase.rpc('book_4week_block', { slot_uuid: slotId, desired_start_date: startDate, package_id: pkgId });
                        if (!error) handleRefresh();
                        return { error };
                    }}
                    enrolledInstanceIds={enrollments.map(e => e.instanceId)}
                    instances={instances}
                    recurringSlots={recurringSlots}
                    enrollments={enrollments}
                    role={currentUser.role}
                    onAddInstance={() => {}}
                    highlightedSubject={highlightedSubject}
                    />
                </div>
                )}
                
                {activeTab === 'portal' && (
                <LearningPortal 
                    role={currentUser.role} 
                    currentUser={currentUser} 
                    enrollments={enrollments} 
                    instances={instances} 
                    announcements={announcements} 
                    settings={settings}
                    onRefresh={handleRefresh}
                />
                )}

                {activeTab === 'admin' && currentUser.role === UserRole.ADMIN && (
                <AdminPanel 
                    instances={instances}
                    recurringSlots={recurringSlots}
                    enrollments={enrollments}
                    users={allUsers}
                    settings={settings}
                    onAddSlot={async (s) => { 
                      const { error } = await supabase.from('recurring_slots').insert([{
                        package_id: s.packageId,
                        label: s.label,
                        day_of_week: s.dayOfWeek,
                        start_time: s.startTime,
                        duration_minutes: s.durationMinutes,
                        key_stage: s.keyStage,
                        group_type: s.groupType,
                        max_capacity: s.maxCapacity,
                        assigned_tutor_id: s.assignedTutorId,
                        is_booking_enabled: s.isBookingEnabled,
                        classroom_provider: s.classroomProvider || 'Google Meet',
                        classroom_url: s.classroomUrl,
                        classroom_notes: s.classroomNotes
                      }]);
                      if (error) {
                        console.error("Add slot failed", error);
                        alert(error.message);
                        throw error;
                      } else {
                        await handleRefresh();
                      }
                    }}
                    onUpdateSlot={async (s) => { 
                      const { error } = await supabase.from('recurring_slots').update({
                        package_id: s.packageId,
                        label: s.label,
                        day_of_week: s.dayOfWeek,
                        start_time: s.startTime,
                        duration_minutes: s.durationMinutes,
                        key_stage: s.keyStage,
                        group_type: s.groupType,
                        max_capacity: s.maxCapacity,
                        assigned_tutor_id: s.assignedTutorId,
                        is_booking_enabled: s.isBookingEnabled,
                        classroom_provider: s.classroomProvider,
                        classroom_url: s.classroomUrl,
                        classroom_notes: s.classroomNotes
                      }).eq('id', s.id);
                      if (error) {
                        console.error("Update slot failed", error);
                        alert(error.message);
                        throw error;
                      } else {
                        await handleRefresh();
                      }
                    }}
                    onDeleteSlot={async (id) => { await supabase.from('recurring_slots').delete().eq('id', id); handleRefresh(); }}
                    onAddInstance={async (i) => { await supabase.from('group_instances').insert([i]); handleRefresh(); }}
                    onUpdateInstance={async (i) => { await supabase.from('group_instances').update(i).eq('id', i.id); handleRefresh(); }}
                    onDeleteInstance={async (id) => { await supabase.from('group_instances').delete().eq('id', id); handleRefresh(); }}
                    onToggleBooking={async (id) => { 
                    const inst = instances.find(i => i.id === id);
                    if (inst) await supabase.from('group_instances').update({ is_booking_enabled: !inst.isBookingEnabled }).eq('id', id);
                    handleRefresh(); 
                    }}
                    onAddUser={() => {}}
                    onResetPassword={() => {}}
                    onUpdateSettings={async (s) => { await supabase.from('platform_settings').update({ support_email: s.supportEmail, logo_url: s.logoUrl, company_name: s.companyName }).eq('id', 1); handleRefresh(); }}
                    onRefresh={handleRefresh}
                />
                )}
            </main>
        </div>
    </OnboardingGate>
  );
};

export default App;