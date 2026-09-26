import { LucideIcon } from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
}

export interface NewCourse {
  id: string;
  title: string;
  lessons: number;
  rating: number;
  type: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  type: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export interface Assignment {
  id: string;
  title: string;
  date: string;
  status: 'In progress' | 'Completed' | 'Upcoming';
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export interface ActiveCourse {
  id: string;
  title: string;
  instructor: string;
  thumbnail: string; // Using a color or emoji for this demo
  remaining: string;
  progress: number;
}