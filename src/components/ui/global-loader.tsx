import { useLoading } from "@/hooks/useLoading"
import { cn } from "@/lib/utils"

export function GlobalLoader() {
  const { isLoading, loadingMessage } = useLoading()

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-primary/20">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{
            width: '100%',
            animation: 'loading-bar 2s ease-in-out infinite'
          }}
        />
      </div>
      <div className="bg-background/95 backdrop-blur-sm border-b px-4 py-2">
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>{loadingMessage}</span>
        </div>
      </div>
    </div>
  )
}

// Add the loading bar animation to your CSS
const loadingBarStyles = `
  @keyframes loading-bar {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = loadingBarStyles
  document.head.appendChild(style)
} 