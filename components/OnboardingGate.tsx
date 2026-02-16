
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole, StudentProfile, PlatformSettings, GroupInstance, RecurringSlot, Enrollment } from '../types';
import OnboardingWizard from './OnboardingWizard';

interface OnboardingGateProps {
  currentUser: User;
  settings: PlatformSettings;
  instances: GroupInstance[];
  recurringSlots: RecurringSlot[];
  enrollments: Enrollment[];
  onProfileLoaded: (profile: StudentProfile) => void;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const OnboardingGate: React.FC<OnboardingGateProps> = ({ 
  currentUser, settings, instances, recurringSlots, enrollments, onProfileLoaded, onLogout, onRefresh, children 
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    // Only students and parents (linked to students) need academic onboarding
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.TUTOR) {
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    const studentId = currentUser.role === UserRole.PARENT ? currentUser.linkedUserId : currentUser.id;
    if (!studentId) {
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (data && !error) {
      setProfile(data);
      onProfileLoaded(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gm-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  // If user is STUDENT/PARENT and has no profile, show Wizard
  const needsOnboarding = (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) && !profile;

  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-gm-bg py-10">
        <OnboardingWizard 
          currentUser={currentUser} 
          settings={settings} 
          onComplete={async () => {
            await fetchProfile();
            await onRefresh();
          }}
          onLogout={onLogout}
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default OnboardingGate;
