import React, { useState } from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    User,
    X,
    FileText,
    CheckCircle,
    ThumbsUp,
    Play,
    Eye,
    RotateCcw
} from 'lucide-react';

// --- Types & Mock Data ---

type Status = 'todo' | 'in-progress' | 'review' | 'done';
type Priority = 'high' | 'medium' | 'low';

interface Task {
    id: string;
    title: string;
    description: string;
    category: string;
    date: string; // ISO date string YYYY-MM-DD
    status: Status;
    priority: Priority;
    members: string[]; // Initials
}

const INITIAL_TASKS: Task[] = [
    { id: '1', title: 'Rediseño de Homepage', description: 'Actualizar hero section y footer con nuevos assets de marca.', category: 'Diseño', date: '2023-10-15', status: 'in-progress', priority: 'high', members: ['AB', 'CD'] },
    { id: '2', title: 'Integración de API de Pagos', description: 'Conectar Stripe y PayPal en el checkout.', category: 'Desarrollo', date: '2023-10-18', status: 'todo', priority: 'high', members: ['JS'] },
    { id: '3', title: 'Análisis de Competencia Q4', description: 'Revisión de pricing de competidores directos.', category: 'Marketing', date: '2023-10-12', status: 'done', priority: 'medium', members: ['MR', 'TJ'] },
    { id: '4', title: 'Actualizar Documentación', description: 'Actualizar readme y wiki interna.', category: 'General', date: '2023-10-20', status: 'todo', priority: 'low', members: ['AB'] },
    { id: '5', title: 'Fix: Login Bug en Safari', description: 'Usuarios reportan loop infinito en iOS 17.', category: 'Desarrollo', date: '2023-10-16', status: 'review', priority: 'high', members: ['JS', 'MR'] },
    { id: '6', title: 'Newsletter de Octubre', description: 'Drafting y diseño de correo mensual.', category: 'Marketing', date: '2023-10-25', status: 'todo', priority: 'medium', members: ['TJ'] },
    { id: '7', title: 'Revisión de Métricas', description: 'Analizar churn rate del mes pasado.', category: 'Data', date: '2023-10-15', status: 'review', priority: 'medium', members: ['CD'] },
    { id: '8', title: 'Entrevista Usuario A', description: 'Validación de prototipo v2.', category: 'Diseño', date: '2023-10-28', status: 'todo', priority: 'medium', members: ['AB'] },
    { id: '9', title: 'Backup DB Semanal', description: 'Ejecutar script de respaldo manual.', category: 'DevOps', date: '2023-10-29', status: 'done', priority: 'high', members: ['JS'] },
    { id: '10', title: 'Planificación Q1', description: 'Reunión estratégica con stakeholders.', category: 'General', date: '2023-11-01', status: 'todo', priority: 'high', members: ['TJ', 'CD'] },
];

const COLUMNS: { id: Status; label: string; color: string; badge: string }[] = [
    { id: 'todo', label: 'Por Hacer', color: 'bg-gray-200', badge: 'bg-gray-100 text-gray-600' },
    { id: 'in-progress', label: 'En Progreso', color: 'bg-primary-500', badge: 'bg-primary-50 text-primary-600' },
    { id: 'review', label: 'En Revisión', color: 'bg-purple-500', badge: 'bg-purple-50 text-purple-600' },
    { id: 'done', label: 'Completado', color: 'bg-chart-green', badge: 'bg-green-50 text-green-700' },
];

const PRIORITY_COLORS: Record<Priority, string> = {
    high: 'text-chart-red bg-chart-red/10 border-chart-red/20',
    medium: 'text-chart-yellow bg-chart-yellow/10 border-chart-yellow/20',
    low: 'text-chart-blue bg-chart-blue/10 border-chart-blue/20',
};

// --- Sub-Components ---

const MemberStack: React.FC<{ members: string[] }> = ({ members }) => (
    <div className="flex -space-x-2">
        {members.map((m, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-600 shadow-sm">
                {m}
            </div>
        ))}
    </div>
);

