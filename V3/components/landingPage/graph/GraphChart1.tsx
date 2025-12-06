'use client'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

type RadarData = {
  subject: string;
  count: number;
  amount: number;
  fullMark: number;
};

interface SimpleRadarChartProps {
  data: RadarData[];
}

// const SimpleRadarChart = ({ data = [] }: SimpleRadarChartProps) => {
//   const safeData = Array.isArray(data) ? data : [];

//   // Transform data to match Recharts radar chart expected format
//   const chartData = safeData.map(item => ({
//     ...item,
//     // Use count as the main metric for the radar chart
//     metric: item.count,
//     // Format amount for display
//     formattedAmount: (item.amount).toLocaleString(undefined, {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2
//     })
//   }));

// In GraphChart1.tsx
const SimpleRadarChart = ({ data = [] }: SimpleRadarChartProps) => {
  // Ensure data is an array
  const safeData = Array.isArray(data) ? data : [];
  
  // Transform data to match Recharts radar chart expected format
  const chartData = safeData.map(item => ({
    subject: item.subject || 'Unknown',
    count: typeof item.count === 'number' ? item.count : 0,
    amount: typeof item.amount === 'number' ? item.amount : 0,
    fullMark: typeof item.fullMark === 'number' ? item.fullMark : 100
  }));

  // Fallback to empty data if no data is available
  const displayData = chartData.length > 0 ? chartData : [
    { subject: 'No Data', metric: 0, fullMark: 100, formattedAmount: '0' }
  ];

  // Custom tooltip formatter
  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{data.subject}</p>
          <p className="text-sm">Claims: <span className="font-medium">{data.count}</span></p>
          <p className="text-sm">Total Amount: <span className="font-medium">{data.formattedAmount}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="80%"
          data={displayData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <PolarGrid stroke="#f0f0f0" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 'dataMax + 20']} 
            tick={{ fontSize: 10 }}
          />
          <Radar
            name="Network Performance"
            dataKey="metric"
            stroke="#4f46e5"
            fill="#6366f1"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Tooltip 
            content={renderTooltip}
            cursor={{ stroke: '#4f46e5', strokeWidth: 1 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleRadarChart;