
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RecurringSlot, User, UserRole } from '../types';
import { TUITION_PACKAGES } from '../constants';

interface BespokeOfferModalProps {
  onClose: () => void;
  onSuccess: () => void;
  recurringSlots: RecurringSlot[];
}

const BespokeOfferModal: React.FC<BespokeOfferModalProps> = ({ onClose, onSuccess, recurringSlots }) => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    offer_title: '',
    offer_description: '',
    package_id: 'p-custom-bespoke',
    slot_id: '',
    block_start_date: '',
    custom_price_gbp: 0,
    student_id: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'STUDENT').order('name');
    if (data && !error) setStudents(data.map(p => ({ id: p.id, name: p.name, email: '', role: UserRole.STUDENT })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('bespoke_offers').insert([{
        ...formData,
        created_by_admin_id: user?.id,
        payment_status: 'Draft'
      }]);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert("Creation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
        <h2 className="text-3xl font-black text-brand-grey uppercase tracking-tighter mb-8">Create Bespoke Offer</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Offer Title</label><input required value={formData.offer_title} onChange={e=>setFormData({...formData, offer_title: e.target.value})} type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" placeholder="e.g. Bespoke GCSE Maths Extension" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custom Price (GBP)</label><input required value={formData.custom_price_gbp} onChange={e=>setFormData({...formData, custom_price_gbp: Number(e.target.value)})} type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" /></div>
          </div>
          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Student</label><select required value={formData.student_id} onChange={e=>setFormData({...formData, student_id: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold"><option value="">Select Student...</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Slot</label><select required value={formData.slot_id} onChange={e=>setFormData({...formData, slot_id: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold"><option value="">Choose Recurring Slot...</option>{recurringSlots.map(s => <option key={s.id} value={s.id}>{s.dayOfWeek} {s.startTime} ({TUITION_PACKAGES.find(p=>p.id===s.packageId)?.name})</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Block Start Date</label><input required value={formData.block_start_date} onChange={e=>setFormData({...formData, block_start_date: e.target.value})} type="date" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" /></div>
          </div>
          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terms & Description</label><textarea required value={formData.offer_description} onChange={e=>setFormData({...formData, offer_description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold h-32 resize-none" placeholder="Detail exactly what this price covers..."></textarea></div>
          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="flex-1 bg-brand-grey text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl">{loading ? 'Creating...' : 'Issue Offer'}</button>
            <button type="button" onClick={onClose} className="px-8 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BespokeOfferModal;
