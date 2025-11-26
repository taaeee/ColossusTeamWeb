import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { EngagementData } from '../types';

interface EngagementChartProps {
  data: EngagementData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-white/20 p-4 backdrop-blur-md shadow-2xl">
        <p className="text-white text-xs font-thin mb-2">{label}</p>
        <p className="text-white text-sm font-medium">
          <span className="text-zinc-400">Views:</span> {payload[0].value.toLocaleString()}
        </p>
        <p className="text-white text-sm font-medium">
          <span className="text-zinc-400">Interactions:</span> {payload[1].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export const EngagementChart: React.FC<EngagementChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#52525b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#52525b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#52525b" 
            tick={{ fill: '#52525b', fontSize: 10, fontWeight: 200 }} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#52525b" 
            tick={{ fill: '#52525b', fontSize: 10, fontWeight: 200 }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff', strokeWidth: 0.5, strokeDasharray: '5 5' }} />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#ffffff"
            strokeWidth={1}
            fillOpacity={1}
            fill="url(#colorViews)"
          />
          <Area
            type="monotone"
            dataKey="interactions"
            stroke="#52525b"
            strokeWidth={1}
            fillOpacity={1}
            fill="url(#colorInt)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
