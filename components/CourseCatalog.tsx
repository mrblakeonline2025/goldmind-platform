
import React, { useState, useMemo } from 'react';
import PaymentModal from './PaymentModal';
import { GroupInstance, UserRole, TuitionPackage, GroupFormat, Enrollment, RecurringSlot } from '../types';
import { TUITION_PACKAGES, DAYS, AVAILABLE_SUBJECTS } from '../constants';
import MindsetMoment from './MindsetMoment';
import { formatInstanceSchedule, getNextOccurrence } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface CatalogProps {
  onEnroll: (slotId: string, startDate: string, packageId: string) => Promise<any>;
  enrolledInstanceIds: string[];
  instances: GroupInstance[];
  recurringSlots: RecurringSlot[];
  enrollments: Enrollment[];
  role: UserRole;
  onAddInstance: (instance: Omit<GroupInstance, 'id' | 'label' | 'createdAt'>) => void;
  onToggleBooking?: (instanceId: string) => void;
  highlightedSubject: string | null;
}

const CourseCatalog: React.FC<CatalogProps> = ({ 
  onEnroll, 
  enrolledInstanceIds, 
  instances,
  recurringSlots,
  enrollments,
  role, 
  onAddInstance,
  onToggleBooking,
  highlightedSubject 
}) => {
  const [selectedSlot, setSelectedSlot] = useState<RecurringSlot | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<TuitionPackage | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Single Subject');
  const [showAddForm, setShowAddForm] = useState<string | null>(null);

  // Multi-Subject Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<'subjects' | 'slots' | 'confirm'>('subjects');
  const [wizardSubjects, setWizardSubjects] = useState<string[]>([]);
  const [wizardSlotMap, setWizardSlotMap] = useState<Record<string, string>>({}); // subject -> slot_id
  
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryData, setEnquiryData] = useState({ name: '', email: '', phone: '', message: '' });

  const isAdmin = role === UserRole.ADMIN;
  const filteredPackages = TUITION_PACKAGES.filter(p => p.category === activeCategory);

  const checkOnboarding = async () => {
    if (isAdmin || role === UserRole.TUTOR) return true;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Direct check against Supabase for safety
    const { data } = await supabase.from('student_profiles').select('id').eq('student_id', user.id).single();
    if (!data) {
        alert("Action Required: Please complete your academic profile onboarding before booking a session.");
        window.location.reload(); // Trigger the Gate to show the wizard
        return false;
    }
    return true;
  };

  const handleBookClick = async (slot: RecurringSlot, pkg: TuitionPackage) => {
    if (!(await checkOnboarding())) return;
    setSelectedSlot(slot);
    setSelectedPackage(pkg);
    setIsPaymentOpen(true);
  };

  const handleBundleClick = async (pkg: TuitionPackage) => {
    if (!(await checkOnboarding())) return;
    setSelectedPackage(pkg);
    setWizardSubjects([]);
    setWizardSlotMap({});
    setWizardStep('subjects');
    setShowWizard(true);
  };

  const toggleWizardSubject = (subject: string) => {
    if (wizardSubjects.includes(subject)) {
      setWizardSubjects(prev => prev.filter(s => s !== subject));
    } else if (selectedPackage && wizardSubjects.length < (selectedPackage.subjectsAllowed || 0)) {
      setWizardSubjects(prev => [...prev, subject]);
    }
  };

  const proceedToSlots = () => {
    if (selectedPackage && wizardSubjects.length === selectedPackage.subjectsAllowed) {
      setWizardStep('slots');
    }
  };

  const proceedToConfirm = () => {
    if (wizardSubjects.every(s => wizardSlotMap[s])) {
      setWizardStep('confirm');
    }
  };

  const finalizeBundlePayment = () => {
    setIsPaymentOpen(true);
    setShowWizard(false);
  };

  const getRelevantSlotsForSubject = (subjectName: string) => {
    if (!selectedPackage) return [];
    const tier = selectedPackage.tier || 'Standard';
    return recurringSlots.filter(s => {
      const slotPkg = TUITION_PACKAGES.find(p => p.id === s.packageId);
      return slotPkg?.subject === subjectName && s.groupType === tier && s.isBookingEnabled;
    });
  };

  const handlePaymentSuccess = () => {
    setIsPaymentOpen(false);
    setSelectedSlot(null);
    setSelectedPackage(null);
    setWizardSubjects([]);
    setWizardSlotMap({});
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryLoading(true);
    try {
      const { error } = await supabase.from('bespoke_enquiries').insert([{
        full_name: enquiryData.name, email: enquiryData.email, phone: enquiryData.phone, message: enquiryData.message
      }]);
      if (error) throw error;
      setEnquirySuccess(true);
      setTimeout(() => { setShowEnquiryForm(false); setEnquirySuccess(false); setEnquiryData({ name: '', email: '', phone: '', message: '' }); }, 3000);
    } catch (err: any) { alert(err.message); } finally { setEnquiryLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 duration-500">
      <MindsetMoment />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-xl">
          <h1 className="text-4xl font-black text-brand-grey mb-3 uppercase tracking-tighter leading-none">
            {isAdmin ? 'System Management' : 'Enrolment Hub'}
          </h1>
          <p className="text-gray-500 text-base font-medium">Join a structured tuition program designed to build exam confidence.</p>
        </div>
        <nav aria-label="Category filter" className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-200">
          {(['Single Subject', 'Multi Subject', 'Custom Plan'] as const).map(cat => (
            <button 
              key={cat}
              onClick={() => { setActiveCategory(cat); setShowWizard(false); }}
              className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${activeCategory === cat ? 'bg-gold text-brand-grey shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {cat}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {filteredPackages.map(pkg => {
          const isHighlighted = highlightedSubject && (pkg.subject?.toLowerCase().includes(highlightedSubject.toLowerCase()) || pkg.name.toLowerCase().includes(highlightedSubject.toLowerCase()));

          return (
            <article key={pkg.id} className={`bg-white rounded-[2.5rem] border overflow-hidden shadow-sm flex flex-col group transition-all duration-300 hover:shadow-xl hover:border-gold/30 ${isHighlighted ? 'ring-4 ring-gold/20 border-gold' : 'border-gray-100'}`}>
              <div className="p-8 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 font-black text-[8px] rounded-lg uppercase tracking-widest">{pkg.tier || 'Bespoke'} Plan</span>
                    <h3 className="text-3xl font-black text-brand-grey uppercase tracking-tighter leading-none">{pkg.subject || pkg.name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-brand-grey leading-none">{pkg.price === 'Variable' ? '—' : `£${pkg.price}`}</p>
                    <p className="text-[8px] font-black text-gold uppercase tracking-widest mt-1">{pkg.sessions} Sessions</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">{pkg.description}</p>
              </div>

              <div className="bg-gray-50/80 border-t border-gray-100 p-8 flex-1 flex flex-col">
                {pkg.category === 'Multi Subject' ? (
                  <button onClick={() => handleBundleClick(pkg)} className="w-full bg-gold text-brand-grey font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-brand-grey hover:text-white transition-all shadow-lg">Configure {pkg.subjectsAllowed} Subject Bundle</button>
                ) : pkg.category === 'Custom Plan' ? (
                  <button onClick={() => setShowEnquiryForm(true)} className="w-full bg-brand-grey text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">Request Bespoke Offer</button>
                ) : (
                  <div className="space-y-3">
                    {recurringSlots.filter(s => s.packageId === pkg.id).map(slot => (
                      <div key={slot.id} className="p-4 rounded-2xl border bg-white border-gray-100 hover:border-gold shadow-sm transition-all flex items-center justify-between gap-4">
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] font-black text-brand-grey uppercase tracking-tight">Group {slot.label} • {slot.groupType}</p>
                          <p className="text-[8px] font-black text-gold uppercase tracking-widest mt-1">Starts: {getNextOccurrence(slot.dayOfWeek)}</p>
                        </div>
                        <button onClick={() => handleBookClick(slot, pkg)} className="font-black text-[9px] uppercase tracking-widest px-5 py-2.5 rounded-xl bg-gold text-brand-grey hover:bg-brand-grey hover:text-white transition-all">Book 4-Week Block</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* MULTI-SUBJECT WIZARD */}
      {showWizard && selectedPackage && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-grey p-8 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1">Step {wizardStep === 'subjects' ? '1' : wizardStep === 'slots' ? '2' : '3'} of 3</p>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedPackage.name}</h2>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-white/40 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            
            <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {wizardStep === 'subjects' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-black text-brand-grey uppercase tracking-tight mb-2">Pick Your {selectedPackage.subjectsAllowed} Subjects</h3>
                    <p className="text-xs text-gray-500 font-medium">Select exactly {selectedPackage.subjectsAllowed} subjects to include in this {selectedPackage.tier} bundle.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {AVAILABLE_SUBJECTS.map(subj => {
                      const isSelected = wizardSubjects.includes(subj);
                      return (
                        <button key={subj} onClick={() => toggleWizardSubject(subj)} className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${isSelected ? 'border-gold bg-gold/5' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                          <span className="font-black text-xs uppercase tracking-tight">{subj}</span>
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${isSelected ? 'bg-gold border-gold' : 'bg-white border-gray-200'}`}>{isSelected && <svg className="w-3 h-3 text-brand-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {wizardStep === 'slots' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-black text-brand-grey uppercase tracking-tight mb-2">Select Your Timeslots</h3>
                    <p className="text-xs text-gray-500 font-medium">Choose a recurring group for each of your selected subjects.</p>
                  </div>
                  <div className="space-y-10">
                    {wizardSubjects.map(subj => {
                      const available = getRelevantSlotsForSubject(subj);
                      return (
                        <div key={subj} className="space-y-4">
                          <h4 className="text-[10px] font-black text-gold uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-gold rounded-full"></span>{subj}</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {available.length === 0 ? (
                              <p className="text-[10px] font-bold text-gray-400 uppercase italic">No {selectedPackage.tier} slots available for this subject.</p>
                            ) : (
                              available.map(slot => (
                                <button key={slot.id} onClick={() => setWizardSlotMap(prev => ({ ...prev, [subj]: slot.id }))} className={`text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${wizardSlotMap[subj] === slot.id ? 'border-brand-grey bg-brand-grey text-white' : 'border-gray-100 hover:border-gold'}`}>
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-tight">{slot.dayOfWeek} at {slot.startTime}</p>
                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${wizardSlotMap[subj] === slot.id ? 'text-gold' : 'text-gray-400'}`}>Group {slot.label} • {slot.groupType}</p>
                                  </div>
                                  {wizardSlotMap[subj] === slot.id && <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {wizardStep === 'confirm' && (
                <div className="space-y-8 text-center py-6">
                  <div className="w-20 h-20 bg-gold/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                  <div>
                    <h3 className="text-2xl font-black text-brand-grey uppercase tracking-tight mb-2">Bundle Summary</h3>
                    <p className="text-sm text-gray-500 font-medium">You are enrolling in {wizardSubjects.length} subjects for a total of {wizardSubjects.length * 4} sessions.</p>
                  </div>
                  <div className="bg-gray-50 rounded-3xl p-8 space-y-4 text-left border border-gray-100">
                    {wizardSubjects.map(s => {
                      const slot = recurringSlots.find(rs => rs.id === wizardSlotMap[s]);
                      return (
                        <div key={s} className="flex justify-between items-center border-b border-gray-200/50 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-[11px] font-black text-brand-grey uppercase tracking-tight">{s}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{slot?.dayOfWeek}s • {slot?.startTime}</p>
                          </div>
                          <span className="text-[8px] font-black text-gold uppercase tracking-widest">4 Sessions</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-end pt-4">
                    <div className="text-left"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bundle Price</p><p className="text-4xl font-black text-brand-grey">£{selectedPackage.price}</p></div>
                    <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p><p className="text-lg font-black text-brand-grey">4 Weeks</p></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4">
              {wizardStep !== 'subjects' && <button onClick={() => setWizardStep(wizardStep === 'slots' ? 'subjects' : 'slots')} className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:text-brand-grey hover:border-brand-grey transition-all">Back</button>}
              {wizardStep === 'subjects' && <button disabled={wizardSubjects.length !== selectedPackage.subjectsAllowed} onClick={proceedToSlots} className={`flex-1 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl transition-all ${wizardSubjects.length === selectedPackage.subjectsAllowed ? 'bg-brand-grey text-white hover:bg-black' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Choose Time Slots</button>}
              {wizardStep === 'slots' && <button disabled={!wizardSubjects.every(s => wizardSlotMap[s])} onClick={proceedToConfirm} className={`flex-1 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl transition-all ${wizardSubjects.every(s => wizardSlotMap[s]) ? 'bg-brand-grey text-white hover:bg-black' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Review Bundle</button>}
              {wizardStep === 'confirm' && <button onClick={finalizeBundlePayment} className="flex-1 bg-gold text-brand-grey font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-brand-grey hover:text-white transition-all">Proceed to Checkout</button>}
            </div>
          </div>
        </div>
      )}

      {showEnquiryForm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-grey/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-12 animate-in zoom-in-95 duration-200">
            {enquirySuccess ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></div>
                <h3 className="text-2xl font-black text-brand-grey uppercase tracking-tight">Enquiry Received</h3>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-6">
                <h2 className="text-3xl font-black text-brand-grey uppercase tracking-tighter mb-2">Bespoke Request</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label><input required value={enquiryData.name} onChange={e=>setEnquiryData({...enquiryData, name: e.target.value})} type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label><input required value={enquiryData.phone} onChange={e=>setEnquiryData({...enquiryData, phone: e.target.value})} type="tel" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" /></div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label><input required value={enquiryData.email} onChange={e=>setEnquiryData({...enquiryData, email: e.target.value})} type="email" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Request</label><textarea required value={enquiryData.message} onChange={e=>setEnquiryData({...enquiryData, message: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold h-32 resize-none" placeholder="Subjects, grade targets..."></textarea></div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={enquiryLoading} className="flex-1 bg-brand-grey text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Submit Request</button>
                  <button type="button" onClick={() => setShowEnquiryForm(false)} className="px-8 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isPaymentOpen && selectedPackage && (
        <PaymentModal 
          onEnrolAction={async (pkgId, _instId) => {
            if (selectedPackage.category === 'Multi Subject') {
              const earliestDate = getNextOccurrence('Monday'); 
              const { data, error } = await supabase.rpc('book_multi_subject_block', {
                p_bundle_package_id: pkgId,
                p_start_date: earliestDate, 
                p_subject_slot_map: wizardSlotMap,
                p_payment_mode: 'Paid'
              });
              return { error };
            } else if (selectedSlot) {
              const startDate = getNextOccurrence(selectedSlot.dayOfWeek);
              return onEnroll(selectedSlot.id, startDate, pkgId);
            }
          }}
          packageId={selectedPackage.id}
          selectedSubjects={wizardSubjects}
          group={{
            id: selectedSlot?.id || 'bundle',
            name: selectedPackage.category === 'Multi Subject' ? `${selectedPackage.name} (${wizardSubjects.join(', ')})` : selectedPackage.subject || selectedPackage.name,
            price: selectedPackage.price,
            format: selectedPackage.tier || 'Standard',
            category: selectedPackage.category,
            stripeLink: selectedPackage.stripeLink,
            instanceLabel: selectedSlot?.label || 'Bundle'
          }} 
          onClose={() => { setIsPaymentOpen(false); setSelectedSlot(null); setSelectedPackage(null); }} 
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default CourseCatalog;
