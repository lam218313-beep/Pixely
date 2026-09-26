import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'Su', hours: 2.5 },
  { name: 'Mo', hours: 4.5 },
  { name: 'Tu', hours: 3.0 },
  { name: 'We', hours: 6.8 }, // Active/High point
  { name: 'Th', hours: 4.0 },
  { name: 'Fr', hours: 2.0 },
  { name: 'Sa', hours: 5.2 },
];

export const ActivityChart: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-[30px] h-full shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="text-lg font-bold text-gray-800">Hours Activity</h3>
            <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                </span>
                <p className="text-sm text-gray-500"><span className="text-green-600 font-semibold">+3%</span> Increase than last week</p>
            </div>
        </div>
        <select className="bg-transparent text-sm text-gray-500 font-medium outline-none cursor-pointer">
            <option>Weekly</option>
            <option>Monthly</option>
        </select>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={8}>
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                dy={10}
            />
            <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                    return (
                        <div className="bg-edu-dark text-white text-xs py-1 px-3 rounded-lg shadow-xl">
                        {`${payload[0].value}h 45min`}
                        </div>
                    );
                    }
                    return null;
                }}
            />
            <Bar dataKey="hours" radius={[10, 10, 10, 10]}>
              {data.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === 'We' ? '#d9f27e' : '#1f2937'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};