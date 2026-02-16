import React, { useState } from 'react';

const GROUNDING_LINES = [
  "Breathe. Focus. You can do this.",
  "Small steps lead to massive progress.",
  "Your effort today is your success tomorrow.",
  "Stay curious. Stay calm. Keep going.",
  "Clarity of thought begins with a calm mind."
];

const MindsetMoment: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [line] = useState(() => GROUNDING_LINES[Math.floor(Math.random() * GROUNDING_LINES.length)]);

  if (!isVisible) return null;

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="bg-white border border-gold/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-gm-soft overflow-hidden relative group">
        <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-[11px] font-black text-brand-grey uppercase tracking-[0.2em] leading-relaxed">
            Mindset Moment: <span className="text-gray-400 font-bold ml-1">{line}</span>
          </p>
        </div>

        <button 
          onClick={() => setIsVisible(false)}
          className="relative z-10 px-6 py-3 bg-brand-grey text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-black transition-all active:scale-95 shadow-md"
        >
          Ready to Learn
        </button>
      </div>
    </div>
  );
};

export default MindsetMoment;