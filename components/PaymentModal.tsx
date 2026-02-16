
import React, { useState, useEffect } from 'react';
import { TuitionPackage, CourseCategory, GroupFormat } from '../types';
import { supabase } from '../lib/supabase';

interface PaymentModalProps {
  group: Partial<TuitionPackage> & { category?: CourseCategory; format?: GroupFormat; instanceLabel?: string };
  onClose: () => void;
  onSuccess: () => void;
  isAdminOverride?: boolean;
  onEnrolAction?: (packageId: string, instanceId: string) => Promise<any>;
  packageId?: string;
  selectedSubjects?: string[];
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  group, 
  onClose, 
  onSuccess, 
  isAdminOverride, 
  onEnrolAction, 
  packageId: packageIdProp, 
  selectedSubjects 
}) => {
  const [step, setStep] = useState<'details' | 'processing' | 'timeout' | 'success'>('details');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleStripeRedirect = () => {
    if (group.stripeLink) {
      window.open(group.stripeLink, '_blank');
    }
  };

  const handleConfirmPaid = async () => {
    const selectedId = group.id; 
    const selectedPackageId = packageIdProp;

    if (!selectedPackageId) {
      alert("Enrolment information is incomplete. Please try again.");
      return;
    }

    setStep('processing');
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expired. Please log in again.');
        setStep('details');
        return;
      }

      if (onEnrolAction) {
        const { error } = await onEnrolAction(selectedPackageId, selectedId || 'bundle');
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('enroll_block', {
          start_instance_id: selectedId,
          package_id: selectedPackageId,
          notes: ''
        });
        if (error) throw error;
      }

      setStep('details');
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
      
    } catch (err: any) {
      setStep('details');
      const msg = err.message || "An unexpected error occurred during confirmation.";
      setErrorMsg(msg);
    }
  };

  if (step === 'success') {
    return (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-grey/90 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg aria-hidden="true" className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-brand-grey uppercase tracking-tight mb-2">Enrolment Confirmed</h2>
          <p className="text-gray-600 font-medium">Welcome to the programme. Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-grey/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex flex-col md:flex-row h-auto min-h-[550px]">
          <div className="md:w-5/12 bg-gray-50 p-8 border-r border-gray-100 flex flex-col">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Enrolment Details</h3>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-500">{group.format} Plan</p>
              <h4 className="text-xl font-black text-brand-grey leading-tight mb-1">{group.name}</h4>
              <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-4">Slot {group.instanceLabel}</p>
              
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tuition Fee</span>
                  <span className="font-bold text-brand-grey">{group.price === 'Variable' ? 'Variable' : `£${group.price}`}</span>
                </div>
                {selectedSubjects && selectedSubjects.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Selected Focus</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSubjects.map(s => <span key={s} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[7px] font-black text-brand-grey uppercase">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-6 border-t border-gray-200 mt-auto">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total</span>
                <span className="text-3xl font-black text-brand-grey leading-none">{group.price === 'Variable' ? 'TBC' : `£${group.price}`}</span>
              </div>
            </div>
          </div>

          <div className="md:w-7/12 p-10 flex flex-col justify-center relative">
            <button 
              onClick={onClose} 
              disabled={step === 'processing'}
              className="absolute top-6 right-6 text-gray-400 hover:text-brand-grey focus:ring-2 focus:ring-gold rounded-lg transition-colors p-1 disabled:opacity-30"
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

            {step === 'details' ? (
              <div className="space-y-6">
                <div>
                  <h2 id="payment-modal-title" className="text-2xl font-black text-brand-grey uppercase tracking-tight mb-1">
                    {isAdminOverride ? 'Admin Override' : 'Confirmation'}
                  </h2>
                  <p className="text-sm text-gray-600">Complete your payment to verify your enrolment.</p>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button onClick={handleStripeRedirect} className="w-full bg-brand-grey text-white font-black py-4 rounded-2xl hover:bg-black focus:ring-4 focus:ring-brand-grey/50 transition-all shadow-lg uppercase tracking-widest flex items-center justify-center gap-3">
                    <span>Secure Checkout</span>
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </button>
                  <div className="flex items-center gap-4 py-2"><div className="h-px bg-gray-100 flex-1"></div><span className="text-[10px] font-black text-gray-400 uppercase">Verification</span><div className="h-px bg-gray-100 flex-1"></div></div>
                  <button onClick={handleConfirmPaid} className="w-full border-2 border-brand-grey text-brand-grey font-black py-4 rounded-2xl hover:bg-brand-grey hover:text-white focus:ring-2 focus:ring-brand-grey transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                    Payment Complete
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" aria-busy="true">
                <div className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-xl font-black text-brand-grey uppercase tracking-tight">Processing bundle enrolment…</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
