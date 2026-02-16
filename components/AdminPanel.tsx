import React, { useState, useEffect, useMemo } from 'react';
import { GroupInstance, RecurringSlot, GroupFormat, Enrollment, User, UserRole, PlatformSettings, SessionNote, TutorApplication, ApplicationStatus, BespokeOffer, BespokeEnquiry } from '../types';
import { TUITION_PACKAGES, DAYS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatInstanceSchedule, getNextOccurrence, normalizeTime } from '../lib/utils';
import TutorDirectory from './TutorDirectory';
import BespokeOfferModal from './BespokeOfferModal';

interface AdminPanelProps {
  instances: GroupInstance[];
  recurringSlots: RecurringSlot[];
  enrollments: Enrollment[];
  users: User[]; 
  settings: PlatformSettings;
  onAddSlot: (slot: Omit<RecurringSlot, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateSlot: (slot: RecurringSlot) => Promise<void>;
  onDeleteSlot: (id: string) => void;
  onAddInstance: (instance: Omit<GroupInstance, 'id' | 'label' | 'createdAt'>) => void;
  onUpdateInstance: (instance: GroupInstance) => void;
  onDeleteInstance: (id: string) => void;
  onToggleBooking: (id: string) => void;
  onAddUser: (user: Omit<User, 'id'>) => void;
  onResetPassword: (id: string) => void;
  onUpdateSettings: (settings: PlatformSettings) => void;
  onRefresh?: () => Promise<void>;
}

const PROVIDERS = ['Google Meet', 'Google Classroom', 'Zoom', 'Other'];

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  instances, 
  recurringSlots,
  enrollments,
  users: initialUsers,
  settings,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onAddInstance,
  onUpdateInstance, 
  onDeleteInstance, 
  onToggleBooking,
  onUpdateSettings,
  onRefresh
}) => {
  // Navigation State
  const [activeAdminView, setActiveAdminView] = useState<'slots' | 'blocks' | 'payments' | 'bespoke' | 'applications' | 'tutors' | 'users' | 'notes' | 'settings'>('slots');
  
  // Modals & Saving State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showBespokeModal, setShowBespokeModal] = useState(false);
  
  // Link Modal State
  const [linkModalConfig, setLinkModalConfig] = useState<{
    type: 'generate' | 'verify';
    slot: RecurringSlot;
    startDate: string;
    block?: any;
  } | null>(null);
  const [linkProvider, setLinkProvider] = useState('Google Meet');
  const [linkUrl, setLinkUrl] = useState('');
  
  // Explicit Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  
  const [editingSlot, setEditingSlot] = useState<RecurringSlot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data State
  const [allNotes, setAllNotes] = useState<SessionNote[]>([]);
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [isAppsLoading, setIsAppsLoading] = useState(false);
  const [bespokeOffers, setBespokeOffers] = useState<BespokeOffer[]>([]);
  const [bespokeEnquiries, setBespokeEnquiries] = useState<BespokeEnquiry[]>([]);
  const [availableTutors, setAvailableTutors] = useState<{id: string, name: string}[]>([]);
  
  const [paymentNotification, setPaymentNotification] = useState<{message: string, type: 'success' | 'neutral' | 'error' | 'warning'} | null>(null);
  
  // Local state for direct profile fetching
  const [fetchedProfiles, setFetchedProfiles] = useState<any[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [userFetchError, setUserFetchError] = useState<string | null>(null);

  // User Editing State
  const [editingUser, setEditingUser] = useState<{id: string, name: string, linked_user_id: string | null} | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userUpdateFeedback, setUserUpdateFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Form State for Slots
  const [slotPackageId, setSlotPackageId] = useState(TUITION_PACKAGES[0].id);
  const [slotLabel, setSlotLabel] = useState('A');
  const [slotDay, setSlotDay] = useState('Monday');
  const [slotTime, setSlotTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotTutor, setSlotTutor] = useState('');
  const [slotFormat, setSlotFormat] = useState<GroupFormat>('Standard');
  const [slotBookingEnabled, setSlotBookingEnabled] = useState(true);
  
  const [tempSettings, setTempSettings] = useState<PlatformSettings>(settings);

  useEffect(() => {
    if (activeAdminView === 'users') fetchProfilesDirectly();
    if (activeAdminView === 'notes') fetchAdminNotes();
    if (activeAdminView === 'applications') fetchApplications();
    if (activeAdminView === 'bespoke') fetchBespokeData();
    fetchTutors();
  }, [activeAdminView]);

  const fetchTutors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'TUTOR')
        .order('name');
      
      if (error) throw error;
      setAvailableTutors(data || []);
    } catch (err: any) {
      console.error("Tutor fetch failed:", err);
    }
  };

  const fetchProfilesDirectly = async () => {
    setIsLoadingProfiles(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFetchedProfiles(data || []);
    } catch (err: any) {
      setUserFetchError(err.message);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsSavingUser(true);
    setUserUpdateFeedback(null);
    
    try {
      // ONLY update safe fields as requested
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: editingUser.name, 
          linked_user_id: editingUser.linked_user_id || null 
        })
        .eq('id', editingUser.id);
      
      if (error) throw error;
      
      setUserUpdateFeedback({ message: 'Profile updated successfully', type: 'success' });
      fetchProfilesDirectly(); // Refresh the list
      
      // Auto-close modal after success message is shown
      setTimeout(() => {
        setEditingUser(null);
        setUserUpdateFeedback(null);
      }, 1200);
      
    } catch (err: any) {
      setUserUpdateFeedback({ message: err.message, type: 'error' });
    } finally {
      setIsSavingUser(false);
    }
  };

  const fetchAdminNotes = async () => {
    const { data, error } = await supabase.from('session_notes').select('*').order('created_at', { ascending: false });
    if (data && !error) {
      setAllNotes(data.map((n: any) => ({
        id: n.id, instanceId: n.instance_id, tutorId: n.tutor_id, createdAt: n.created_at,
        sessionTitle: n.session_title, sessionSummary: n.session_summary, homework: n.homework
      })));
    }
  };

  const fetchApplications = async () => {
    setIsAppsLoading(true);
    const { data, error } = await supabase.from('tutor_applications').select('*').order('created_at', { ascending: false });
    if (data && !error) setApplications(data);
    setIsAppsLoading(false);
  };

  const fetchBespokeData = async () => {
    const { data: offers } = await supabase.from('bespoke_offers').select('*').order('created_at', { ascending: false });
    const { data: enquiries } = await supabase.from('bespoke_enquiries').select('*').order('created_at', { ascending: false });
    if (offers) setBespokeOffers(offers);
    if (enquiries) setBespokeEnquiries(enquiries);
  };

  const handleConfirmGenerate = async () => {
    if (!linkModalConfig || !linkUrl.trim()) return;
    
    // 1. Instrumentation
    alert('Generate clicked');
    const { type, slot, startDate, block } = linkModalConfig;
    console.log('Generate clicked', { slotId: slot.id, startDate, meetingUrl: linkUrl });

    // 2. State setup
    setIsGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(null);

    try {
      // 3. Create/Verify Block
      if (type === 'generate') {
        const { data, error: genErr } = await supabase.rpc('ensure_4week_block', { 
          slot_uuid: slot.id, 
          start_date: startDate 
        });
        console.log('ensure_4week_block result', data, genErr);
        if (genErr) throw genErr;
      } else {
        const { data, error: verifyErr } = await supabase.rpc('verify_4week_block_payment', {
          p_student_id: block.studentId,
          p_slot_id: block.slotId,
          p_block_start_date: block.blockStartDate
        });
        console.log('verify_4week_block_payment result', data, verifyErr);
        if (verifyErr) throw verifyErr;
      }

      // 4. Update instances with Link
      const windowEnd = new Date(new Date(startDate).getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { error: updateErr, count } = await supabase
        .from('group_instances')
        .update({
          classroom_url: linkUrl.trim(),
          classroom_provider: linkProvider,
          classroom_notes: 'Academic block link applied by admin.'
        })
        .eq('slot_id', slot.id)
        .gte('session_date', startDate)
        .lt('session_date', windowEnd);

      console.log('Instance update result', { count, error: updateErr });
      if (updateErr) throw updateErr;

      if (count === 0) {
        setGenerateError('No sessions were updated. Check slot/date range.');
      } else {
        // 5. Success Flow
        setGenerateSuccess(`Block created (${count} sessions).`);
        
        if (onRefresh) {
          await onRefresh();
        }

        // 6. Auto-close
        setTimeout(() => {
          setLinkModalConfig(null);
          setGenerateSuccess(null);
          setLinkUrl('');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Generation failure:', err);
      setGenerateError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const paymentBlocks = useMemo(() => {
    const enrollmentData = enrollments.map(en => {
      const inst = instances.find(i => i.id === en.instanceId);
      return { ...en, sessionDate: inst?.sessionDate || '0000-00-00', slotId: inst?.slotId };
    }).filter(d => d.slotId);

    const studentSlotGroups: Record<string, typeof enrollmentData> = {};
    enrollmentData.forEach(d => {
      const key = `${d.studentId}-${d.slotId}`;
      if (!studentSlotGroups[key]) studentSlotGroups[key] = [];
      studentSlotGroups[key].push(d);
    });

    const blocks: any[] = [];
    Object.values(studentSlotGroups).forEach(group => {
      group.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
      for (let i = 0; i < group.length; i += 4) {
        const chunk = group.slice(i, i + 4);
        blocks.push({
          studentId: chunk[0].studentId,
          studentName: chunk[0].studentName,
          slotId: chunk[0].slotId,
          packageId: chunk[0].packageId,
          blockStartDate: chunk[0].sessionDate,
          totalCount: chunk.length,
          paidCount: chunk.filter(c => c.paymentStatus === 'Paid').length,
          pendingCount: chunk.filter(c => c.paymentStatus === 'Pending').length,
          packageName: TUITION_PACKAGES.find(p => p.id === chunk[0].packageId)?.name || chunk[0].packageId
        });
      }
    });
    return blocks.sort((a, b) => b.blockStartDate.localeCompare(a.blockStartDate));
  }, [enrollments, instances]);

  const resetSlotForm = () => {
    setEditingSlot(null);
    setSlotPackageId(TUITION_PACKAGES[0].id);
    setSlotLabel('A');
    setSlotDay('Monday');
    setSlotTime('17:00');
    setSlotDuration(60);
    setSlotTutor('');
    setSlotFormat('Standard');
    setSlotBookingEnabled(true);
    setIsSaving(false);
  };

  const handleSlotSubmit = async () => {
    setIsSaving(true);
    const payload = {
      packageId: slotPackageId,
      label: slotLabel,
      dayOfWeek: slotDay,
      startTime: slotTime,
      durationMinutes: slotDuration,
      keyStage: 'KS4', // Default
      groupType: slotFormat,
      maxCapacity: slotFormat === 'Standard' ? 14 : 8,
      assignedTutorId: slotTutor || null,
      isBookingEnabled: slotBookingEnabled
    };

    try {
      if (editingSlot) {
        await onUpdateSlot({ ...payload, id: editingSlot.id } as RecurringSlot);
      } else {
        await onAddSlot(payload);
      }
      
      setPaymentNotification({ message: "Template saved successfully.", type: 'success' });
      resetSlotForm();
      setShowSlotModal(false);
    } catch (err: any) {
      console.error("Slot submission failed:", err);
      alert("Error saving slot: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditSlot = (slot: RecurringSlot) => {
    setEditingSlot(slot);
    setSlotPackageId(slot.packageId);
    setSlotLabel(slot.label);
    setSlotDay(slot.dayOfWeek);
    setSlotTime(slot.startTime);
    setSlotDuration(slot.durationMinutes);
    setSlotTutor(slot.assignedTutorId || '');
    setSlotFormat(slot.groupType);
    setSlotBookingEnabled(slot.isBookingEnabled);
    setShowSlotModal(true);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-brand-grey uppercase tracking-tighter leading-none mb-2">Management Console</h2>
          <p className="text-gray-500 font-medium">System-wide operational oversight and configuration.</p>
        </div>
        <nav className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto max-w-full custom-scrollbar">
          {(['slots', 'blocks', 'payments', 'bespoke', 'applications', 'tutors', 'users', 'notes', 'settings'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveAdminView(view)}
              className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeAdminView === view ? 'bg-gold text-brand-grey shadow-sm' : 'text-gray-400 hover:text-brand-grey'}`}
            >
              {view}
            </button>
          ))}
        </nav>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 min-h-[500px] relative">
        {paymentNotification && (
          <div className={`mb-6 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between animate-in slide-in-from-top-2 ${
            paymentNotification.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            <p>{paymentNotification.message}</p>
            <button onClick={() => setPaymentNotification(null)} className="opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {activeAdminView === 'slots' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-brand-grey uppercase tracking-tight">Recurring Slot Templates</h3>
              <button onClick={() => { resetSlotForm(); setShowSlotModal(true); }} className="bg-brand-grey text-white font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl">+ Create Template</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recurringSlots.map(slot => (
                <div key={slot.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col group hover:border-gold/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-brand-grey rounded-xl flex items-center justify-center text-gold font-black shadow-lg">{slot.label}</div>
                    <button onClick={() => openEditSlot(slot)} className="text-gray-400 hover:text-brand-grey transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                  </div>
                  <h4 className="text-sm font-black text-brand-grey uppercase mb-1">{TUITION_PACKAGES.find(p => p.id === slot.packageId)?.name || slot.packageId}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">{slot.dayOfWeek} • {slot.startTime}</p>
                  <div className="mb-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned Tutor</p>
                    <p className="text-[10px] font-bold text-brand-grey uppercase">{availableTutors.find(t => t.id === slot.assignedTutorId)?.name || 'Unassigned'}</p>
                  </div>
                  <div className="mt-auto pt-4">
                    <button 
                      onClick={() => {
                        setGenerateError(null);
                        setGenerateSuccess(null);
                        setLinkModalConfig({ type: 'generate', slot, startDate: getNextOccurrence(slot.dayOfWeek) });
                        setLinkUrl('');
                      }} 
                      className="w-full bg-white border border-gray-200 text-brand-grey font-black py-2.5 rounded-xl text-[8px] uppercase tracking-widest transition-all hover:bg-gold"
                    >
                      Generate Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminView === 'blocks' && (
          <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Programme</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Schedule</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tutor</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...instances].sort((a,b) => (a.sessionDate||'').localeCompare(b.sessionDate||'')).map(inst => (
                  <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="text-xs font-black text-brand-grey uppercase">{TUITION_PACKAGES.find(p=>p.id===inst.packageId)?.name || inst.packageId}</p>
                      <p className="text-[8px] font-bold text-gold uppercase mt-1">Group {inst.label}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[10px] font-bold text-brand-grey uppercase">{inst.sessionDate}</p>
                      <p className="text-[9px] text-gray-400 font-bold">{inst.startTime}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">{inst.tutorName || 'Unassigned'}</p>
                    </td>
                    <td className="px-6 py-5 text-right"><button onClick={() => onDeleteInstance(inst.id)} className="text-red-400 hover:text-red-600 font-black text-[8px] uppercase">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminView === 'payments' && (
          <div className="space-y-4">
             {paymentBlocks.map((block: any) => (
                <div key={`${block.studentId}-${block.slotId}-${block.blockStartDate}`} className="p-8 bg-white rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gold font-black text-xl border border-gray-100">{block.totalCount}</div>
                    <div><p className="text-[10px] font-black text-gold uppercase tracking-widest mb-1">{block.packageName}</p><h4 className="text-lg font-black text-brand-grey uppercase leading-none mb-1">{block.studentName}</h4><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Start: {block.blockStartDate}</p></div>
                  </div>
                  <button onClick={() => {
                    const slot = recurringSlots.find(s => s.id === block.slotId);
                    if (slot) setLinkModalConfig({ type: 'verify', slot, startDate: block.blockStartDate, block });
                  }} className="px-6 py-3 bg-gold text-brand-grey rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-brand-grey hover:text-white transition-all">Verify & Assign Link</button>
                </div>
             ))}
          </div>
        )}

        {activeAdminView === 'applications' && (
          <div className="space-y-6">
            {applications.map(app => (
              <div key={app.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-black text-brand-grey uppercase">{app.full_name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">{app.email} • {app.status}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-[8px] font-black uppercase px-4 py-2 bg-brand-grey text-white rounded-lg">Review</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeAdminView === 'tutors' && (
          <TutorDirectory onAccountCreated={fetchTutors} />
        )}

        {activeAdminView === 'bespoke' && (
          <div className="space-y-12">
            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-brand-grey uppercase tracking-tight">Active Bespoke Offers</h3><button onClick={() => setShowBespokeModal(true)} className="bg-brand-grey text-white font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest">+ Create Offer</button></div>
            <div className="grid grid-cols-1 gap-4">
              {bespokeOffers.map(offer => (
                <div key={offer.id} className="p-6 bg-white rounded-2xl border border-gray-100 flex justify-between items-center">
                  <div><h4 className="text-sm font-black text-brand-grey uppercase">{offer.offer_title}</h4><p className="text-[10px] font-bold text-gold uppercase">£{offer.custom_price_gbp} • {offer.payment_status}</p></div>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?bespoke=${offer.public_token}`); alert('Link Copied'); }} className="text-[8px] font-black uppercase px-4 py-2 border border-gray-200 rounded-lg">Copy Link</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminView === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-brand-grey uppercase tracking-tight">User Registry</h3>
              <button onClick={() => fetchProfilesDirectly()} className="text-[10px] font-black uppercase text-gold hover:text-brand-grey transition-colors flex items-center gap-2">
                <svg className={`w-3.5 h-3.5 ${isLoadingProfiles ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Sync Data
              </button>
            </div>
            {isLoadingProfiles ? (
              <div className="p-20 text-center"><div className="w-8 h-8 border-4 border-gold/20 border-t-gold rounded-full animate-spin mx-auto"></div></div>
            ) : userFetchError ? (
              <div className="p-10 bg-red-50 text-red-500 rounded-2xl border border-red-100 text-xs font-bold">{userFetchError}</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {fetchedProfiles.map(user => (
                  <div key={user.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex justify-between items-center group hover:border-gold/30 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-brand-grey uppercase">{user.name}</span>
                        <span className="text-[7px] font-black text-gold border border-gold/30 px-1.5 py-0.5 rounded uppercase tracking-widest">{user.role}</span>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400">{user.email || 'No email set'}</p>
                      {user.linked_user_id && <p className="text-[8px] font-black text-brand-grey uppercase mt-1 opacity-60">Linked Student ID: {user.linked_user_id.slice(0, 8)}...</p>}
                    </div>
                    <button 
                      onClick={() => setEditingUser({ id: user.id, name: user.name, linked_user_id: user.linked_user_id })}
                      className="text-[9px] font-black uppercase text-brand-grey hover:text-gold border border-gray-200 hover:border-gold bg-white px-5 py-2.5 rounded-xl shadow-sm transition-all"
                    >
                      Edit Profile
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeAdminView === 'notes' && (
          <div className="space-y-4">
            {allNotes.map(note => (
              <div key={note.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100"><h4 className="text-sm font-black text-brand-grey uppercase">{note.sessionTitle}</h4><p className="text-[11px] text-gray-500 mt-2">{note.sessionSummary}</p></div>
            ))}
          </div>
        )}

        {activeAdminView === 'settings' && (
          <div className="max-w-xl space-y-6">
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Company Name</label><input type="text" value={tempSettings.companyName} onChange={e => setTempSettings({...tempSettings, companyName: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" /></div>
            <button onClick={() => onUpdateSettings(tempSettings)} className="w-full bg-brand-grey text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest">Save Settings</button>
          </div>
        )}
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-grey p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Edit Profile</h2>
                <p className="text-[9px] font-bold text-gold uppercase tracking-[0.2em] mt-2">Administrative Profile Update</p>
              </div>
              <button disabled={isSavingUser} onClick={() => setEditingUser(null)} className="text-white/40 hover:text-white disabled:opacity-30"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-10 space-y-6">
              {userUpdateFeedback && (
                <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2 flex items-center gap-3 ${
                  userUpdateFeedback.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  {userUpdateFeedback.type === 'success' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                  <p className="flex-1 leading-relaxed">{userUpdateFeedback.message}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="Full Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked User ID (UUID)</label>
                  <input type="text" value={editingUser.linked_user_id || ''} onChange={e => setEditingUser({...editingUser, linked_user_id: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Primarily for Parent-Student linkage.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="submit" 
                  disabled={isSavingUser || !editingUser.name.trim()} 
                  className="flex-1 bg-brand-grey text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSavingUser && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                  {isSavingUser ? 'Updating...' : 'Save Profile'}
                </button>
                <button type="button" disabled={isSavingUser} onClick={() => setEditingUser(null)} className="px-10 py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE BLOCK MODAL */}
      {linkModalConfig && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-brand-grey uppercase tracking-tighter">
                  {linkModalConfig.type === 'generate' ? 'Generate 4-Week Block' : 'Verify Renewal & Assign Link'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {linkModalConfig.slot.label} • {linkModalConfig.slot.dayOfWeek}s at {linkModalConfig.slot.startTime}
                </p>
              </div>
              <button disabled={isGenerating} onClick={() => setLinkModalConfig(null)} className="text-gray-400 hover:text-brand-grey disabled:opacity-30"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>

            {/* FEEDBACK BANNERS */}
            {generateSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none">{generateSuccess}</p>
              </div>
            )}
            {generateError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none">{generateError}</p>
              </div>
            )}
            
            <div className="space-y-6 mb-8">
              {linkModalConfig.type === 'generate' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Block Start Date</label>
                  <input type="date" value={linkModalConfig.startDate} onChange={e => setLinkModalConfig({...linkModalConfig, startDate: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Classroom Provider</label>
                <select value={linkProvider} onChange={e => setLinkProvider(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold">
                  {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Classroom URL</label>
                <input type="url" required value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                type="button" 
                disabled={isGenerating || !linkUrl.trim()}
                onClick={handleConfirmGenerate}
                className="flex-1 bg-brand-grey text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isGenerating && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                {isGenerating ? 'Generating...' : (linkModalConfig.type === 'generate' ? 'Generate Block' : 'Verify & Unlock')}
              </button>
              <button 
                type="button" 
                disabled={isGenerating}
                onClick={() => setLinkModalConfig(null)} 
                className="px-8 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLOT TEMPLATE MODAL */}
      {showSlotModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-3xl font-black text-brand-grey uppercase tracking-tighter">{editingSlot ? 'Edit Template' : 'New Template'}</h2>
              <button type="button" onClick={() => setShowSlotModal(false)} className="text-gray-400 hover:text-brand-grey transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Programme</label>
                <select value={slotPackageId} onChange={e => setSlotPackageId(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold">
                  {TUITION_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Group Label</label>
                <input type="text" value={slotLabel} onChange={e => setSlotLabel(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Day</label>
                <select value={slotDay} onChange={e => setSlotDay(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time</label>
                <input type="time" value={normalizeTime(slotTime)} onChange={e => setSlotTime(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Tutor</label>
                <select value={slotTutor} onChange={e => setSlotTutor(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold">
                  <option value="">Unassigned</option>
                  {availableTutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Group Format</label>
                <select value={slotFormat} onChange={e => setSlotFormat(e.target.value as GroupFormat)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold">
                  <option value="Standard">Standard (Max 14)</option>
                  <option value="Enhanced">Enhanced (Max 8)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={handleSlotSubmit} 
                disabled={isSaving} 
                className="flex-1 bg-brand-grey text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                {isSaving ? 'Saving Template...' : 'Save Template'}
              </button>
              {editingSlot && (
                <button 
                  type="button" 
                  onClick={() => { if(confirm("Delete this template?")) { onDeleteSlot(editingSlot.id); setShowSlotModal(false); } }} 
                  className="px-8 py-4 text-red-500 font-black text-[10px] uppercase tracking-widest border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showBespokeModal && (
        <BespokeOfferModal onClose={() => setShowBespokeModal(false)} onSuccess={() => { setShowBespokeModal(false); fetchBespokeData(); }} recurringSlots={recurringSlots} />
      )}
    </div>
  );
};

export default AdminPanel;