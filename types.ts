
export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  PARENT = 'PARENT',
  TUTOR = 'TUTOR'
}

export type CourseCategory = 'Single Subject' | 'Multi Subject' | 'Custom Plan';
export type GroupFormat = 'Standard' | 'Enhanced';

export interface PlatformSettings {
  supportEmail: string;
  logoUrl: string;
  companyName: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  needsReset?: boolean;
  linkedUserId?: string; // e.g. Parent linked to Student
}

export interface StudentProfile {
  id: string;
  student_id: string;
  school: string;
  year_group: string;
  exam_board: string;
  strengths: string;
  weaknesses: string;
  target_grades: Record<string, string>;
  created_at: string;
}

export interface SessionNote {
  id: string;
  instanceId: string;
  tutorId: string;
  createdAt: string;
  sessionTitle: string;
  sessionSummary: string;
  homework?: string;
  studentFocus?: any;
}

export interface TuitionPackage {
  id: string;
  name: string;
  category: CourseCategory;
  tier?: GroupFormat;
  subject?: string;
  price: number | 'Variable';
  sessions: number | 'Variable';
  description: string;
  features: string[];
  stripeLink?: string;
  subjectsAllowed?: number;
  groupSize?: string;
}

export interface RecurringSlot {
  id: string;
  packageId: string;
  label: string;
  dayOfWeek: string;
  startTime: string;
  durationMinutes: number;
  keyStage: string;
  groupType: GroupFormat;
  maxCapacity: number;
  assignedTutorId: string | null;
  isBookingEnabled: boolean;
  classroomProvider?: string;
  classroomUrl?: string;
  classroomNotes?: string;
  createdAt?: string;
}

export interface GroupInstance {
  id: string;
  slotId?: string; // Optional link to parent slot
  packageId: string;
  label: string;
  dayOfWeek: string;
  startTime: string;
  durationMinutes: number;
  keyStage: string;
  groupType: GroupFormat;
  maxCapacity: number;
  assignedTutorId: string | null;
  tutorName?: string; // Human readable name
  isBookingEnabled: boolean;
  createdAt?: string;
  sessionDate?: string;
  classroomUrl?: string;
  classroomProvider?: string;
  classroomNotes?: string;
  recordingUrl?: string;
}

export interface Enrollment {
  id: string;
  packageId: string;
  instanceId: string;
  enrolledAt: Date | string;
  notes?: string;
  studentName?: string;
  studentId?: string;
  paymentStatus: 'Paid' | 'Pending';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export type ApplicationStatus = 'New' | 'Reviewed' | 'Approved' | 'Activated' | 'Rejected';
export type ApplicationSource = 'import' | 'google_form' | 'platform';

export interface TutorApplication {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  subjects?: string[];
  key_stages?: string[];
  dbs_status?: string;
  experience_notes?: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  created_at: string;
}

export interface TutorDirectoryEntry {
  id: string;
  created_at: string;
  timestamp_submitted: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  location: string | null;
  subjects: string[];
  years_gcse_experience: string | null;
  hourly_rate_group_gcse: string | null;
  weekly_availability: string | null;
  dbs_certificate: string | null;
  dbs_notes: string | null;
}

export type BespokeOfferStatus = 'Draft' | 'Sent' | 'Paid' | 'Cancelled';

export interface BespokeOffer {
  id: string;
  created_at: string;
  created_by_admin_id: string;
  student_id: string | null;
  offer_title: string;
  offer_description: string;
  package_id: string;
  slot_id: string;
  block_start_date: string;
  custom_price_gbp: number;
  payment_status: BespokeOfferStatus;
  payment_reference: string | null;
  public_token: string;
}

export interface BespokeEnquiry {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'New' | 'Contacted' | 'Closed';
}
