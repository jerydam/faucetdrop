"use client"
import React, { useEffect, useState } from 'react'
// import SimpleRadarChart from './graph/GraphChart1'
// import TwoLevelPieChart from './graph/GraphChart2'
import StackedAreaChart from './graph/GraphChart3'
import { AnalyticsService } from '@/services/analyticsService'

export default function GraphChart() {
  const [chartData, setChartData] = useState({
    radarData: [],
    pieData: { networkData: [], timeData: [] },
    areaData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await AnalyticsService.getDashboardData();
        // setChartData({
        //   radarData: data.radarData || [],
        //   pieData: data.pieData || { networkData: [], timeData: [] },
        //   areaData: data.areaData || []
        // });
        setChartData({
          radarData: Array.isArray(data?.radarData) ? data.radarData : [],
          pieData: {
            networkData: Array.isArray(data?.pieData?.networkData) ? data.pieData.networkData : [],
            timeData: Array.isArray(data?.pieData?.timeData) ? data.pieData.timeData : []
          },
          areaData: Array.isArray(data?.areaData) ? data.areaData : []
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        setError('Failed to load chart data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Area Chart - Daily Trends */}
      {chartData.areaData.length > 0 && (
        <div className="rounded-lg shadow p-4">
      <h3 className="text-center text-white text-2xl font-semibold mb-4">Daily Claim Trends by Network</h3>
      <StackedAreaChart data={chartData.areaData} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart - Network Performance */}
        {/* <div className="rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Network Performance</h2>
          <SimpleRadarChart data={chartData.radarData} />
        </div> */}

        {/* Pie Charts - Distribution */}
        {/* <div className="rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Claim Distribution</h2>
          <TwoLevelPieChart 
            isAnimationActive={true} 
            networkData={chartData.pieData.networkData}
            timeData={chartData.pieData.timeData}
          />
        </div> */}
      </div>
    </div>
  );
}
