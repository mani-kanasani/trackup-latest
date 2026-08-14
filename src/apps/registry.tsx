import { Send, Linkedin, Mail, type LucideIcon } from 'lucide-react';

export type AppId = 'trackup' | 'linkedin' | 'coldemail';

export interface AppDef {
  id: AppId;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** tailwind color prefix for this app's accent (e.g. `upwork`, `linkedin`) */
  accent: string;
  /** tailwind gradient classes for the card icon */
  gradient: string;
  statLabel: string;
  available: boolean;
}

export const APPS: AppDef[] = [
  {
    id: 'trackup',
    name: 'TrackUp',
    tagline: 'Upwork proposals',
    description:
      'Generate tailored Upwork proposals — cover letter, workflow diagram, shareable PDF and Loom script — then track every application to won or lost.',
    icon: Send,
    accent: 'upwork',
    gradient: 'from-upwork-500 to-upwork-600',
    statLabel: 'proposals',
    available: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn DM Generator',
    tagline: 'Connection requests & DM sequences',
    description:
      'Turn your lead list into personalized LinkedIn connection requests and multi-step DM sequences, then track replies and booked meetings.',
    icon: Linkedin,
    accent: 'linkedin',
    gradient: 'from-linkedin-500 to-linkedin-700',
    statLabel: 'leads',
    available: true,
  },
  {
    id: 'coldemail',
    name: 'Cold Email',
    tagline: 'Multi-touch email sequences',
    description:
      'Write a full cold email sequence per prospect, graded against the method, with the observation line the whole campaign turns on. Tracks replies, opt-outs and what closed.',
    icon: Mail,
    accent: 'ember',
    gradient: 'from-ember-500 to-ember-700',
    statLabel: 'prospects',
    available: true,
  },
];

export const getApp = (id: AppId): AppDef => APPS.find((a) => a.id === id)!;
