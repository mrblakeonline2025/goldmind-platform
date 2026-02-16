import React from 'react';
import { Enrollment, GroupInstance, TuitionPackage, UserRole } from '../types';
import { TUITION_PACKAGES } from '../constants';
import { formatInstanceSchedule } from '../lib/utils';

interface ParentProps {
  enrollments: Enrollment[];
  instances: GroupInstance[];
}

const ParentDashboard: React.FC<ParentProps> = ({ enrollments, instances }) => {
  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-brand-grey uppercase tracking-tighter leading-none mb-4">Family Hub</h1>
          <p className="text-gray-500 text-lg font-medium">Manage academic oversight and requirements for your child's learning.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50 bg-gray-50/50">
               <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Active Enrolments</h2>
             </div>
             <div className="p-8 space-y-6">
                {enrollments.map(en => {
                  const inst = instances.find(i => i.id === en.instanceId);
                  const pkg = TUITION_PACKAGES.find(p => p.id === en.packageId);
                  return (
                    <div key={en.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-brand-grey shadow-sm">
                            {inst?.label}
                         </div>
                         <div>
                            <h3 className="text-sm font-black text-brand-grey uppercase tracking-tight">{pkg?.name}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {inst ? formatInstanceSchedule(inst) : 'Pending Date'}
                            </p>
                            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">Tutor: {inst?.assignedTutorId || 'Pending Assignment'}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] font-black text-green-500 bg-green-50 px-4 py-2 rounded-full uppercase tracking-widest">Confirmed</span>
                      </div>
                    </div>
                  );
                })}
             </div>
          </section>

          <section className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50 bg-gray-50/50">
               <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Billing History</h2>
             </div>
             <div className="p-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                      <th className="pb-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Programme</th>
                      <th className="pb-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Session Schedule</th>
                      <th className="pb-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="pb-4 text-[8px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map(en => {
                      const pkg = TUITION_PACKAGES.find(p => p.id === en.packageId);
                      const inst = instances.find(i => i.id === en.instanceId);
                      return (
                        <tr key={en.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-6 text-[10px] font-bold text-gray-400 uppercase tracking-tight">{en.id.slice(0,8)}</td>
                          <td className="py-6 text-[10px] font-black text-brand-grey uppercase tracking-tight">{pkg?.name}</td>
                          <td className="py-6 text-[10px] font-medium text-gray-500 uppercase tracking-tight">{inst ? formatInstanceSchedule(inst) : '—'}</td>
                          <td className="py-6 text-[10px] font-black text-brand-grey uppercase tracking-tight">£{pkg?.price}</td>
                          <td className="py-6 text-right">
                            <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Verified</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </section>
        </div>

        <div className="space-y-10">
           <section className="bg-brand-grey rounded-[3rem] p-10 text-white shadow-2xl">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4">Quick Actions</h2>
              <div className="space-y-4">
                 <button className="w-full py-4 bg-gold text-brand-grey font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-yellow-400 transition-all">
                    Add Subject Focus
                 </button>
                 <button className="w-full py-4 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/20 transition-all">
                    Download Documents
                 </button>
                 <button className="w-full py-4 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/20 transition-all">
                    Update Profile
                 </button>
              </div>
           </section>

           <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Lead Tutor Update</h2>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <p className="text-[10px] font-medium italic text-gray-500">"Your child is demonstrating increased confidence in core concepts. We are now moving towards more complex application."</p>
                 <p className="text-[8px] font-black text-gold uppercase tracking-widest mt-4">Academic Team • GoldMind</p>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
