import { BrowserProvider } from 'ethers';
import { appendDivviReferralData, reportTransactionToDivvi } from './divvi-integration';

const API_URL = "https://fauctdrop-backend-1.onrender.com";
const ENABLE_DIVVI_REFERRAL = true;
const DEBUG_MODE = process.env.NODE_ENV === 'development';

interface ClaimPayload {
  userAddress: string;
  faucetAddress: string;
  shouldWhitelist: boolean;
  chainId: number;
  secretCode: string;
  divviReferralData?: string;
}

interface DivviIntegrationResult {
  isApplicable: boolean;
  isWorking: boolean;
  data?: string;
  error?: string;
  debugInfo?: any;
}

interface RequestLogData {
  userAddress: string;
  faucetAddress: string;
  chainId: number;
  hasDivviData: boolean;
  divviDataLength: number;
  timestamp: string;
  payload?: string;
  divviDebugInfo?: any;
}

interface DebugInfo {
  chainId: number;
  isCeloNetwork: boolean;
  enabled: boolean;
  timestamp: string;
  reason?: string;
  rawData?: {
    value: string;
    type: string;
    length: number;
    isEmpty: boolean;
  };
  validation?: {
    isValid: boolean;
    fixed: string;
    error?: string;
  };
  processedData?: string;
  errorType?: string;
  errorMessage?: string;
}

function isCeloNetwork(chainId: number): boolean {
  return chainId === 42220;
}

function debugLog(message: string, data?: any) {
  if (DEBUG_MODE) {
    console.log(`🔍 [Divvi Debug] ${message}`, data ? data : '');
  }
}

function errorLog(message: string, error?: any) {
  console.error(`❌ [Divvi Error] ${message}`, error ? error : '');
}

function successLog(message: string, data?: any) {
  console.log(`✅ [Divvi Success] ${message}`, data ? data : '');
}

function validateAndFixHexData(data: string): { isValid: boolean; fixed: string; error?: string } {
  if (!data || typeof data !== 'string') {
    return { isValid: false, fixed: '', error: 'Data is empty or not a string' };
  }

  const trimmed = data.trim();
  if (trimmed === '') {
    return { isValid: false, fixed: '', error: 'Data is empty after trimming' };
  }

  const hexPattern = /^(0x)?[0-9a-fA-F]+$/;
  if (!hexPattern.test(trimmed)) {
    return { isValid: false, fixed: '', error: 'Data contains non-hex characters' };
  }

  const fixed = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  
  const hexPart = fixed.slice(2);
  if (hexPart.length % 2 !== 0) {
    return { isValid: false, fixed: '', error: 'Hex data has odd length (incomplete bytes)' };
  }

  return { isValid: true, fixed };
}

