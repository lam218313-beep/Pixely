import React from 'react';
import { 
  MoreHorizontal, 
  ChevronRight, 
  Clock, 
  FileText, 
  Camera, 
  PenTool,
  Search,
  Plus
} from 'lucide-react';
import { NewCourse, ScheduleItem, Assignment, ActiveCourse } from '../types';

// --- Header Component ---
export const Header: React.FC = () => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white">
                    Welcome back Taylor <span className="inline-block animate-wave">👋</span>
                </h1>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search courses" 
                        className="w-full bg-card pl-12 pr-4 py-3 rounded-full text-sm outline-none focus:ring-2 focus:ring-pink/50 shadow-sm"
                    />
                </div>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-edge shadow-sm shrink-0">
                    <img src="https://picsum.photos/100/100" alt="Profile" className="w-full h-full object-cover" />
                </div>
            </div>
        </div>
    );
};

// --- New Course Card ---
export const NewCourseCard: React.FC<{ course: NewCourse }> = ({ course }) => {
  return (
    <div className="bg-card p-5 rounded-[24px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[160px]">
      <div className="flex justify-between items-start">
        <div className={`w-10 h-10 rounded-full ${course.iconBg} flex items-center justify-center text-text-2`}>
          <course.icon size={20} />
        </div>
        <button className="text-text-3 hover:text-text-2">
            <MoreHorizontal size={20} />
        </button>
      </div>
      
      <div className="mt-4">
        <h3 className="font-bold text-white text-lg leading-tight mb-1">{course.title}</h3>
        <p className="text-xs text-text-3 mb-4">{course.lessons} Lessons</p>
        
        <div className="flex justify-between items-end border-t border-edge pt-3">
            <div>
                <span className="text-xs text-text-3 block mb-1">Rate</span>
                <div className="flex items-center gap-1 font-bold text-sm">
                    <span className="text-text-2">★</span> {course.rating}
                </div>
            </div>
            <div className="text-right">
                <span className="text-xs text-text-3 block mb-1">Type</span>
                <span className="text-xs font-semibold text-text-2">{course.type}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Daily Schedule Widget ---
export const DailySchedule: React.FC = () => {
    const items: ScheduleItem[] = [
        { id: '1', title: 'Design System', type: 'Lecture - Class', icon: PenTool, color: 'text-pink-text', bg: 'bg-raised' },
        { id: '2', title: 'Typography', type: 'Group - Test', icon: FileText, color: 'text-text-2', bg: 'bg-raised' },
        { id: '3', title: 'Color Style', type: 'Group - Test', icon: Camera, color: 'text-text-2', bg: 'bg-raised' },
        { id: '4', title: 'Visual Design', type: 'Lecture - Test', icon: PenTool, color: 'text-pink-text', bg: 'bg-pink/15' },
    ];

    return (
        <div className="bg-card p-6 rounded-[30px] shadow-sm h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Daily Schedule</h3>
            </div>
            <div className="space-y-4">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                                <item.icon size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-white">{item.title}</h4>
                                <p className="text-xs text-text-3">{item.type}</p>
                            </div>
                        </div>
                        <button className="w-8 h-8 rounded-full border border-edge flex items-center justify-center text-text-3 group-hover:bg-raised">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Premium Banner ---
export const PremiumBanner: React.FC = () => {
    return (
        <div className="bg-raised rounded-[30px] p-6 text-white relative overflow-hidden flex flex-col justify-center min-h-[220px]">
            {/* Background decorations */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-edge rounded-bl-full opacity-50"></div>
            
            <div className="relative z-10 w-2/3">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full border-2 border-edge flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-card rounded-full"></div>
                    </div>
                    <span className="font-bold text-lg">Eduplex</span>
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Go Premium</h2>
                <p className="text-text-3 text-xs mb-6 max-w-[200px]">Explore 25k+ courses with lifetime membership</p>
                
                <button className="bg-pink-fill text-white font-bold py-2.5 px-6 rounded-full text-sm hover:brightness-110 transition-all">
                    Get Access
                </button>
            </div>

            {/* Illustration Mock */}
            <div className="absolute right-4 bottom-4 w-28 h-28">
                 <img src="https://picsum.photos/id/1/200/200" alt="Reading" className="w-full h-full object-cover rounded-full opacity-80 mix-blend-overlay" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">📚</span>
                 </div>
            </div>
        </div>
    );
};

// --- Calendar Widget (Visual Only) ---
export const CalendarWidget: React.FC = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    // Mocking August 2023 grid starting on Tuesday
    const dates = Array.from({length: 31}, (_, i) => i + 1);
    const startOffset = 2; // Tuesday start

    return (
        <div className="bg-card p-6 rounded-[30px] shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <button className="w-8 h-8 flex items-center justify-center text-text-3 hover:bg-raised rounded-full"><ChevronRight className="rotate-180" size={16}/></button>
                <h3 className="font-bold text-white">August, 2023</h3>
                <button className="w-8 h-8 flex items-center justify-center text-text-3 hover:bg-raised rounded-full"><ChevronRight size={16}/></button>
            </div>
            
            <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center mb-2">
                {days.map(d => <span key={d} className="text-xs font-bold text-text-3">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
                {Array(startOffset).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
                {dates.map(date => {
                    const isActive = date === 17;
                    return (
                        <div key={date} className="flex items-center justify-center">
                            <span className={`w-8 h-8 flex items-center justify-center text-xs rounded-full font-medium cursor-pointer transition-colors
                                ${isActive ? 'bg-pink-fill text-white font-bold shadow-md' : 'text-text-2 hover:bg-raised'}
                            `}>
                                {date}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Assignments List ---
export const AssignmentsWidget: React.FC = () => {
    const assignments: Assignment[] = [
        { id: '1', title: 'Methods of data', date: '02 July, 10:30 AM', status: 'In progress', icon: MoreHorizontal, iconBg: 'bg-raised', iconColor: 'text-text-2' },
        { id: '2', title: 'Market Research', date: '14 June, 12:45 AM', status: 'Completed', icon: Clock, iconBg: 'bg-raised', iconColor: 'text-text-2' },
        { id: '3', title: 'Data Collection', date: '12 May, 11:00 AM', status: 'Upcoming', icon: FileText, iconBg: 'bg-raised', iconColor: 'text-pink-text' },
    ];

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'In progress': return 'bg-raised text-text-2';
            case 'Completed': return 'bg-raised text-text-2';
            default: return 'bg-raised text-pink-text';
        }
    };

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white">Assignments</h3>
                <button className="w-8 h-8 rounded-full bg-pink-fill flex items-center justify-center text-white hover:brightness-105">
                    <Plus size={16} />
                </button>
            </div>
            {assignments.map(a => (
                <div key={a.id} className="bg-card p-4 rounded-[20px] shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl ${a.iconBg} ${a.iconColor} flex items-center justify-center`}>
                            {/* Visual placeholder icon logic based on type */}
                            <div className="w-4 h-4 rounded-sm border-2 border-current opacity-60"></div>
                         </div>
                         <div>
                             <h4 className="text-sm font-bold text-white">{a.title}</h4>
                             <p className="text-[10px] text-text-3">{a.date}</p>
                         </div>
                    </div>
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${getStatusStyle(a.status)}`}>
                        {a.status}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- Active Course Card ---
export const ActiveCourseCard: React.FC<{ course: ActiveCourse }> = ({ course }) => {
    return (
        <div className="bg-card p-5 rounded-[24px] shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-raised shrink-0">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                </div>
                <div>
                    <h4 className="font-bold text-white">{course.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-4 rounded-full overflow-hidden">
                            <img src={`https://i.pravatar.cc/150?u=${course.id}`} alt="Instructor" />
                        </div>
                        <p className="text-xs text-text-3">{course.instructor}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8 flex-1 justify-end min-w-[200px]">
                <div className="text-right hidden sm:block">
                    <span className="text-xs text-text-3 block mb-1">Remaining</span>
                    <span className="text-xs font-bold text-text-2">{course.remaining}</span>
                </div>
                
                <div className="flex items-center gap-3">
                     {/* Circular Progress Mock */}
                    <div className="relative w-10 h-10">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="20" cy="20" r="16" stroke="#26262E" strokeWidth="4" fill="none" />
                            <circle cx="20" cy="20" r="16" stroke={course.progress > 50 ? "#E4E4EA" : "#EB0C6E"} strokeWidth="4" fill="none" strokeDasharray="100" strokeDashoffset={100 - course.progress} strokeLinecap="round" />
                        </svg>
                    </div>
                    <span className="text-sm font-bold text-white">{course.progress}%</span>
                </div>
            </div>
        </div>
    );
};