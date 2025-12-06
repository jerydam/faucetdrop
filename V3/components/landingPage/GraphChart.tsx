import React from 'react'
import SimpleRadarChart from './graph/GraphChart1'
import TwoLevelPieChart from './graph/GraphChart2'
import StackedAreaChart from './graph/GraphChart3'

export default function GraphChart() {
  return (
    <div className='grid sm:grid-cols-2 md:grid-cols-4 gap-4 justify-center items-center'>
        <div>
        <SimpleRadarChart />
        </div>

        <div>
        <TwoLevelPieChart isAnimationActive={true} />
        </div>

        <div className='sm:col-span-2 md:col-span-2'>
        <StackedAreaChart />
        </div>
    </div>
  )
}
