import { supabase } from './supabase'

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CacheOptions {
  ttl?: number
  backgroundSync?: boolean
}

export async function saveToDatabase(
  key: string, 
  data: any, 
  options: CacheOptions = {}
): Promise<boolean> {
  try {
    const { ttl = CACHE_DURATION } = options
    const expiresAt = new Date(Date.now() + ttl).toISOString()
    
    const serializedData = JSON.parse(JSON.stringify(data, (k, v) => 
      typeof v === 'bigint' ? v.toString() : v
    ))

    const { error } = await supabase
      .from('analytics_cache')
      .upsert({
        cache_key: key,
        data: serializedData,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'cache_key'
      })

    if (error) {
      console.error('Failed to save to database:', error)
      return false
    }

    return true
  } catch (error) {
    console.warn('Failed to save to database:', error)
    return false
  }
}

export async function loadFromDatabase<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('analytics_cache')
      .select('data, expires_at')
      .eq('cache_key', key)
      .single()

    if (error || !data) {
      return null
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase.from('analytics_cache').delete().eq('cache_key', key)
      return null
    }

    return JSON.parse(JSON.stringify(data.data), (k, v) => {
      if (k === 'amount' && typeof v === 'string' && /^\d+$/.test(v)) {
        return BigInt(v)
      }
      return v
    })
  } catch (error) {
    console.warn('Failed to load from database:', error)
    return null
  }
}

export async function isCacheValid(key: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('analytics_cache')
      .select('expires_at')
      .eq('cache_key', key)
      .single()

    if (!data || !data.expires_at) return false
    
    return new Date(data.expires_at) > new Date()
  } catch {
    return false
  }
}

export async function clearExpiredCache(): Promise<void> {
  try {
    await supabase
      .from('analytics_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
  } catch (error) {
    console.warn('Failed to clear expired cache:', error)
  }
}

export async function updateSyncStatus(
  syncType: string, 
  status: 'idle' | 'syncing' | 'error',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase
      .from('sync_status')
      .upsert({
        sync_type: syncType,
        status,
        last_sync: new Date().toISOString(),
        error_message: errorMessage || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'sync_type'
      })
  } catch (error) {
    console.warn('Failed to update sync status:', error)
  }
}

export async function getSyncStatus(syncType: string) {
  try {
    const { data } = await supabase
      .from('sync_status')
      .select('*')
      .eq('sync_type', syncType)
      .single()

    return data
  } catch {
    return null
  }
}