// --- Modals ---

const TaskDetailModal: React.FC<{
    task: Task;
    onClose: () => void;
    onStatusChange: (id: string, newStatus: Status) => void;
}> = ({ task, onClose, onStatusChange }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${PRIORITY_COLORS[task.priority]}`}>
                                {task.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${COLUMNS.find(c => c.id === task.status)?.badge}`}>
                                {COLUMNS.find(c => c.id === task.status)?.label}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <FileText size={16} /> Descripción
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {task.description}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <Clock size={16} /> Fecha Límite
                            </div>
                            <div className="text-sm text-gray-600">{new Date(task.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <User size={16} /> Asignado a
                            </div>
                            <MemberStack members={task.members} />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 flex-wrap">
                    <button className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors" onClick={onClose}>
                        Cerrar
                    </button>

                    {/* Botones de acción según el estado */}

                    {/* TODO -> EN PROGRESO */}
                    {task.status === 'todo' && (
                        <button
                            onClick={() => { onStatusChange(task.id, 'in-progress'); onClose(); }}
                            className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 transition-all flex items-center gap-2 shadow-lg shadow-primary-200 transform active:scale-95"
                        >
                            <Play size={16} />
                            Comenzar Tarea
                        </button>
                    )}

                    {/* EN PROGRESO -> REVISIÓN */}
                    {task.status === 'in-progress' && (
                        <button
                            onClick={() => { onStatusChange(task.id, 'review'); onClose(); }}
                            className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 transition-all flex items-center gap-2 shadow-lg shadow-purple-200 transform active:scale-95"
                        >
                            <Eye size={16} />
                            Solicitar Revisión
                        </button>
                    )}

                    {/* EN REVISIÓN -> (DEVOLVER A PROGRESO) o (APROBAR) */}
                    {task.status === 'review' && (
                        <>
                            <button
                                onClick={() => { onStatusChange(task.id, 'in-progress'); onClose(); }}
                                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-orange-400 hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-200 transform active:scale-95"
                            >
                                <RotateCcw size={16} />
                                En Progreso
                            </button>
                            <button
                                onClick={() => { onStatusChange(task.id, 'done'); onClose(); }}
                                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-500 hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg shadow-green-200 transform active:scale-95"
                            >
                                <ThumbsUp size={16} />
                                Aprobar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

const DayOverviewModal: React.FC<{
    date: string;
    tasks: Task[];
    onClose: () => void;
    onTaskClick: (t: Task) => void
}> = ({ date, tasks, onClose, onTaskClick }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Tareas del día {date}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {tasks.length > 0 ? (
                        tasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => { onClose(); onTaskClick(task); }}
                                className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer border-b border-gray-50 last:border-0 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>{task.category}</span>
                                    <span className={`text-[10px] font-bold ${COLUMNS.find(c => c.id === task.status)?.color.replace('bg-', 'text-')}`}>
                                        {COLUMNS.find(c => c.id === task.status)?.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800 text-sm">{task.title}</h4>
                                    {task.status === 'review' && (
                                        <div className="text-orange-400" title="Requiere aprobación">
                                            <CheckCircle size={14} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-sm">No hay tareas para este día</div>
                    )}
                </div>
            </div>
        </div>
    )
}

// --- Main Component ---

export const ValidationKanban: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedDay, setSelectedDay] = useState<{ date: string, tasks: Task[] } | null>(null);

    // DnD State
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

    // Logic to Change Task Status (Approve, Move to Progress, Review, etc.)
    const handleStatusChange = (id: string, newStatus: Status) => {
        setTasks(prevTasks => prevTasks.map(t => {
            if (t.id === id) {
                return { ...t, status: newStatus };
            }
            return t;
        }));
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedTaskId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    }

    const handleDragEnd = () => {
        setDraggedTaskId(null);
        setActiveDropZone(null);
    }

    const handleDragOver = (e: React.DragEvent, zoneId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (activeDropZone !== zoneId) {
            setActiveDropZone(zoneId);
        }
    }

    // Handle dropping in Calendar View (updates Date)
    const handleDropToDate = (e: React.DragEvent, dateString: string) => {
        e.preventDefault();
        e.stopPropagation();

        const id = e.dataTransfer.getData('text/plain') || draggedTaskId;

        if (!id) {
            setActiveDropZone(null);
            return;
        }

        setTasks(prevTasks => prevTasks.map(t => {
            if (t.id === id) {
                return { ...t, date: dateString };
            }
            return t;
        }));

        setDraggedTaskId(null);
        setActiveDropZone(null);
    }

    // --- Calendar View Implementation ---

    const CalendarView = () => {
        // Mock Visual Calendar logic
        const days = Array.from({ length: 35 }, (_, i) => i + 1); // 5 weeks

        return (
            <div className="h-full flex flex-col">
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="text-xs font-bold text-gray-400 uppercase py-2">{d}</div>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-2">
                    {days.map((day, idx) => {
                        const displayDay = day > 31 ? day - 31 : day;
                        const isNextMonth = day > 31;

                        // Construct a comparable date string for the mock calendar (Oct 2023)
                        const dateString = `2023-10-${displayDay.toString().padStart(2, '0')}`;

                        // Find tasks for this date
                        const dayTasks = tasks.filter((t) => t.date === dateString && !isNextMonth);

                        const visibleTasks = dayTasks.slice(0, 2);
                        const overflowCount = dayTasks.length - 2;

                        return (
                            <div
                                key={idx}
                                onDragOver={(e) => !isNextMonth && handleDragOver(e, dateString)}
                                onDrop={(e) => !isNextMonth && handleDropToDate(e, dateString)}
                                onClick={() => { if (dayTasks.length > 0) setSelectedDay({ date: `Oct ${displayDay}`, tasks: dayTasks }) }}
                                className={`rounded-xl p-2 border transition-all min-h-[100px] flex flex-col gap-1 cursor-pointer
                                ${isNextMonth ? 'opacity-30 border-transparent bg-gray-50/50' : 'bg-white border-gray-100 hover:border-primary-200'}
                                ${activeDropZone === dateString ? 'bg-primary-50 ring-2 ring-primary-200' : ''}
                            `}
                            >
                                <span className={`text-xs font-bold mb-1 pointer-events-none ${displayDay === 15 ? 'text-primary-500' : 'text-gray-400'}`}>{displayDay}</span>
                                {visibleTasks.map(t => (
                                    <div
                                        key={t.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, t.id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}
                                        className={`text-[9px] px-1.5 py-1 rounded truncate font-medium border-l-2 shadow-sm cursor-grab active:cursor-grabbing hover:opacity-80 select-none flex items-center gap-1
                                      ${COLUMNS.find(c => c.id === t.status)?.badge} border-${COLUMNS.find(c => c.id === t.status)?.color.replace('bg-', '')}
                                      ${draggedTaskId === t.id ? 'opacity-40' : ''}
                                    `}
                                    >
                                        <span className="pointer-events-none truncate">{t.title}</span>
                                        {t.status === 'review' && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                                    </div>
                                ))}
                                {overflowCount > 0 && (
                                    <div className="mt-auto pt-1 pointer-events-none">
                                        <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-full w-full block text-center">
                                            +{overflowCount} más
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="col-span-12 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 min-h-[600px] flex flex-col relative">

            {/* Modals */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
            {selectedDay && (
                <DayOverviewModal
                    date={selectedDay.date}
                    tasks={selectedDay.tasks}
                    onClose={() => setSelectedDay(null)}
                    onTaskClick={setSelectedTask}
                />
            )}

            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 rounded-lg text-primary-500">
                            <CalendarIcon size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Calendario de Entregas</h2>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Sprint 42 • Octubre 2023</p>
                </div>

                {/* Legend for Status */}
                <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-500">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.color}`} />
                            <span>{col.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
                <CalendarView />
            </div>
        </div>
    );
};