async function processDivviReferralData(chainId: number): Promise<{
  data?: string;
  error?: string;
  debugInfo: DebugInfo;
}> {
  const debugInfo: DebugInfo = {
    chainId,
    isCeloNetwork: isCeloNetwork(chainId),
    enabled: ENABLE_DIVVI_REFERRAL,
    timestamp: new Date().toISOString()
  };

  if (!ENABLE_DIVVI_REFERRAL) {
    debugLog('Divvi referral is disabled');
    return { debugInfo: { ...debugInfo, reason: 'disabled' } };
  }

  if (!isCeloNetwork(chainId)) {
    debugLog(`Not a Celo network (chainId: ${chainId})`);
    return { debugInfo: { ...debugInfo, reason: 'not_celo_network' } };
  }

  try {
    debugLog('Attempting to get Divvi referral data...');
    
    const rawData = appendDivviReferralData('');
    
    debugInfo.rawData = {
      value: rawData,
      type: typeof rawData,
      length: rawData?.length || 0,
      isEmpty: !rawData || rawData.trim() === ''
    };

    debugLog('Raw Divvi data received:', debugInfo.rawData);

    if (!rawData || rawData.trim() === '') {
      const error = 'appendDivviReferralData returned empty or null data';
      debugLog(error);
      return { error, debugInfo: { ...debugInfo, reason: 'empty_data' } };
    }

    const validation = validateAndFixHexData(rawData);
    debugInfo.validation = validation;

    if (!validation.isValid) {
      const error = `Invalid hex data: ${validation.error}`;
      errorLog(error, { rawData, validation });
      return { error, debugInfo: { ...debugInfo, reason: 'invalid_hex' } };
    }

    successLog('Successfully processed Divvi referral data', {
      original: rawData,
      fixed: validation.fixed,
      length: validation.fixed.length
    });

    return {
      data: validation.fixed,
      debugInfo: { ...debugInfo, reason: 'success', processedData: validation.fixed }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errorLog('Failed to process Divvi referral data', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    return {
      error: errorMessage,
      debugInfo: {
        ...debugInfo,
        reason: 'exception',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage
      }
    };
  }
}

async function reportToDivvi(txHash: string, chainId: number): Promise<void> {
  if (!ENABLE_DIVVI_REFERRAL || !isCeloNetwork(chainId)) {
    debugLog('Skipping Divvi reporting (not applicable)');
    return;
  }

  try {
    debugLog(`Reporting transaction to Divvi: ${txHash} on chain ${chainId}`);
    await reportTransactionToDivvi(txHash as `0x${string}`, chainId);
    successLog('Transaction reported to Divvi successfully');
  } catch (error) {
    errorLog('Failed to report transaction to Divvi', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error(`
🚫 CORS Error Detected - Transaction reporting to Divvi failed
📋 Error Details:
   - This is a Cross-Origin Resource Sharing (CORS) issue
   - The Divvi API doesn't allow requests from your current domain
   - Your main transaction was still successful!

💡 Recommended Solutions:
   1. Move Divvi reporting to your backend server (recommended)
   2. Contact Divvi support to allowlist your domain
   3. Use a proxy server for development
   4. Skip Divvi reporting in development mode

🔧 Quick Fix for Development:
   Set ENABLE_DIVVI_REFERRAL=false or add domain check
      `);
    } else if (error instanceof Error) {
      if (error.message.includes('400')) {
        errorLog('Bad Request - Check transaction hash and chainId format');
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorLog('Authentication/Authorization error - Check API keys or permissions');
      } else if (error.message.includes('404')) {
        errorLog('Divvi API endpoint not found - Check API URL');
      } else if (error.message.includes('429')) {
        errorLog('Rate limit exceeded - Too many requests to Divvi API');
      } else {
        errorLog('Unknown error occurred', {
          message: error.message,
          name: error.name,
          stack: DEBUG_MODE ? error.stack : undefined
        });
      }
    }
  }
}

export async function claimViaBackend(
  userAddress: string,
  faucetAddress: string,
  provider: BrowserProvider,
  secretCode: string
): Promise<{ success: boolean; txHash: string; whitelistTx?: string; divviDebug?: any }> {
  try {
    // Log input secretCode for debugging
    debugLog('Input to claimViaBackend', {
      userAddress,
      faucetAddress,
      secretCode,
      secretCodeDetails: {
        value: secretCode,
        isEmpty: !secretCode,
        length: secretCode?.length || 0,
        matchesPattern: secretCode ? /^[A-Z0-9]{6}$/.test(secretCode) : false
      }
    });

    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error("Wallet not detected. Please install MetaMask or another Ethereum wallet in a supported browser.");
    }

    if (!provider) {
      throw new Error("Provider not initialized. Please ensure your wallet is connected.");
    }

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    const validChainIds = [1135, 42220, 42161];
    if (!validChainIds.includes(chainId)) {
      throw new Error(`Unsupported chainId: ${chainId}. Please switch to Lisk, Celo, or Arbitrum.`);
    }

    debugLog(`Starting claim process for chainId: ${chainId}`);

    // Validate secretCode
    if (!secretCode || !/^[A-Z0-9]{6}$/.test(secretCode)) {
      const errorMessage = `Invalid secret code: ${secretCode || 'empty'}. Must be a 6-character alphanumeric code.`;
      errorLog(errorMessage);
      throw new Error(errorMessage);
    }

    let payload: ClaimPayload = {
      userAddress,
      faucetAddress,
      shouldWhitelist: true,
      chainId,
      secretCode
    };

    const divviResult = await processDivviReferralData(chainId);
    
    if (divviResult.data) {
      payload.divviReferralData = divviResult.data;
      successLog('Added Divvi referral data to payload', { 
        length: divviResult.data.length,
        preview: `${divviResult.data.slice(0, 20)}...`
      });
    } else if (divviResult.error) {
      debugLog(`Proceeding without Divvi data: ${divviResult.error}`);
    }

    const requestLog: RequestLogData = {
      userAddress,
      faucetAddress,
      chainId,
      hasDivviData: !!payload.divviReferralData,
      divviDataLength: payload.divviReferralData?.length || 0,
      timestamp: new Date().toISOString()
    };

    if (DEBUG_MODE) {
      requestLog.payload = JSON.stringify(payload, null, 2);
      requestLog.divviDebugInfo = divviResult.debugInfo;
    }

    debugLog('Sending claim request', requestLog);

    const response = await fetch(`${API_URL}/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { 
          detail: `Failed to parse backend response. Status: ${response.status} ${response.statusText}` 
        };
      }
      
      errorLog('Backend request failed', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      throw new Error(
        errorData.detail ||
        errorData.message ||
        `Backend request failed (${response.status}): ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    successLog('Claim request successful', { 
      success: result.success, 
      txHash: result.txHash 
    });

    if (result.success && result.txHash) {
      setTimeout(() => {
        reportToDivvi(result.txHash, chainId);
      }, 100);
    }

    if (DEBUG_MODE) {
      result.divviDebug = divviResult.debugInfo;
    }

    return result;
  } catch (error) {
    errorLog('Error in claimViaBackend', error);
    throw error;
  }
}

export async function testDivviIntegration(chainId?: number): Promise<DivviIntegrationResult> {
  const testChainId = chainId || 42220;
  
  debugLog(`Testing Divvi integration for chainId: ${testChainId}`);
  
  const result = await processDivviReferralData(testChainId);
  
  return {
    isApplicable: isCeloNetwork(testChainId),
    isWorking: !!result.data && !result.error,
    data: result.data,
    error: result.error,
    debugInfo: result.debugInfo
  };
}

export function debugReferralParams(): {
  url: string;
  params: Record<string, string>;
  referralParams: Record<string, string>;
  recommendations: string[];
} {
  if (typeof window === 'undefined') {
    return {
      url: 'Not in browser environment',
      params: {},
      referralParams: {},
      recommendations: ['Run this function in a browser environment']
    };
  }

  const url = new URL(window.location.href);
  const params = Object.fromEntries(url.searchParams.entries());
  
  const commonReferralParams = ['ref', 'referral', 'r', 'divvi', 'affiliate', 'partner', 'code'];
  const referralParams = Object.fromEntries(
    commonReferralParams
      .filter(param => url.searchParams.has(param))
      .map(param => [param, url.searchParams.get(param) || ''])
  );

  const recommendations = [];
  
  if (Object.keys(referralParams).length === 0) {
    recommendations.push('No referral parameters found in URL');
    recommendations.push('Try adding ?ref=YOUR_CODE or ?divvi=YOUR_CODE to the URL');
  } else {
    recommendations.push('Referral parameters found - check if appendDivviReferralData() uses them correctly');
  }

  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    recommendations.push('Consider using HTTPS for production');
  }

  const result = {
    url: window.location.href,
    params,
    referralParams,
    recommendations
  };

  debugLog('URL Analysis:', result);
  
  return result;
}

export async function checkDivviHealth(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{ name: string; passed: boolean; message: string }>;
  summary: string;
}> {
  const checks = [];
  
  checks.push({
    name: 'Browser Environment',
    passed: typeof window !== 'undefined',
    message: typeof window !== 'undefined' ? 'Running in browser' : 'Not in browser environment'
  });

  let divviFunctionAvailable = false;
  try {
    divviFunctionAvailable = typeof appendDivviReferralData === 'function';
  } catch (e) {
    // Function not available
  }
  
  checks.push({
    name: 'Divvi Function',
    passed: divviFunctionAvailable,
    message: divviFunctionAvailable ? 'appendDivviReferralData function is available' : 'appendDivviReferralData function not found'
  });

  const urlCheck = debugReferralParams();
  const hasReferralParams = Object.keys(urlCheck.referralParams).length > 0;
  
  checks.push({
    name: 'Referral Parameters',
    passed: hasReferralParams,
    message: hasReferralParams ? `Found: ${Object.keys(urlCheck.referralParams).join(', ')}` : 'No referral parameters in URL'
  });

  let testResult = null;
  if (divviFunctionAvailable) {
    testResult = await testDivviIntegration(42220);
    checks.push({
      name: 'Data Generation',
      passed: testResult.isWorking,
      message: testResult.isWorking ? 'Successfully generated referral data' : (testResult.error || 'Failed to generate data')
    });
  }

  const passedChecks = checks.filter(c => c.passed).length;
 const totalChecks = checks.length;

  debugLog('Divvi health check results', { checks, passedChecks, totalChecks });

  let status: 'healthy' | 'warning' | 'error';
  let summary: string;

  if (passedChecks === totalChecks) {
    status = 'healthy';
    summary = 'All Divvi integration checks passed';
  } else if (passedChecks >= totalChecks / 2) {
    status = 'warning';
    summary = `${passedChecks}/${totalChecks} checks passed - some issues detected`;
  } else {
    status = 'error';
    summary = `${passedChecks}/${totalChecks} checks passed - major issues detected`;
  }

  return { status, checks, summary };
}