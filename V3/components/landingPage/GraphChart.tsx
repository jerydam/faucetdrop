"use client"
import React, { useEffect, useState } from 'react'
import SimpleRadarChart from './graph/GraphChart1'
// import TwoLevelPieChart from './graph/GraphChart2'
import StackedAreaChart from './graph/GraphChart3'
import { AnalyticsService } from '@/services/analyticsService'
import AnimateOnScroll from '../common/AnimateOnScroll';

type ChartData = {
  radarData: any[];
  pieData: {
    networkData: any[];
    timeData: any[];
  };
  areaData: any[];
};

export default function GraphChart() {
  const [chartData, setChartData] = useState<ChartData>({
    radarData: [],
    pieData: { networkData: [], timeData: [] },
    areaData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await AnalyticsService.getDashboardData();
        setChartData({
          radarData: data.radarData || [],
          pieData: data.pieData || { networkData: [], timeData: [] },
          areaData: data.areaData || [],
        });
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-8 w-full grid grid-cols-1 lg:grid-cols-3">
      {/* Area Chart - Daily Trends */}
      {chartData.areaData.length > 0 && (
        <AnimateOnScroll type="fadeIn" delay={100} className="col-span-1 lg:col-span-2">
          <div className="rounded-xl p-6 shadow-lg border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Daily Claim Trends by Network</h3>
            <div className="h-[500px] w-full">
              <StackedAreaChart data={chartData.areaData} />
            </div>
          </div>
        </AnimateOnScroll>
      )}

      {/* Radar Chart - Network Performance */}
      <AnimateOnScroll type="slideLeft" delay={200} className="col-span-1 lg:col-span-1">
        <div className="rounded-xl p-6 shadow-lg border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Network Performance</h3>
          <div className="h-[500px] w-full">
            <SimpleRadarChart data={chartData.radarData} />
          </div>
        </div>
      </AnimateOnScroll>
    </div>
  );
}
