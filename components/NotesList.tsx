import React from 'react';
import { SessionNote } from '../types';

interface NotesListProps {
  notes: SessionNote[];
}

const NotesList: React.FC<NotesListProps> = ({ notes }) => {
  if (notes.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-gray-50 space-y-6">
      <div className="flex items-center gap-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] whitespace-nowrap">Academic Trajectory Logs</h4>
        <div className="h-px bg-gray-50 flex-1"></div>
      </div>
      
      <div className="space-y-4">
        {notes.map(note => (
          <div key={note.id} className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100/50 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h5 className="text-sm font-black text-brand-grey uppercase tracking-tight">{note.sessionTitle}</h5>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-2 py-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                {new Date(note.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4">{note.sessionSummary}</p>
            {note.homework && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-3 h-3 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                  <span className="text-[8px] font-black text-brand-grey uppercase tracking-widest">Homework Assignment</span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold leading-relaxed">{note.homework}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesList;