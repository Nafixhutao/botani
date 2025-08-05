import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageLoader } from './loading'

export function RouteLoader({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingKey, setLoadingKey] = useState(0)

  useEffect(() => {
    setIsLoading(true)
    setLoadingKey(prev => prev + 1)
    
    // Simulate a minimum loading time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [location.pathname])

  if (isLoading) {
    return (
      <PageLoader 
        key={loadingKey}
        message="Memuat halaman..." 
      />
    )
  }

  return <>{children}</>
}

// Higher-order component for route-based loading
export function withRouteLoading<T extends object>(
  Component: React.ComponentType<T>
) {
  return function WrappedComponent(props: T) {
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 200)

      return () => clearTimeout(timer)
    }, [])

    if (isLoading) {
      return <PageLoader message="Memuat halaman..." />
    }

    return <Component {...props} />
  }
} 