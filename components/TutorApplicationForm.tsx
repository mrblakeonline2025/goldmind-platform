import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AVAILABLE_SUBJECTS } from '../constants';

interface TutorApplicationFormProps {
  onBack: () => void;
}

const TutorApplicationForm: React.FC<TutorApplicationFormProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    dbs_status: 'No',
    experience_notes: '',
    subjects: [] as string[],
    key_stages: [] as string[]
  });

  const toggleSubject = (s: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(s) 
        ? prev.subjects.filter(item => item !== s) 
        : [...prev.subjects, s]
    }));
  };

  const toggleKS = (ks: string) => {
    setFormData(prev => ({
      ...prev,
      key_stages: prev.key_stages.includes(ks) 
        ? prev.key_stages.filter(item => item !== ks) 
        : [...prev.key_stages, ks]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('tutor_applications').insert([{
        ...formData,
        status: 'New',
        source: 'platform'
    }]);

    if (error) {
        alert("Submission failed: " + error.message);
    } else {
        setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-[3rem] p-12 text-center animate-in zoom-in-95 duration-500 shadow-2xl">
        <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 className="text-3xl font-black text-brand-grey uppercase tracking-tighter mb-4">Application Received</h2>
        <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10">Our academic team will review your credentials and contact you via email shortly.</p>
        <button onClick={onBack} className="bg-brand-grey text-white font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition-all">Return to Portal</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
        <div className="bg-brand-grey p-12 text-white">
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">Tutor for GoldMind</h1>
            <p className="text-gray-400 font-medium">Join an elite academic team delivering clarity-first tuition.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-12 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                    <input required value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="e.g. Dr. Jane Smith" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                    <input required value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} type="email" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="jane@example.com" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} type="tel" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="+44 7..." />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DBS Status</label>
                    <select value={formData.dbs_status} onChange={e=>setFormData({...formData, dbs_status: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold">
                        <option value="Yes - Enhanced">Yes - Enhanced</option>
                        <option value="Yes - Standard">Yes - Standard</option>
                        <option value="Pending">Pending</option>
                        <option value="No">No</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subjects & Specialisms</label>
                <div className="flex flex-wrap gap-3">
                    {AVAILABLE_SUBJECTS.map(s => (
                        <button key={s} type="button" onClick={()=>toggleSubject(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.subjects.includes(s) ? 'bg-gold text-brand-grey' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>{s}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Key Stages</label>
                <div className="flex flex-wrap gap-3">
                    {['KS1', 'KS2', 'KS3', 'KS4', 'KS5'].map(ks => (
                        <button key={ks} type="button" onClick={()=>toggleKS(ks)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.key_stages.includes(ks) ? 'bg-brand-grey text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>{ks}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Brief Experience Summary</label>
                <textarea required value={formData.experience_notes} onChange={e=>setFormData({...formData, experience_notes: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold min-h-[120px] resize-none" placeholder="Detail your academic background and tuition success..."></textarea>
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-6">
                <button type="submit" disabled={loading} className="flex-1 bg-brand-grey text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl">
                    {loading ? 'Submitting...' : 'Submit Application'}
                </button>
                <button type="button" onClick={onBack} className="px-10 py-5 text-gray-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
            </div>
        </form>
    </div>
  );
};

export default TutorApplicationForm;