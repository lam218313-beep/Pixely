import type { ElementType } from 'react';

export interface NavItem {
  icon: ElementType;
  label: string;
  active?: boolean;
  badge?: number;
}

export interface NewCourse {
  icon: ElementType;
  iconBg: string;
  title: string;
  lessons: number | string;
  rating: number;
  type: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  type: string;
  icon: ElementType;
  color: string;
  bg: string;
}

export interface Assignment {
  id: string;
  title: string;
  date: string;
  status: string;
  icon: ElementType;
  iconBg: string;
  iconColor: string;
}

export interface ActiveCourse {
  id: string | number;
  title: string;
  thumbnail: string;
  instructor: string;
  remaining: string;
  progress: number;
}
