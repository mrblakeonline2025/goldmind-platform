
import React, { useState } from 'react';
import { User, PlatformSettings, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface OnboardingWizardProps {
  currentUser: User;
  settings: PlatformSettings;
  onComplete: () => void;
  onLogout: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ 
  currentUser, settings, onComplete, onLogout
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Profile Form State
  const [academicData, setAcademicData] = useState({
    school: '',
    year_group: 'Year 11',
    exam_board: 'AQA',
    strengths: '',
    weaknesses: '',
    target_grades: {} as Record<string, string>
  });

  const canProgressStep1 = academicData.school.trim() !== '';
  const canProgressStep2 = academicData.strengths.trim() !== '' && academicData.weaknesses.trim() !== '';

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    try {
      const studentId = currentUser.role === UserRole.PARENT ? currentUser.linkedUserId : currentUser.id;
      if (!studentId) throw new Error("Account linkage error.");

      const { error } = await supabase.from('student_profiles').insert([{
        student_id: studentId,
        school: academicData.school,
        year_group: academicData.year_group,
        exam_board: academicData.exam_board,
        strengths: academicData.strengths,
        weaknesses: academicData.weaknesses,
        target_grades: academicData.target_grades
      }]);

      if (error) throw error;
      onComplete();
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTargetGrade = (subject: string, grade: string) => {
    setAcademicData(prev => ({
      ...prev,
      target_grades: { ...prev.target_grades, [subject]: grade }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
        <Logo url={settings.logoUrl} companyName={settings.companyName} size="md" />
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-end">
            <div className="flex gap-2 mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step >= s ? 'bg-gold' : 'bg-gray-200'}`}></div>
              ))}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step {step} of 3</p>
          </div>
          <button onClick={onLogout} className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-brand-grey transition-colors shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7"/></svg>
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-brand-grey p-10 text-white flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                    {step === 1 ? 'Academic Context' : step === 2 ? 'Diagnostics' : 'Goal Alignment'}
                </h2>
                <p className="text-[10px] font-black text-gold uppercase tracking-[0.3em]">Phase {step}: Academic Integration</p>
            </div>
        </div>

        <div className="p-12">
            {step === 1 && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current School</label>
                            <input required value={academicData.school} onChange={e=>setAcademicData({...academicData, school: e.target.value})} type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-bold" placeholder="e.g. Westside High" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Year Group</label>
                            <select value={academicData.year_group} onChange={e=>setAcademicData({...academicData, year_group: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-bold">
                                {['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Exam Board</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['AQA', 'Edexcel', 'OCR', 'Eduqas'].map(board => (
                                <button key={board} onClick={() => setAcademicData({...academicData, exam_board: board})} className={`py-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${academicData.exam_board === board ? 'border-gold bg-gold/5 text-brand-grey shadow-sm' : 'border-gray-50 text-gray-400 hover:border-gray-200'}`}>
                                    {board}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <button disabled={!canProgressStep1} onClick={() => setStep(2)} className="bg-brand-grey text-white font-black px-12 py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-30">
                            Continue to Diagnostics
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Strengths</label>
                        <textarea required value={academicData.strengths} onChange={e=>setAcademicData({...academicData, strengths: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-bold h-32 resize-none" placeholder="What subjects or topics does the student excel at?"></textarea>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Areas of Difficulty</label>
                        <textarea required value={academicData.weaknesses} onChange={e=>setAcademicData({...academicData, weaknesses: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-bold h-32 resize-none" placeholder="Where do they struggle most? Be specific about topics or exam techniques..."></textarea>
                    </div>
                    <div className="pt-6 border-t border-gray-100 flex justify-between">
                        <button onClick={() => setStep(1)} className="px-8 py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest">Back</button>
                        <button disabled={!canProgressStep2} onClick={() => setStep(3)} className="bg-brand-grey text-white font-black px-12 py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-30">
                            Continue to Goals
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500 font-medium">Define target grades for your core subjects. This data helps our lead tutors measure your ROI throughout the programme.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['Maths', 'English Lang', 'English Lit', 'Science'].map(subj => (
                                <div key={subj} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="font-black text-xs uppercase tracking-tight text-brand-grey">{subj}</span>
                                    <select 
                                        value={academicData.target_grades[subj] || ''} 
                                        onChange={e => updateTargetGrade(subj, e.target.value)}
                                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold"
                                    >
                                        <option value="">Select...</option>
                                        {['9', '8', '7', '6', '5', '4', '3'].map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pt-6 border-t border-gray-100 flex justify-between">
                        <button onClick={() => setStep(2)} className="px-8 py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest">Back</button>
                        <button disabled={isSaving} onClick={handleFinalSubmit} className="bg-gold text-brand-grey font-black px-12 py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:brightness-105 transition-all shadow-gm-gold active:scale-95">
                            {isSaving ? 'Saving Profile...' : 'Complete Onboarding'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
