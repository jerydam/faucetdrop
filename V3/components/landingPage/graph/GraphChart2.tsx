// import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// // import { RechartsDevtools } from '@recharts/devtools';

// type AreaData = {
//   date: string;
//   [network: string]: number | string;
// }[];

// const CustomTooltip = ({ active, payload, label }: any) => {
//   if (active && payload && payload.length) {
//     return (
//       <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
//         <p className="font-semibold mb-2">{label}</p>
//         {payload
//           .sort((a: any, b: any) => (b.value as number) - (a.value as number))
//           .map((entry: any, index: number) => (
//             <div key={`tooltip-${index}`} className="flex justify-between">
//               <div className="flex items-center">
//                 <div 
//                   className="w-3 h-3 rounded-full mr-2" 
//                   style={{ backgroundColor: entry.color }}
//                 />
//                 <span className="text-sm">{entry.name}:</span>
//               </div>
//               <span className="font-medium ml-2">{entry.value}</span>
//             </div>
//           ))}
//       </div>
//     );
//   }
//   return null;
// };

// export const StackedAreaChart = ({ data }: { data: AreaData }) => {

//   if (!data || data.length === 0) {
//     return (
//       <div className="h-[400px] flex items-center justify-center text-gray-500">
//         No data available
//       </div>
//     );
//   }

//   // Get all network names from the first data point (excluding 'date')
//   const networkNames = Object.keys(data[0] || {}).filter(key => key !== 'date');

//   // Format date for better readability
//   const formatXAxis = (date: string) => {
//     return new Date(date).toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   // Generate a color palette for networks
//   const getNetworkColor = (index: number) => {
//     const colors = [
//       '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
//       '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
//     ];
//     return colors[index % colors.length];
//   };

//   return (
//     <div className="w-full h-[400px] p-4">

//       {data.length > 0 ? (
//         <ResponsiveContainer width="100%" height="100%">
//           <AreaChart
//             data={data}
//             margin={{
//               top: 10,
//               right: 30,
//               left: 0,
//               bottom: 0,
//             }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//             <XAxis 
//               dataKey="date" 
//               tickFormatter={formatXAxis}
//               tick={{ fontSize: 12 }}
//               tickMargin={10}
//             />
//             <YAxis 
//               tick={{ fontSize: 12 }}
//               tickFormatter={(value) => value.toLocaleString()}
//             />
//             <Tooltip content={<CustomTooltip />} />
//             <Legend 
//               verticalAlign="top"
//               height={36}
//               formatter={(value) => (
//                 <span className="text-sm">{value}</span>
//               )}
//             />
//             {networkNames.map((network, index) => (
//               <Area
//                 key={network}
//                 type="monotone"
//                 dataKey={network}
//                 stackId="1"
//                 stroke={getNetworkColor(index)}
//                 fill={getNetworkColor(index)}
//                 fillOpacity={0.2}
//                 strokeWidth={2}
//                 name={network}
//               />
//             ))}
//           </AreaChart>
//         </ResponsiveContainer>
//       ) : (
//         <div className="h-[400px] flex items-center justify-center text-gray-500">
//           No data available for selected period
//         </div>
//       )}
//     </div>
//   );
// };

// // export default StackedAreaChart;

// export type ClaimData = {
//   name: string,
//   claims: number
// }[]

// export const SimpleAreaChart = ({ClaimData}: {ClaimData: ClaimData[]}) => {
//   return (
//     <AreaChart
//       style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
//       responsive
//       data={ClaimData}
//       margin={{
//         top: 20,
//         right: 0,
//         left: 0,
//         bottom: 0,
//       }}
//     >
//       <CartesianGrid strokeDasharray="3 3" />
//       <XAxis dataKey="name" />
//       <YAxis width="auto" />
//       <Tooltip />
//       <Area type="monotone" dataKey="claims" stroke="#8884d8" fill="#8884d8" />
//       {/* <RechartsDevtools /> */}
//     </AreaChart>
//   );
// };

// // export default SimpleAreaChart;


import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

// #region Sample data
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
  }
];

// #endregion
const StackedAreaChart = () => {
  return (
    <AreaChart
      style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 20,
        right: 0,
        left: 0,
        bottom: 0,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis width="auto" />
      <Tooltip />
      <Area type="monotone" dataKey="faucets" stackId="2" stroke="#0298d8" fill="#017dc5" />
      <Area type="monotone" dataKey="quests" stackId="2" stroke="#0052ff" fill="#2563eb" />
      <Area type="monotone" dataKey="quizzes" stackId="2" stroke="#47d9f5" fill="#05baee" />
      <RechartsDevtools />
    </AreaChart>
  );
};

export default StackedAreaChart;
