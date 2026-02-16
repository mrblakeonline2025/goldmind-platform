
import { TuitionPackage, GroupInstance } from './types';

export const TUITION_PACKAGES: TuitionPackage[] = [
  /* =========================
     SINGLE SUBJECT – STANDARD (£120)
     ========================= */
  {
    id: 'p-maths-std',
    name: 'GCSE Maths',
    category: 'Single Subject',
    tier: 'Standard',
    subject: 'GCSE Maths',
    price: 120,
    sessions: 4,
    groupSize: '10-14 students',
    stripeLink: 'https://buy.stripe.com/00w5kvdubcio1XbgQ30Fi00',
    description: 'Calm, structured GCSE Maths programme focused on method, accuracy and exam confidence.',
    features: ["4 live sessions", "Step-by-step explanations", "Exam board aligned", "Method and accuracy focus"]
  },
  {
    id: 'p-eng-lang-std',
    name: 'GCSE English Language',
    category: 'Single Subject',
    tier: 'Standard',
    subject: 'GCSE English Language',
    price: 120,
    sessions: 4,
    groupSize: '10-14 students',
    stripeLink: 'https://buy.stripe.com/00w5kvdubcio1XbgQ30Fi00',
    description: 'Structured English Language programme developing clarity and writing control.',
    features: ["4 live sessions", "Reading strategies", "Writing refinement", "Mark scheme awareness"]
  },
  {
    id: 'p-eng-lit-std',
    name: 'GCSE English Literature',
    category: 'Single Subject',
    tier: 'Standard',
    subject: 'GCSE English Literature',
    price: 120,
    sessions: 4,
    groupSize: '10-14 students',
    stripeLink: 'https://buy.stripe.com/00w5kvdubcio1XbgQ30Fi00',
    description: 'Literature programme simplifying themes, characters and essay structure.',
    features: ["4 live sessions", "Theme and character clarity", "Quotation integration", "Essay planning"]
  },
  {
    id: 'p-sci-std',
    name: 'GCSE Science',
    category: 'Single Subject',
    tier: 'Standard',
    subject: 'GCSE Science',
    price: 120,
    sessions: 4,
    groupSize: '10-14 students',
    stripeLink: 'https://buy.stripe.com/00w5kvdubcio1XbgQ30Fi00',
    description: 'Science support through clarity and exam application across Biology, Chemistry, Physics.',
    features: ["4 live sessions", "Concept clarification", "Scientific vocabulary", "Exam practice"]
  },

  /* =========================
     SINGLE SUBJECT – ENHANCED (£144)
     ========================= */
  {
    id: 'p-maths-enh',
    name: 'GCSE Maths (Enhanced)',
    category: 'Single Subject',
    tier: 'Enhanced',
    subject: 'GCSE Maths',
    price: 144,
    sessions: 4,
    groupSize: '5-8 students',
    stripeLink: 'https://buy.stripe.com/6oUeV5bm30zGgS58jx0Fi03',
    description: 'Premium small-group Maths support with increased tutor interaction.',
    features: ["4 live sessions", "Higher tutor attention", "Immediate feedback", "Targeted technique"]
  },
  {
    id: 'p-eng-lang-enh',
    name: 'GCSE English Language (Enhanced)',
    category: 'Single Subject',
    tier: 'Enhanced',
    subject: 'GCSE English Language',
    price: 144,
    sessions: 4,
    groupSize: '5-8 students',
    stripeLink: 'https://buy.stripe.com/6oUeV5bm30zGgS58jx0Fi03',
    description: 'Smaller group English Language support with deeper feedback.',
    features: ["4 live sessions", "Writing refinement", "Greater interaction", "Exam breakdown"]
  },
  {
    id: 'p-eng-lit-enh',
    name: 'GCSE English Literature (Enhanced)',
    category: 'Single Subject',
    tier: 'Enhanced',
    subject: 'GCSE English Literature',
    price: 144,
    sessions: 4,
    groupSize: '5-8 students',
    stripeLink: 'https://buy.stripe.com/6oUeV5bm30zGgS58jx0Fi03',
    description: 'Structured Literature discussion with closer tutor guidance.',
    features: ["4 live sessions", "Guided analysis", "Essay refinement", "Quotation mastery"]
  },
  {
    id: 'p-sci-enh',
    name: 'GCSE Science (Enhanced)',
    category: 'Single Subject',
    tier: 'Enhanced',
    subject: 'GCSE Science',
    price: 144,
    sessions: 4,
    groupSize: '5-8 students',
    stripeLink: 'https://buy.stripe.com/6oUeV5bm30zGgS58jx0Fi03',
    description: 'Enhanced Science support with personalised clarification.',
    features: ["4 live sessions", "Concept reinforcement", "Increased support", "Calm delivery"]
  },

  /* =========================
     MULTI-SUBJECT PACKAGES
     ========================= */
  {
    id: 'p-ms-2-std',
    name: '2 Subject Bundle (Standard)',
    category: 'Multi Subject',
    tier: 'Standard',
    subjectsAllowed: 2,
    price: 232,
    sessions: 8,
    description: 'GoldMind standard bundle for dual-subject mastery.',
    features: ['8 Total sessions', 'Unified study portal', 'GoldMind Teaching System']
  },
  {
    id: 'p-ms-2-enh',
    name: '2 Subject Bundle (Enhanced)',
    category: 'Multi Subject',
    tier: 'Enhanced',
    subjectsAllowed: 2,
    price: 276,
    sessions: 8,
    description: 'Premium dual-subject support with higher interaction.',
    features: ['8 Total sessions', 'Elite small-group attention', 'Maximum interaction']
  },
  {
    id: 'p-ms-3-std',
    name: '3 Subject Bundle (Standard)',
    category: 'Multi Subject',
    tier: 'Standard',
    subjectsAllowed: 3,
    price: 336,
    sessions: 12,
    description: 'Full coverage for three core subjects.',
    features: ['12 Total sessions', 'Comprehensive curriculum', 'Personalized path']
  },
  {
    id: 'p-ms-3-enh',
    name: '3 Subject Bundle (Enhanced)',
    category: 'Multi Subject',
    tier: 'Enhanced',
    subjectsAllowed: 3,
    price: 396,
    sessions: 12,
    description: 'Enhanced triple-subject support with lower cognitive load.',
    features: ['12 Total sessions', 'Strategic feedback loops', 'Targeted reinforcement']
  },
  {
    id: 'p-ms-4-std',
    name: '4 Subject Bundle (Standard)',
    category: 'Multi Subject',
    tier: 'Standard',
    subjectsAllowed: 4,
    price: 432,
    sessions: 16,
    description: 'Complete academic support across all core subjects.',
    features: ['16 Total sessions', 'Full exam prep mastery', 'Academic planning']
  },
  {
    id: 'p-ms-4-enh',
    name: '4 Subject Bundle (Enhanced)',
    category: 'Multi Subject',
    tier: 'Enhanced',
    subjectsAllowed: 4,
    price: 504,
    sessions: 16,
    description: 'Maximum support academic bundle with minimum group sizes.',
    features: ['16 Total sessions', 'Premium bespoke feel', 'Unrivalled access']
  },

  /* =========================
     CUSTOM PLAN
     ========================= */
  {
    id: 'p-custom-bespoke',
    name: 'Bespoke Academic Plan',
    category: 'Custom Plan',
    price: 'Variable',
    sessions: 'Variable',
    description: 'Bespoke tuition programme tailored to individual academic needs.',
    features: ["Diagnostic assessment", "Personal learning plan", "Flexible structure"]
  }
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const AVAILABLE_SUBJECTS = [
  "GCSE Maths",
  "GCSE English Language",
  "GCSE English Literature",
  "GCSE Science"
];
