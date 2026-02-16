import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface AdvisorAIProps {
  onSuggest: (subject: string) => void;
}

const AdvisorAI: React.FC<AdvisorAIProps> = ({ onSuggest }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  const getAdvice = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      // Initialization inside function to ensure environment variables are ready and prevent load failures
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I am a student at GoldMind Tuition. Here is my situation: "${prompt}". 
        Give me a short, professional advice (max 100 words) on which GCSE subjects (Maths, English Lang, English Lit, Science) or tuition package I should focus on. 
        Be encouraging, academic, and refer to the "GoldMind Teaching System" where appropriate.`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 400,
          thinkingConfig: { thinkingBudget: 200 },
        }
      });
      setAdvice(response.text || "I am currently processing. Please focus on your core objectives in the meantime.");
    } catch (err) {
      console.error(err);
      setAdvice("Focus and consistency are the foundation of mastery. We recommend beginning with a structured core subject plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="advisor-title" className="bg-gradient-to-br from-brand-grey to-black rounded-[2.5rem] p-10 text-white overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
        <div className="md:w-1/3">
          <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,197,24,0.3)]">
             <svg aria-hidden="true" className="w-8 h-8 text-brand-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h2 id="advisor-title" className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">GoldMind AI<br/>Counsellor</h2>
          <p className="text-gray-300 text-sm font-medium leading-relaxed">Share your academic goals and receive a tailored recommendation for your study pathway.</p>
        </div>

        <div className="md:w-2/3 w-full bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
          {!advice ? (
            <div className="space-y-6">
              <label htmlFor="student-goals" className="sr-only">Describe your academic goals</label>
              <textarea 
                id="student-goals"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. I would like to improve my analytical skills in English Literature..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gold min-h-[120px] placeholder:text-gray-500 text-white"
              />
              <button 
                onClick={getAdvice}
                disabled={loading}
                className="w-full bg-gold text-brand-grey font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-yellow-400 focus:ring-4 focus:ring-gold/50 transition-all disabled:opacity-50 disabled:grayscale"
              >
                {loading ? 'Analysing goals...' : 'Receive Guidance'}
              </button>
            </div>
          ) : (
            <div role="region" aria-live="polite" className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-gold uppercase tracking-[0.3em]">Recommended Focus</span>
                <button 
                  onClick={() => setAdvice(null)} 
                  aria-label="Dismiss advice"
                  className="text-gray-400 hover:text-white transition-colors focus:ring-2 focus:ring-gold rounded-lg p-1"
                >
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <p className="text-sm font-medium leading-relaxed italic text-gray-200">"{advice}"</p>
              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => setAdvice(null)}
                  className="px-6 py-3 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 focus:ring-2 focus:ring-gold transition-colors"
                >
                  New Inquiry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdvisorAI;