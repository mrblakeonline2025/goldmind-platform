import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SessionNoteModalProps {
  instanceId: string;
  tutorId: string;
  onClose: () => void;
  onSuccess: (newNoteData: any) => void;
}

const SessionNoteModal: React.FC<SessionNoteModalProps> = ({ instanceId, tutorId, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [homework, setHomework] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setErrorMsg(null);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("The operation is taking longer than expected. Please check your connection.")), 20000)
    );

    try {
      const insertCall = supabase.from('session_notes').insert({
        instance_id: instanceId,
        tutor_id: tutorId,
        session_title: title,
        session_summary: summary,
        homework: homework || null
      }).select();

      const response = await Promise.race([
        insertCall,
        timeoutPromise
      ]) as any;

      const { data, error } = response;

      if (error) throw new Error(error.message);

      if (data && data.length > 0) {
        onSuccess(data[0]);
      } else {
        throw new Error("Unable to confirm the record. Please refresh.");
      }
    } catch (err: any) {
      console.error("Session Note Save Exception:", err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="note-modal-title" className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 id="note-modal-title" className="text-2xl font-black text-brand-grey uppercase tracking-tight">Academic Record</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Note progress and define expectations.</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            aria-label="Close modal"
            className="text-gray-400 hover:text-brand-grey focus:ring-2 focus:ring-gold transition-colors p-2 hover:bg-gray-50 rounded-xl"
          >
             <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="bg-red-50 border border-red-100 p-5 rounded-2xl mb-8 flex gap-3 animate-in slide-in-from-top-2">
            <svg aria-hidden="true" className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-xs font-bold text-red-600 leading-relaxed">{errorMsg}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="note-title" className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Session Title</label>
            <input 
              id="note-title"
              required
              disabled={isSaving}
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Week 4: Core Fundamentals"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-gold disabled:opacity-50 transition-all"
            />
          </div>
          
          <div>
            <label htmlFor="note-summary" className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Learning Summary</label>
            <textarea 
              id="note-summary"
              required
              disabled={isSaving}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Summarise key concepts and group progress..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-gold min-h-[120px] disabled:opacity-50 transition-all resize-none"
            />
          </div>

          <div>
            <label htmlFor="note-homework" className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Assigned Tasks</label>
            <textarea 
              id="note-homework"
              disabled={isSaving}
              value={homework}
              onChange={e => setHomework(e.target.value)}
              placeholder="Requirements before the next session..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-gold min-h-[80px] disabled:opacity-50 transition-all resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className={`flex-1 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl focus:ring-4 focus:ring-brand-grey/50 transition-all active:scale-95 flex items-center justify-center gap-3 ${
                isSaving ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-brand-grey text-white hover:bg-black'
              }`}
            >
              {isSaving ? 'Saving Record...' : 'Save Record'}
            </button>
            <button 
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-8 py-4 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:text-brand-grey focus:ring-2 focus:ring-gray-200 rounded-2xl transition-all disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionNoteModal;