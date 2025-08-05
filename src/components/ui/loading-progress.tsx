import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Progress } from './progress'

interface LoadingStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'completed' | 'error'
  message?: string
}

interface LoadingProgressProps {
  steps: LoadingStep[]
  currentStep?: string
  onStepComplete?: (stepId: string) => void
  className?: string
}

export function LoadingProgress({ 
  steps, 
  currentStep, 
  onStepComplete, 
  className 
}: LoadingProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const completedSteps = steps.filter(step => step.status === 'completed').length
    const totalSteps = steps.length
    const newProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
    setProgress(newProgress)
  }, [steps])

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-3">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
              {
                'bg-muted text-muted-foreground': step.status === 'pending',
                'bg-primary text-primary-foreground': step.status === 'loading',
                'bg-green-500 text-white': step.status === 'completed',
                'bg-red-500 text-white': step.status === 'error'
              }
            )}>
              {step.status === 'loading' && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {step.status === 'completed' && '✓'}
              {step.status === 'error' && '✕'}
              {(step.status === 'pending') && (index + 1)}
            </div>
            
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium",
                {
                  'text-muted-foreground': step.status === 'pending',
                  'text-foreground': step.status === 'loading',
                  'text-green-600': step.status === 'completed',
                  'text-red-600': step.status === 'error'
                }
              )}>
                {step.label}
              </p>
              {step.message && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook for managing loading steps
export function useLoadingSteps(initialSteps: Omit<LoadingStep, 'status'>[]) {
  const [steps, setSteps] = useState<LoadingStep[]>(
    initialSteps.map(step => ({ ...step, status: 'pending' as const }))
  )

  const updateStep = (stepId: string, updates: Partial<LoadingStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ))
  }

  const startStep = (stepId: string, message?: string) => {
    updateStep(stepId, { status: 'loading', message })
  }

  const completeStep = (stepId: string, message?: string) => {
    updateStep(stepId, { status: 'completed', message })
  }

  const errorStep = (stepId: string, message?: string) => {
    updateStep(stepId, { status: 'error', message })
  }

  const resetSteps = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })))
  }

  return {
    steps,
    updateStep,
    startStep,
    completeStep,
    errorStep,
    resetSteps
  }
} 