// pages/api/cache/[key].ts or app/api/cache/[key]/route.ts (Next.js 13+)
import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseCache } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    const data = await DatabaseCache.get(key);
    
    if (!data) {
      return Response.json({ error: 'Cache miss' }, { status: 404 });
    }
    
    return Response.json({ data, cached: true });
  } catch (error) {
    console.error('Cache GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    const { data, expiresInMs } = await request.json();
    
    const success = await DatabaseCache.set(key, data, expiresInMs);
    
    if (!success) {
      return Response.json({ error: 'Failed to cache data' }, { status: 500 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Cache POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    const success = await DatabaseCache.delete(key);
    
    return Response.json({ success });
  } catch (error) {
    console.error('Cache DELETE error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// pages/api/analytics/dashboard.ts
import { DatabaseCache, AnalyticsDB } from '@/lib/database';
import { getAllClaimsForAllNetworks } from '@/lib/faucet';
import { getNetworksConfig } from '@/lib/networks';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'dashboard_data';

export async function GET() {
  try {
    // Try to get cached data first
    const cachedData = await DatabaseCache.get(CACHE_KEY);
    
    if (cachedData) {
      // Return cached data immediately
      return Response.json({
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // If no cached data, get latest analytics snapshot
    const snapshot = await AnalyticsDB.getLatestAnalyticsSnapshot();
    
    if (snapshot) {
      return Response.json({
        data: snapshot,
        cached: true,
        timestamp: snapshot.createdAt
      });
    }
    
    // If no snapshot, return empty data
    return Response.json({
      data: {
        totalClaims: 0,
        uniqueUsers: 0,
        totalFaucets: 0,
        totalTransactions: 0,
        monthlyChange: {
          claims: "+0.0%",
          users: "+0.0%",
          faucets: "+0.0%",
          transactions: "+0.0%"
        }
      },
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    return Response.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

// Trigger background refresh
export async function POST() {
  try {
    // Don't wait for the refresh, return immediately
    refreshDashboardData();
    
    return Response.json({ message: 'Background refresh initiated' });
  } catch (error) {
    console.error('Dashboard refresh error:', error);
    return Response.json({ error: 'Failed to initiate refresh' }, { status: 500 });
  }
}

// Background refresh function
async function refreshDashboardData() {
  const jobId = await BackgroundJobs.createJob('dashboard_refresh');
  
  if (!jobId) {
    console.error('Failed to create background job');
    return;
  }
  
  try {
    await BackgroundJobs.updateJob(jobId, 'running');
    
    const networks = await getNetworksConfig();
    
    // Fetch fresh data
    console.log("Background: Fetching fresh analytics data...");
    
    // Fetch all data types
    const [storageClaims, factoryClaims, faucetsData] = await Promise.all([
      getAllClaimsForAllNetworks(networks),
      getAllClaimsFromAllFactories(networks),
      getAllFaucetsFromNetworks(networks)
    ]);
    
    // Process and combine data
    const allClaimsUnified = [
      ...storageClaims.map(claim => ({ ...claim, source: 'storage' })),
      ...factoryClaims.map(claim => ({ 
        claimer: claim.initiator,
        faucet: claim.faucetAddress,
        amount: claim.amount,
        networkName: claim.networkName,
        chainId: claim.chainId,
        timestamp: claim.timestamp,
        source: 'factory'
      }))
    ];
    
    const uniqueUsers = new Set(
      allClaimsUnified
        .filter(claim => claim.claimer?.startsWith?.('0x'))
        .map(claim => claim.claimer.toLowerCase())
    );
    
    const dashboardData = {
      totalClaims: allClaimsUnified.length,
      uniqueUsers: uniqueUsers.size,
      totalFaucets: faucetsData.length,
      totalTransactions: factoryClaims.length,
      monthlyChange: calculateMonthlyChanges(allClaimsUnified),
      lastUpdated: new Date().toISOString()
    };
    
    // Save to cache and database
    await Promise.all([
      DatabaseCache.set(CACHE_KEY, dashboardData, CACHE_DURATION),
      AnalyticsDB.saveAnalyticsSnapshot(dashboardData),
      AnalyticsDB.saveClaims(allClaimsUnified),
      AnalyticsDB.saveFaucets(faucetsData)
    ]);
    
    await BackgroundJobs.updateJob(jobId, 'completed');
    console.log("Background: Dashboard data refreshed successfully");
    
  } catch (error) {
    console.error("Background: Dashboard refresh failed:", error);
    await BackgroundJobs.updateJob(jobId, 'failed', error.message);
  }
}

// pages/api/analytics/claims.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') === 'true';
  
  const CACHE_KEY = 'user_claims_data';
  
  try {
    if (!refresh) {
      const cachedData = await DatabaseCache.get(CACHE_KEY);
      if (cachedData) {
        return Response.json({ data: cachedData, cached: true });
      }
    }
    
    // Trigger background refresh if needed
    if (!await DatabaseCache.isValid(CACHE_KEY)) {
      refreshClaimsData();
    }
    
    // Return cached data even if stale, new data will be available on next request
    const staleData = await DatabaseCache.get(CACHE_KEY);
    return Response.json({ 
      data: staleData || { claims: [], totalClaims: 0, faucetRankings: [] }, 
      cached: true,
      stale: true
    });
    
  } catch (error) {
    console.error('Claims API error:', error);
    return Response.json({ error: 'Failed to fetch claims data' }, { status: 500 });
  }
}

async function refreshClaimsData() {
  const jobId = await BackgroundJobs.createJob('claims_refresh');
  
  try {
    await BackgroundJobs.updateJob(jobId, 'running');
    
    // Fetch fresh claims data
    const networks = await getNetworksConfig();
    const allClaims = await getAllClaimsFromAllNetworks(networks);
    
    // Process claims data
    const claimsData = {
      claims: allClaims,
      totalClaims: allClaims.length,
      faucetRankings: processClaimsToRankings(allClaims),
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the data
    await DatabaseCache.set('user_claims_data', claimsData, CACHE_DURATION);
    await AnalyticsDB.saveClaims(allClaims);
    
    await BackgroundJobs.updateJob(jobId, 'completed');
    console.log("Background: Claims data refreshed successfully");
    
  } catch (error) {
    console.error("Background: Claims refresh failed:", error);
    await BackgroundJobs.updateJob(jobId, 'failed', error.message);
  }
}

// pages/api/background/refresh.ts - Manual trigger for background refresh
export async function POST(request: Request) {
  try {
    const { dataType } = await request.json();
    
    switch (dataType) {
      case 'dashboard':
        refreshDashboardData();
        break;
      case 'claims':
        refreshClaimsData();
        break;
      case 'all':
        refreshDashboardData();
        refreshClaimsData();
        break;
      default:
        return Response.json({ error: 'Invalid data type' }, { status: 400 });
    }
    
    return Response.json({ message: `Background refresh initiated for ${dataType}` });
  } catch (error) {
    console.error('Manual refresh error:', error);
    return Response.json({ error: 'Failed to initiate refresh' }, { status: 500 });
  }
}