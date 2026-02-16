
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Enrollment, GroupInstance, TuitionPackage, UserRole, Announcement, PlatformSettings, SessionNote, User } from './types';
import { TUITION_PACKAGES } from './constants';
import { supabase } from './lib/supabase';
import Logo from './components/Logo';
import SessionNoteModal from './components/SessionNoteModal';
import AttendanceModal from './components/AttendanceModal';
import NotesList from './components/NotesList';
import MindsetMoment from './components/MindsetMoment';
import { formatInstanceSchedule, getSessionDateObj, getCountdownLabel } from './lib/utils';

interface PortalProps {
  role: UserRole;
  currentUser: User;
  enrollments: Enrollment[];
  instances: GroupInstance[];
  announcements: Announcement[];
  settings: PlatformSettings;
  onUpdateInstance?: (updated: GroupInstance) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

const mapNote = (n: any): SessionNote => ({
  id: n.id,
  instanceId: n.instance_id,
  tutorId: n.tutor_id,
  createdAt: n.created_at,
  sessionTitle: n.session_title,
  sessionSummary: n.session_summary,
  homework: n.homework,
  studentFocus: n.student_focus
});

type SessionState = 'COUNTDOWN' | 'JOIN' | 'PAST';

interface SessionAccess {
  state: SessionState;
  label: string;
  enabled: boolean;
}

const getSessionAccess = (inst: GroupInstance, now: Date): SessionAccess => {
  const start = getSessionDateObj(inst);
  if (!start) return { state: 'COUNTDOWN', label: 'TBC', enabled: false };

  const duration = inst.durationMinutes || 60;
  const diffMs = start.getTime() - now.getTime();
  const diffMins = diffMs / 60000;

  const joinOpenEarly = 10;
  const joinCloseLate = -(duration + 15);

  if (diffMins <= joinOpenEarly && diffMins >= joinCloseLate) {
    return { state: 'JOIN', label: 'Join Live Classroom', enabled: true };
  }

  if (diffMins < joinCloseLate) {
    return { state: 'PAST', label: 'Session Complete', enabled: false };
  }

  return { 
    state: 'COUNTDOWN', 
    label: getCountdownLabel(diffMs), 
    enabled: false 
  };
};

const LearningPortal: React.FC<PortalProps> = ({ role, currentUser, enrollments, instances, announcements, settings, onUpdateInstance, onRefresh }) => {
  const [markingAttendance, setMarkingAttendance] = useState<GroupInstance | null>(null);
  const [addingNoteFor, setAddingNoteFor] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [now, setNow] = useState(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [editingLinkFor, setEditingLinkFor] = useState<GroupInstance | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Renewal State
  const [renewingGroup, setRenewingGroup] = useState<{slotId: string, packageId: string, name: string} | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  const notesSectionRef = useRef<Record<string, HTMLDivElement | null>>({});

  const isTutor = role === UserRole.TUTOR;
  const isStudent = role === UserRole.STUDENT || role === UserRole.PARENT;
  const isAdmin = role === UserRole.ADMIN;

  const studentEnrolledInstances = useMemo(() => {
    if (!isStudent) return [];
    const enrolledIds = new Set(enrollments.map(e => e.instanceId));
    return instances.filter(inst => enrolledIds.has(inst.id));
  }, [instances, enrollments, isStudent]);

  const instancesByPackage = useMemo(() => {
    return studentEnrolledInstances.reduce((acc, inst) => {
      if (!acc[inst.packageId]) acc[inst.packageId] = [];
      acc[inst.packageId].push(inst);
      return acc;
    }, {} as Record<string, GroupInstance[]>);
  }, [studentEnrolledInstances]);

  // Check if a slot has a pending renewal
  const pendingRenewalsBySlot = useMemo(() => {
    const map: Record<string, boolean> = {};
    enrollments.forEach(en => {
      if (en.paymentStatus === 'Pending') {
        const inst = instances.find(i => i.id === en.instanceId);
        if (inst?.slotId) {
          map[inst.slotId] = true;
        }
      }
    });
    return map;
  }, [enrollments, instances]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [instances]);

  const fetchNotes = async () => {
    const instIds = instances.map(i => i.id);
    if (instIds.length === 0) return;
    const { data, error } = await supabase.from('session_notes').select('*').in('instance_id', instIds).order('created_at', { ascending: false });
    if (data && !error) setSessionNotes(data.map(mapNote));
  };

  const handleLaunchClassroom = (url: string | undefined) => {
    if (!url || url.trim() === '') {
      alert("No Live Link Set Yet. The academic team will attach the classroom link to this session block shortly.");
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (url: string | undefined, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveLink = async () => {
    if (!editingLinkFor || !onUpdateInstance) return;
    setIsSavingLink(true);
    try {
      await onUpdateInstance({ ...editingLinkFor, classroomUrl: tempUrl, classroomNotes: tempNotes });
      setEditingLinkFor(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleRenew = async () => {
    if (!renewingGroup) return;
    setIsRenewing(true);
    try {
      const studentId = role === UserRole.PARENT ? currentUser.linkedUserId : currentUser.id;
      if (!studentId) throw new Error("Student identification failed.");

      const { error } = await supabase.rpc('renew_4week_block', {
        p_student_id: studentId,
        p_slot_id: renewingGroup.slotId,
        p_package_id: renewingGroup.packageId
      });

      if (error) {
        if (error.message.includes('NO_EXISTING_BLOCK')) throw new Error("No existing block found to renew.");
        if (error.message.includes('NOT_AUTHENTICATED')) throw new Error("Please log in again.");
        throw error;
      }

      alert(`Renewal created — awaiting payment verification.`);
      if (onRefresh) await onRefresh();
      setRenewingGroup(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
      <MindsetMoment />

      {markingAttendance && (
        <AttendanceModal
          instanceId={markingAttendance.id}
          instanceLabel={markingAttendance.label}
          tutorId={currentUser.id}
          roster={enrollments.filter(e => e.instanceId === markingAttendance.id)}
          onClose={() => setMarkingAttendance(null)}
        />
      )}

      {addingNoteFor && (
        <SessionNoteModal 
          instanceId={addingNoteFor}
          tutorId={currentUser.id} 
          onClose={() => setAddingNoteFor(null)}
          onSuccess={(note) => setSessionNotes(prev => [mapNote(note), ...prev])}
        />
      )}

      {renewingGroup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-brand-grey uppercase tracking-tighter mb-4">Confirm Renewal</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
              You are about to add a 4-week extension to your <strong>{renewingGroup.name}</strong> programme. 
              <br/><br/>
              Access to these new sessions will remain <strong>locked</strong> until payment is verified by our team.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={handleRenew} 
                disabled={isRenewing}
                className="flex-1 bg-gold text-brand-grey font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-50"
              >
                {isRenewing ? 'Processing...' : 'Confirm Renewal'}
              </button>
              <button onClick={() => setRenewingGroup(null)} className="px-8 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingLinkFor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-brand-grey uppercase tracking-tighter mb-2">Classroom Link</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatInstanceSchedule(editingLinkFor)}</p>
              </div>
              <button onClick={() => setEditingLinkFor(null)} className="text-gray-400 hover:text-brand-grey"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="space-y-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Classroom URL</label>
                <input type="url" value={tempUrl} onChange={e => setTempUrl(e.target.value)} placeholder="https://meet.google.com/..." className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instructions for Students</label>
                <textarea value={tempNotes} onChange={e => setTempNotes(e.target.value)} placeholder="Add any specific requirements for this session..." className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold h-24 resize-none" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleSaveLink} disabled={isSavingLink} className="flex-1 bg-brand-grey text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition-all">
                {isSavingLink ? 'Saving...' : 'Update Link'}
              </button>
              <button onClick={() => setEditingLinkFor(null)} className="px-8 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <header>
        <h1 className="text-5xl font-black text-brand-grey uppercase tracking-tighter mb-4">{isTutor ? 'Tutor Hub' : 'My Learning'}</h1>
        <p className="text-gray-500 text-lg font-medium max-w-2xl">{isTutor ? 'Real-time operational dashboard for academic delivery.' : 'Access your live sessions, academic logs, and system announcements.'}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-8">{isTutor ? 'Active Academic Groups' : 'Upcoming Schedule'}</h2>
            <div className="space-y-8">
              {instances.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No active sessions found.</p>
                </div>
              ) : isStudent ? (
                <div className="space-y-12">
                  {(Object.entries(instancesByPackage) as [string, GroupInstance[]][]).map(([packageId, pkgInstances]) => {
                    const pkg = TUITION_PACKAGES.find(p => p.id === packageId);
                    
                    const sortedInstances = [...pkgInstances].sort((a, b) => 
                      (a.sessionDate || '').localeCompare(b.sessionDate || '')
                    );

                    // Find info for renewal (must have at least one instance with a slot_id)
                    const slotInfo = sortedInstances.find(i => i.slotId)?.slotId;
                    const isPending = slotInfo ? pendingRenewalsBySlot[slotInfo] : false;

                    return (
                      <div key={packageId} className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <h3 className="text-sm font-black text-gold uppercase tracking-[0.2em]">{pkg?.name || packageId}</h3>
                            <div className="h-px bg-gray-100 flex-1"></div>
                          </div>
                          {slotInfo && (
                            isPending ? (
                              <span className="px-4 py-2 bg-gray-50 text-gray-400 border border-gray-200 rounded-xl text-[8px] font-black uppercase tracking-widest">
                                Renewal Pending Verification
                              </span>
                            ) : (
                              <button 
                                onClick={() => setRenewingGroup({ slotId: slotInfo, packageId, name: pkg?.name || 'Programme' })}
                                className="px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-gold hover:text-brand-grey transition-all shadow-sm active:scale-95"
                              >
                                Renew Block
                              </button>
                            )
                          )}
                        </div>
                        <div className="space-y-8">
                          {sortedInstances.map((inst, index) => {
                            const access = getSessionAccess(inst, now);
                            const enrollment = enrollments.find(e => e.instanceId === inst.id);
                            const isPaid = enrollment?.paymentStatus === 'Paid';
                            const hasNotes = sessionNotes.some(n => n.instanceId === inst.id);
                            const isFinished = access.state === 'PAST';

                            return (
                              <article key={inst.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                  <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                      <div className="w-16 h-16 bg-brand-grey rounded-2xl flex items-center justify-center text-gold font-black text-2xl shrink-0 shadow-lg relative">
                                        {inst.label}
                                        <div className="absolute -top-2 -right-2 bg-gold text-brand-grey text-[8px] font-black w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-sm">{index + 1}</div>
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-3 mb-2">
                                          <h4 className="text-xl font-black text-brand-grey uppercase tracking-tight leading-none">{pkg?.name || inst.packageId}</h4>
                                          <span className="bg-brand-grey text-white text-[8px] font-black uppercase px-2 py-1 rounded-md">Week {index + 1}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                          {formatInstanceSchedule(inst)}
                                        </p>
                                        {inst.tutorName && (
                                          <p className="text-[9px] font-bold text-gold uppercase tracking-[0.1em] mt-1">
                                            Tutor: {inst.tutorName}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 text-right">
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`w-2 h-2 rounded-full ${inst.classroomUrl ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                          {inst.classroomUrl ? (inst.classroomProvider || 'Live Now') : (inst.classroomProvider ? 'No Live Link Set Yet' : 'Registry Pending')}
                                        </span>
                                      </div>
                                      {enrollment && enrollment.paymentStatus !== 'Paid' && (
                                        <span className="text-[8px] font-black text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse">
                                          Status: {enrollment.paymentStatus}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-8">
                                  {isPaid ? (
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center"><svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
                                        <div>
                                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">State</p>
                                          <p className="text-xs font-black text-brand-grey uppercase tracking-tight">{access.label}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        {access.state === 'PAST' ? (
                                          <div className="bg-white border-2 border-gray-100 px-6 py-4 rounded-2xl flex items-center justify-center">
                                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Session Complete</p>
                                          </div>
                                        ) : (
                                          <button 
                                            disabled={!access.enabled || !inst.classroomUrl} 
                                            onClick={() => handleLaunchClassroom(inst.classroomUrl)} 
                                            className={`px-8 py-4 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl transition-all ${
                                              access.enabled && inst.classroomUrl 
                                              ? 'bg-gold text-brand-grey hover:bg-brand-grey hover:text-white' 
                                              : 'bg-white border-2 border-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                            }`}
                                          >
                                            {access.state === 'JOIN' 
                                              ? (inst.classroomUrl ? 'Join Live Classroom' : 'No Live Link Set Yet') 
                                              : access.label
                                            }
                                          </button>
                                        )}

                                        {isFinished && hasNotes && (
                                          <button 
                                            onClick={() => {
                                              const el = notesSectionRef.current[inst.id];
                                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }}
                                            className="px-6 py-4 bg-white border-2 border-brand-grey text-brand-grey font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-brand-grey hover:text-white transition-all shadow-md"
                                          >
                                            View Logs
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : enrollment ? (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center mb-8 flex flex-col items-center gap-2">
                                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-1">
                                         <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                      </div>
                                      <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Access pending payment verification</p>
                                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Administrative verification is required to unlock this live session.</p>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center mb-8">
                                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrolment data missing</p>
                                    </div>
                                  )}
                                  
                                  {isFinished && (
                                    <div ref={el => { notesSectionRef.current[inst.id] = el; }}>
                                      <NotesList notes={sessionNotes.filter(n => n.instanceId === inst.id)} />
                                    </div>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                instances.map(inst => {
                  const pkg = TUITION_PACKAGES.find(p => p.id === inst.packageId);
                  const roster = enrollments.filter(e => e.instanceId === inst.id);
                  const access = getSessionAccess(inst, now);
                  return (
                    <article key={inst.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-start">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-brand-grey rounded-2xl flex items-center justify-center text-gold font-black text-2xl shadow-lg">{inst.label}</div>
                          <div>
                            <h3 className="text-2xl font-black text-brand-grey uppercase tracking-tight leading-none mb-2">{pkg?.name || inst.packageId}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{formatInstanceSchedule(inst)}</p>
                            {inst.tutorName && (
                              <p className="text-[9px] font-bold text-gold uppercase tracking-[0.1em] mt-1">
                                Tutor: {inst.tutorName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-brand-grey uppercase tracking-widest">Roster</p>
                          <p className="text-sm font-black text-gold">{roster.length} / {inst.maxCapacity} Enrolled</p>
                        </div>
                      </div>
                      <div className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                          <button 
                            disabled={!access.enabled || !inst.classroomUrl} 
                            onClick={() => handleLaunchClassroom(inst.classroomUrl)} 
                            className={`font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg transition-all ${access.enabled && inst.classroomUrl ? 'bg-gold text-brand-grey hover:bg-brand-grey hover:text-white' : 'bg-white border-2 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                          >
                            {access.state === 'JOIN' ? (inst.classroomUrl ? 'Start Classroom' : 'No Link Set') : access.label}
                          </button>
                          <button onClick={() => setMarkingAttendance(inst)} className="bg-white border-2 border-brand-grey text-brand-grey font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-brand-grey hover:text-white transition-all">Take Register</button>
                          <button onClick={() => setAddingNoteFor(inst.id)} className="bg-white border-2 border-brand-grey text-brand-grey font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-brand-grey hover:text-white transition-all">Add Notes</button>
                          <button onClick={() => setEditingLinkFor(inst)} className="bg-white border-2 border-brand-grey text-brand-grey font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-brand-grey hover:text-white transition-all">Edit Link</button>
                          <button 
                            disabled={!inst.classroomUrl}
                            onClick={() => handleCopyLink(inst.classroomUrl, inst.id)}
                            className={`bg-white border-2 border-brand-grey text-brand-grey font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${!inst.classroomUrl ? 'opacity-30 cursor-not-allowed' : 'hover:bg-brand-grey hover:text-white'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                            {copiedId === inst.id ? 'Copied' : 'Copy Link'}
                          </button>
                        </div>
                        <NotesList notes={sessionNotes.filter(n => n.instanceId === inst.id)} />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-12">
          <section className="bg-brand-grey rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <h2 className="text-[10px] font-black text-gold uppercase tracking-[0.4em] mb-8 opacity-60">Performance</h2>
            <div className="space-y-6">
              <div><p className="text-[10px] font-black text-gold/40 uppercase tracking-widest mb-1">Attendance</p><p className="text-4xl font-black">94%</p></div>
              <div><p className="text-[10px] font-black text-gold/40 uppercase tracking-widest mb-1">Success Rating</p><p className="text-4xl font-black">Gold-Tier</p></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default LearningPortal;
