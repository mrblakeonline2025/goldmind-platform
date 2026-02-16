import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TutorDirectoryEntry } from '../types';

const DBS_OPTIONS = ['Yes', 'No', 'Applied', 'Expired', 'Update Needed'];
const SUBJECT_CHIPS = ['GCSE Maths', 'GCSE English Language', 'GCSE English Literature', 'GCSE Science', 'KS1', 'KS2', 'KS3', 'Other'];

interface TutorDirectoryProps {
  onAccountCreated?: () => void;
}

const TutorDirectory: React.FC<TutorDirectoryProps> = ({ onAccountCreated }) => {
  const [tutors, setTutors] = useState<TutorDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dbsFilter, setDbsFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingTutor, setEditingTutor] = useState<TutorDirectoryEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Directory Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    location: '',
    subjects: [] as string[],
    years_gcse_experience: '',
    hourly_rate_group_gcse: '',
    weekly_availability: '',
    dbs_certificate: 'No',
    dbs_notes: '',
    timestamp_submitted: ''
  });

  // Account Creation Form State
  const [accountData, setAccountData] = useState({
    full_name: '',
    email: '',
    phone: '',
    subjects: [] as string[]
  });

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tutors_directory')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data && !error) setTutors(data);
    setLoading(false);
  };

  /**
   * Invokes the secure Edge Function to create an Auth user and Profile.
   */
  const createTutorAccount = async (payload: any) => {
    const { data, error } = await supabase.functions.invoke('admin-create-tutor', {
      body: payload
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setAccountFeedback(null);

    try {
      await createTutorAccount(accountData);
      
      setAccountFeedback({ message: `Success: Tutor account created for ${accountData.full_name}. Invitation sent.`, type: 'success' });
      setAccountData({ full_name: '', email: '', phone: '', subjects: [] });
      
      // Trigger parent refresh if exists (to update slot tutor lists)
      if (onAccountCreated) {
        onAccountCreated();
      }

      // Local refresh of directory list
      fetchTutors();

      setTimeout(() => {
        setShowAccountModal(false);
        setAccountFeedback(null);
      }, 2000);
    } catch (err: any) {
      setAccountFeedback({ message: err.message || "Failed to create account.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const isAccountValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return accountData.full_name.trim().length > 0 && emailRegex.test(accountData.email);
  }, [accountData]);

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      location: '',
      subjects: [],
      years_gcse_experience: '',
      hourly_rate_group_gcse: '',
      weekly_availability: '',
      dbs_certificate: 'No',
      dbs_notes: '',
      timestamp_submitted: ''
    });
    setEditingTutor(null);
  };

  const handleEdit = (tutor: TutorDirectoryEntry) => {
    setEditingTutor(tutor);
    setFormData({
      first_name: tutor.first_name,
      last_name: tutor.last_name,
      email: tutor.email,
      phone: tutor.phone || '',
      address: tutor.address || '',
      location: tutor.location || '',
      subjects: tutor.subjects || [],
      years_gcse_experience: tutor.years_gcse_experience || '',
      hourly_rate_group_gcse: tutor.hourly_rate_group_gcse || '',
      weekly_availability: tutor.weekly_availability || '',
      dbs_certificate: tutor.dbs_certificate || 'No',
      dbs_notes: tutor.dbs_notes || '',
      timestamp_submitted: tutor.timestamp_submitted ? new Date(tutor.timestamp_submitted).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tutor record?')) return;
    const { error } = await supabase.from('tutors_directory').delete().eq('id', id);
    if (!error) fetchTutors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      ...formData,
      timestamp_submitted: formData.timestamp_submitted ? new Date(formData.timestamp_submitted).toISOString() : new Date().toISOString()
    };

    try {
      if (editingTutor) {
        const { error } = await supabase.from('tutors_directory').update(payload).eq('id', editingTutor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tutors_directory').insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchTutors();
      resetForm();
    } catch (err: any) {
      alert('Error saving tutor: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSubject = (subj: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subj) 
        ? prev.subjects.filter(s => s !== subj) 
        : [...prev.subjects, subj]
    }));
  };

  const toggleAccountSubject = (subj: string) => {
    setAccountData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subj) 
        ? prev.subjects.filter(s => s !== subj) 
        : [...prev.subjects, subj]
    }));
  };

  const filteredTutors = useMemo(() => {
    return tutors.filter(t => {
      const matchesSearch = `${t.first_name} ${t.last_name} ${t.email} ${t.location}`.toLowerCase().includes(search.toLowerCase());
      const matchesDbs = dbsFilter === 'All' || t.dbs_certificate === dbsFilter;
      const matchesSubject = subjectFilter === 'All' || t.subjects.includes(subjectFilter);
      return matchesSearch && matchesDbs && matchesSubject;
    });
  }, [tutors, search, dbsFilter, subjectFilter]);

  return (
    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-xl font-black text-brand-grey uppercase tracking-tight mb-2">Academic Team Hub</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage internal tutor directory and system accounts.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setAccountFeedback(null); setShowAccountModal(true); }}
            className="bg-gold text-brand-grey font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:brightness-105 transition-all shadow-gm-gold active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            Add Tutor
          </button>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-brand-grey text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
          >
            + Add to Directory
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Search name, email, or location..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-6 py-4 text-xs font-bold"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div className="flex gap-4">
          <select value={dbsFilter} onChange={e => setDbsFilter(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-[10px] font-black uppercase tracking-widest">
            <option value="All">DBS Status: All</option>
            {DBS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-[10px] font-black uppercase tracking-widest">
            <option value="All">Subject: All</option>
            {SUBJECT_CHIPS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Tutor</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Subjects</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Exp / Rate</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">DBS</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><div className="w-8 h-8 border-4 border-gold/20 border-t-gold rounded-full animate-spin mx-auto"></div></td></tr>
              ) : filteredTutors.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">No tutor records found</td></tr>
              ) : filteredTutors.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-brand-grey uppercase tracking-tight">{t.first_name} {t.last_name}</p>
                    <p className="text-[9px] font-bold text-gray-400">{t.email}</p>
                    <p className="text-[8px] font-bold text-gold uppercase tracking-widest mt-1">{t.location || 'No Location Set'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {t.subjects.map(s => <span key={s} className="bg-white border border-gray-100 text-[7px] font-black px-1.5 py-0.5 rounded uppercase">{s}</span>)}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-bold text-brand-grey">{t.years_gcse_experience || 0} Years</p>
                    <p className="text-[9px] font-black text-gold uppercase tracking-widest">{t.hourly_rate_group_gcse || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                      t.dbs_certificate === 'Yes' ? 'bg-green-50 text-green-500' :
                      t.dbs_certificate === 'No' ? 'bg-red-50 text-red-500' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {t.dbs_certificate}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button onClick={() => handleEdit(t)} className="text-[8px] font-black uppercase text-brand-grey hover:text-gold transition-colors">Edit</button>
                    <button onClick={() => handleDelete(t.id)} className="text-[8px] font-black uppercase text-red-500 hover:text-red-700 transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACCOUNT CREATION MODAL */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-grey p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Create Tutor Account</h2>
                <p className="text-[9px] font-bold text-gold uppercase tracking-[0.2em] mt-2">Authenticated System Access</p>
              </div>
              <button disabled={isSaving} onClick={() => setShowAccountModal(false)} className="text-white/40 hover:text-white disabled:opacity-30"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-10 space-y-6">
              {accountFeedback && (
                <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2 flex items-center gap-3 ${
                  accountFeedback.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  {accountFeedback.type === 'success' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                  <p className="flex-1 leading-relaxed">{accountFeedback.message}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" value={accountData.full_name} onChange={e => setAccountData({...accountData, full_name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="e.g. Dr. Jane Smith" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input required type="email" value={accountData.email} onChange={e => setAccountData({...accountData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="jane@goldmind.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number (Optional)</label>
                <input type="tel" value={accountData.phone} onChange={e => setAccountData({...accountData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subjects Focus</label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_CHIPS.map(subj => (
                    <button 
                      key={subj} 
                      type="button" 
                      onClick={() => toggleAccountSubject(subj)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        accountData.subjects.includes(subj) ? 'bg-gold text-brand-grey border-gold shadow-gm-gold' : 'bg-white border border-gray-100 text-gray-400'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="submit" 
                  disabled={isSaving || !isAccountValid} 
                  className="flex-1 bg-brand-grey text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                  {isSaving ? 'Creating...' : 'Create Tutor Account'}
                </button>
                <button type="button" disabled={isSaving} onClick={() => setShowAccountModal(false)} className="px-10 py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECTORY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-grey p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{editingTutor ? 'Edit Tutor Registry' : 'Add to Registry'}</h2>
                <p className="text-[9px] font-bold text-gold uppercase tracking-[0.2em] mt-2">Internal Academic Registry</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Firstname</label>
                  <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lastname</label>
                  <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</label>
                  <input type="datetime-local" value={formData.timestamp_submitted} onChange={e => setFormData({...formData, timestamp_submitted: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" />
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Which subject(s) do you tutor?</label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_CHIPS.map(subj => (
                    <button 
                      key={subj} 
                      type="button" 
                      onClick={() => toggleSubject(subj)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        formData.subjects.includes(subj) ? 'bg-gold text-brand-grey border-gold shadow-sm' : 'bg-white border border-gray-100 text-gray-400 hover:border-gold'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Years of GCSE experience</label>
                  <input type="text" value={formData.years_gcse_experience} onChange={e => setFormData({...formData, years_gcse_experience: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="e.g. 5" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hourly rate for GCSE group tutoring</label>
                  <input type="text" value={formData.hourly_rate_group_gcse} onChange={e => setFormData({...formData, hourly_rate_group_gcse: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="e.g. £40/hr" />
                </div>
              </div>

              <div className="space-y-2 mb-10">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold h-20 resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weekly availability</label>
                  <textarea value={formData.weekly_availability} onChange={e => setFormData({...formData, weekly_availability: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold h-24 resize-none" placeholder="Mon 5-7pm, Wed 4-6pm..." />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DBS certificate?</label>
                    <select value={formData.dbs_certificate} onChange={e => setFormData({...formData, dbs_certificate: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold">
                      {DBS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DBS Notes</label>
                    <input type="text" value={formData.dbs_notes} onChange={e => setFormData({...formData, dbs_notes: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="Reference number or expiry date..." />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" disabled={isSaving} className="flex-1 bg-brand-grey text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">
                  {isSaving ? 'Saving...' : editingTutor ? 'Update Registry' : 'Add to Registry'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-10 py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorDirectory;