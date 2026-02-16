import React, { useState, useEffect } from 'react';
import { Enrollment } from '../types';
import { supabase } from '../lib/supabase';

interface AttendanceRecord {
  student_id: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  note: string;
}

interface AttendanceModalProps {
  instanceId: string;
  instanceLabel: string;
  tutorId: string;
  roster: Enrollment[];
  onClose: () => void;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ instanceId, instanceLabel, tutorId, roster, onClose }) => {
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchExistingAttendance();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [instanceId]);

  const fetchExistingAttendance = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('instance_id', instanceId);

      if (error) throw error;

      if (data) {
        const initialRecords: Record<string, AttendanceRecord> = {};
        data.forEach((rec: any) => {
          initialRecords[rec.student_id] = {
            student_id: rec.student_id,
            status: rec.status,
            note: rec.note || ''
          };
        });
        setRecords(initialRecords);
      }
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
      setErrorMsg("Unable to retrieve records. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = (studentId: string, status: AttendanceRecord['status']) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { student_id: studentId, note: '' }),
        status
      }
    }));
  };

  const updateNote = (studentId: string, note: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { student_id: studentId, status: 'Present' }),
        note
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    const payload = roster.map(en => {
      const rec = records[en.studentId!] || { status: 'Present', note: '' };
      return {
        instance_id: instanceId,
        tutor_id: tutorId,
        student_id: en.studentId,
        status: rec.status,
        note: rec.note || null
      };
    });

    try {
      if (payload.length === 0) {
        onClose();
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'instance_id,student_id' });

      if (error) throw error;
      
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Attendance Save Error:", err);
      setErrorMsg("We encountered a delay. Please attempt to save again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (showSuccess) {
    return (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-12 text-center shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg aria-hidden="true" className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-brand-grey uppercase tracking-tight">Register Updated</h2>
          <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px] mt-2">Attendance successfully recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="register-title" className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 id="register-title" className="text-2xl font-black text-brand-grey uppercase tracking-tight">Session Register</h2>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Group {instanceLabel} • Current Session</p>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close register"
            className="text-gray-400 hover:text-brand-grey focus:ring-2 focus:ring-gold p-2 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 text-xs font-bold uppercase tracking-widest">
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center" aria-busy="true">
            <div className="animate-spin h-8 w-8 border-4 border-gold/20 border-t-gold rounded-full"></div>
            <span className="sr-only">Loading register...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
            {roster.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No students available in this session.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {roster.map(en => {
                  const rec = records[en.studentId!] || { status: 'Present', note: '' };
                  return (
                    <div key={en.id} className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex-1 text-center md:text-left min-w-0">
                        <p className="text-sm font-black text-brand-grey uppercase tracking-tight truncate">{en.studentName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Reference: {en.id.slice(0,8)}</p>
                      </div>

                      <div role="radiogroup" aria-label={`Attendance status for ${en.studentName}`} className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                        {(['Present', 'Late', 'Absent', 'Excused'] as const).map(s => (
                          <button
                            key={s}
                            role="radio"
                            aria-checked={rec.status === s}
                            onClick={() => updateStatus(en.studentId!, s)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all focus:ring-2 focus:ring-gold/50 ${
                              rec.status === s 
                                ? s === 'Present' ? 'bg-green-500 text-white' 
                                : s === 'Late' ? 'bg-yellow-400 text-brand-grey' 
                                : s === 'Absent' ? 'bg-red-500 text-white' 
                                : 'bg-brand-grey text-white'
                                : 'text-gray-400 hover:text-brand-grey hover:bg-gray-50'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <div className="w-full md:w-48">
                        <label htmlFor={`note-${en.studentId}`} className="sr-only">Attendance note for {en.studentName}</label>
                        <input
                          id={`note-${en.studentId}`}
                          type="text"
                          placeholder="Observation..."
                          value={rec.note || ''}
                          onChange={(e) => updateNote(en.studentId!, e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-gray-100 flex gap-4">
          <button 
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex-1 bg-brand-grey text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-black focus:ring-4 focus:ring-brand-grey/50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isSaving ? 'Processing...' : 'Update Register'}
          </button>
          <button 
            onClick={onClose}
            disabled={isSaving}
            className="px-8 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-brand-grey focus:ring-2 focus:ring-gray-200 rounded-2xl transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceModal;