// 'use client'
// import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// type RadarData = {
//   subject: string;
//   count: number;
//   amount: number;
//   fullMark: number;
// };

// interface SimpleRadarChartProps {
//   data: RadarData[];
// }

// const SimpleRadarChart = ({ data = [] }: SimpleRadarChartProps) => {
//   // Ensure data is an array and has values
//   const safeData = Array.isArray(data) ? data : [];

//   // If no data, show a message
//   if (safeData.length === 0) {
//     return (
//       <div className="flex items-center justify-center h-full">
//         <p className="text-gray-500">No radar chart data available</p>
//       </div>
//     );
//   }

//   // Find the maximum value for scaling
//   const maxValue = Math.max(...safeData.map(item => item.count || 0), 10);

//   return (
//     <div className="w-full h-[400px]">
//       <ResponsiveContainer width="100%" height="100%">
//         <RadarChart 
//           cx="50%" 
//           cy="50%" 
//           outerRadius="80%" 
//           data={safeData}
//           margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
//         >
//           <PolarGrid stroke="#f0f0f0" />
//           <PolarAngleAxis 
//             dataKey="subject" 
//             tick={{ fill: '#6b7280', fontSize: 12 }}
//           />
//           <PolarRadiusAxis 
//             angle={30} 
//             domain={[0, maxValue]}
//             tick={{ fill: '#6b7280', fontSize: 10 }}
//           />
//           <Radar
//             name="Claims"
//             dataKey="count"
//             stroke="#3b82f6"
//             fill="#3b82f6"
//             fillOpacity={0.3}
//             strokeWidth={2}
//           />
//           <Tooltip 
//             content={({ active, payload }) => {
//               if (active && payload && payload.length) {
//                 return (
//                   <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
//                     <p className="font-semibold">{payload[0].payload.subject}</p>
//                     <p>Claims: {payload[0].value}</p>
//                     <p>Amount: {payload[0].payload.amount.toFixed(2)}</p>
//                   </div>
//                 );
//               }
//               return null;
//             }}
//           />
//           <Legend />
//         </RadarChart>
//       </ResponsiveContainer>
//     </div>
//   );
// };

// export default SimpleRadarChart;

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

const data = [
  {
    name: 'Base',
    faucets: 2400,
    quests: 1900,
    quizzes: 1300,
  },
  {
    name: 'Celo',
    faucets: 3200,
    quests: 2800,
    quizzes: 2100,
  },
  {
    name: 'Lisk',
    faucets: 1600,
    quests: 1300,
    quizzes: 900,
  },
  {
    name: 'Arbitrum',
    faucets: 1800,
    quests: 1500,
    quizzes: 1200,
  },
];

// #region Sample data
// const data = [
//   {
//     subject: 'Math',
//     A: 120,
//     B: 110,
//     fullMark: 150,
//   },
//   {
//     subject: 'Chinese',
//     A: 98,
//     B: 130,
//     fullMark: 150,
//   },
//   {
//     subject: 'English',
//     A: 86,
//     B: 130,
//     fullMark: 150,
//   },
//   {
//     subject: 'Geography',
//     A: 99,
//     B: 100,
//     fullMark: 150,
//   },
//   {
//     subject: 'Physics',
//     A: 85,
//     B: 90,
//     fullMark: 150,
//   },
//   {
//     subject: 'History',
//     A: 65,
//     B: 85,
//     fullMark: 150,
//   },
// ];

// #endregion
const SpecifiedDomainRadarChart = () => {
  return (
    <RadarChart
      style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', aspectRatio: 1 }}
      responsive
      outerRadius="80%"
      data={data}
    >
      <PolarGrid />
      <PolarAngleAxis dataKey="name" />
      <PolarRadiusAxis angle={30} domain={[0, 150]} />
      <Radar name="faucets" dataKey="faucets" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
      <Radar name="quests" dataKey="quests" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
      <Radar name="quizzes" dataKey="quizzes" stroke="#47d9f5" fill="#05baee" fillOpacity={0.6} />
      <Legend />
      <RechartsDevtools />
    </RadarChart>
  );
};

export default SpecifiedDomainRadarChart;