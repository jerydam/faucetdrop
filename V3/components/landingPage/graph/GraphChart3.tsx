'use client'
import { useState, useMemo, useCallback} from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type AreaData = {
  date: string;
  [network: string]: number | string;
}[];

const StackedAreaChart = ({ data }: { data: AreaData }) => {
  const [selectedMonths, setSelectedMonths] = useState<number>(2); // Default to last 2 months

  // const filteredData = useMemo(() => {
  //   if (!data || data.length === 0) return [];
  //   const currentDate = new Date();
  //   const filtered = data.filter(item => {
  //     const itemDate = new Date(item.date);
  //     return itemDate >= new Date(currentDate.setMonth(currentDate.getMonth() - selectedMonths));
  //   });
  //   return filtered;
  // }, [data, selectedMonths]);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (selectedMonths === 0) return data; // Show all data
    
    const currentDate = new Date();
    const monthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - selectedMonths, currentDate.getDate());
    
    const filtered = data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= monthsAgo;
    });
    return filtered;
  }, [data, selectedMonths]);

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  // Get all network names from the first data point (excluding 'date')
  const networkNames = Object.keys(data[0] || {}).filter(key => key !== 'date');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload
            .sort((a: any, b: any) => (b.value as number) - (a.value as number))
            .map((entry: any, index: number) => (
              <div key={`tooltip-${index}`} className="flex justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}:</span>
                </div>
                <span className="font-medium ml-2">{entry.value}</span>
              </div>
            ))}
        </div>
      );
    }
    return null;
  };

  // Format date for better readability
  const formatXAxis = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate a color palette for networks
  const getNetworkColor = (index: number) => {
    const colors = [
      '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="w-full h-[400px] p-4">
      {/* <h3 className="text-center text-white text-2xl font-semibold mb-4">Daily Claim Trends by Network</h3> */}
      <div className="flex items-center space-x-2">
          <label htmlFor="monthFilter" className="text-sm text-gray-600">
            Show last:
          </label>
          <select
            id="monthFilter"
            value={selectedMonths}
            onChange={(e) => setSelectedMonths(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={1}>1 Month</option>
            <option value={2}>2 Months</option>
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
            <option value={0}>All Time</option>
          </select>
        </div>

        {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom:   0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span className="text-sm">{value}</span>
            )}
          />
          {networkNames.map((network, index) => (
            <Area
              key={network}
              type="monotone"
              dataKey={network}
              stackId="1"
              stroke={getNetworkColor(index)}
              fill={getNetworkColor(index)}
              fillOpacity={0.2}
              strokeWidth={2}
              name={network}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      ) : (
        <div className="h-[400px] flex items-center justify-center text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
};

export default StackedAreaChart;