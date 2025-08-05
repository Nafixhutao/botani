import { cn } from "@/lib/utils"
import { Loader2, LucideIcon } from "lucide-react"

// Main page loading component
export function PageLoader({ 
  message = "Memuat halaman...",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center bg-background", className)}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary/60 rounded-full animate-spin" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">{message}</p>
          <div className="flex space-x-1 justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Content loading component
export function ContentLoader({ 
  message = "Memuat data...",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

// Spinner component
export function Spinner({ 
  size = "default",
  className 
}: { 
  size?: "sm" | "default" | "lg"
  className?: string 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
  )
}

// Skeleton components for different content types
export function CardSkeleton({ className, children }: { className?: string, children?: React.ReactNode }) {
  if (children) {
    return (
      <div className={cn("rounded-lg border bg-card p-6", className)}>
        {children}
      </div>
    )
  }
  
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
        <div className="h-3 bg-muted rounded w-2/3"></div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number, columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-muted rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="h-4 bg-muted rounded w-1/3"></div>
      <div className="h-64 bg-muted rounded-lg"></div>
      <div className="flex justify-center space-x-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton>
          <ChartSkeleton />
        </CardSkeleton>
        <CardSkeleton>
          <ChartSkeleton />
        </CardSkeleton>
      </div>
      
      {/* Recent Transactions */}
      <CardSkeleton>
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <TableSkeleton rows={5} columns={4} />
        </div>
      </CardSkeleton>
    </div>
  )
}

// Loading overlay for modals/dialogs
export function LoadingOverlay({ 
  message = "Memproses...",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn("absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50", className)}>
      <div className="flex flex-col items-center space-y-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

// Button loading state
export function ButtonLoader({ 
  children,
  loading,
  icon: Icon,
  className 
}: { 
  children: React.ReactNode
  loading?: boolean
  icon?: LucideIcon
  className?: string 
}) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {loading && <Spinner size="sm" />}
      {Icon && !loading && <Icon className="h-4 w-4" />}
      <span>{children}</span>
    </div>
  )
} 