import { useState, useCallback } from 'react'
import { useLoading } from './useLoading'

interface UseAsyncLoadingOptions {
  showGlobalLoader?: boolean
  loadingMessage?: string
  onError?: (error: any) => void
}

export function useAsyncLoading(options: UseAsyncLoadingOptions = {}) {
  const { showGlobalLoader = false, loadingMessage = 'Memuat...', onError } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const { startLoading, stopLoading } = useLoading()

  const execute = useCallback(async <T,>(
    asyncFunction: () => Promise<T>,
    customLoadingMessage?: string
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)
    
    if (showGlobalLoader) {
      startLoading(customLoadingMessage || loadingMessage)
    }

    try {
      const result = await asyncFunction()
      return result
    } catch (err) {
      setError(err)
      if (onError) {
        onError(err)
      }
      return null
    } finally {
      setLoading(false)
      if (showGlobalLoader) {
        stopLoading()
      }
    }
  }, [showGlobalLoader, loadingMessage, onError, startLoading, stopLoading])

  return {
    loading,
    error,
    execute,
    setError
  }
}

// Hook for managing multiple loading states
export function useMultiLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false
  }, [loadingStates])

  const isAnyLoading = Object.values(loadingStates).some(Boolean)

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading
  }
}