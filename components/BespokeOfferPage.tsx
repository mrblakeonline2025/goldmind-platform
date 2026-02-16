
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BespokeOffer } from '../types';

interface BespokeOfferPageProps {
  token: string;
  onGoToLogin: () => void;
}

const BespokeOfferPage: React.FC<BespokeOfferPageProps> = ({ token, onGoToLogin }) => {
  const [offer, setOffer] = useState<BespokeOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'view' | 'notified'>('view');

  useEffect(() => {
    fetchOffer();
  }, [token]);

  const fetchOffer = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('bespoke_offers').select('*').eq('public_token', token).single();
    if (data && !error) setOffer(data);
    setLoading(false);
  };

  if (loading) return <div className="fixed inset-0 bg-gm-bg flex items-center justify-center"><div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div></div>;

  if (!offer) return (
    <div className="min-h-screen bg-brand-grey flex items-center justify-center p-8 text-center">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md">
        <h1 className="text-3xl font-black text-brand-grey uppercase tracking-tighter mb-4">Link Invalid</h1>
        <p className="text-gray-500 font-medium mb-8">This bespoke offer has expired or is no longer available in the registry.</p>
        <button onClick={onGoToLogin} className="w-full bg-brand-grey text-white font-black py-5 rounded-2xl uppercase text-xs tracking-widest">Back to Login</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-grey flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
      
      <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 relative z-10">
        <div className="flex flex-col md:flex-row min-h-[600px]">
          <div className="md:w-1/2 bg-gray-50 p-16 flex flex-col justify-between border-r border-gray-100">
             <div>
               <p className="text-[11px] font-black text-gold uppercase tracking-[0.4em] mb-4">Academic Consultation</p>
               <h1 className="text-4xl font-black text-brand-grey uppercase tracking-tighter leading-none mb-4">{offer.offer_title}</h1>
               <p className="text-gray-500 font-medium leading-relaxed mb-10">{offer.offer_description}</p>
             </div>
             <div>
               <div className="flex justify-between items-end border-t border-gray-200 pt-8">
                 <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Fee</p><p className="text-5xl font-black text-brand-grey">£{offer.custom_price_gbp}</p></div>
               </div>
             </div>
          </div>
          
          <div className="md:w-1/2 p-16 flex flex-col justify-center text-center">
             {status === 'view' ? (
               <div className="space-y-10">
                 <div className="w-20 h-20 bg-gold rounded-[2rem] flex items-center justify-center mx-auto shadow-gm-gold"><svg className="w-10 h-10 text-brand-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                 <div><h2 className="text-2xl font-black text-brand-grey uppercase tracking-tight mb-2">Manual Verification</h2><p className="text-sm text-gray-500 font-medium">Please finalize your payment using the external link provided by your academic lead.</p></div>
                 <div className="space-y-4">
                   <button onClick={() => setStatus('notified')} className="w-full bg-brand-grey text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl">I Have Paid Externally</button>
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">Verification typically takes 12-24 hours.</p>
                 </div>
               </div>
             ) : (
               <div className="space-y-8 animate-in slide-in-from-bottom-4">
                 <div className="w-20 h-20 bg-green-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl"><svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></div>
                 <h2 className="text-2xl font-black text-brand-grey uppercase tracking-tight leading-none">Awaiting Verification</h2>
                 <p className="text-sm text-gray-500 font-medium leading-relaxed">Our finance team has been notified. Access to your live sessions will be unlocked in your portal once confirmed.</p>
                 <button onClick={onGoToLogin} className="w-full border-2 border-brand-grey text-brand-grey font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-brand-grey hover:text-white transition-all">Sign In to Portal</button>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BespokeOfferPage;
