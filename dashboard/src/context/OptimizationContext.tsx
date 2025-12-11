import { createContext, useContext, useState, ReactNode } from 'react'
import { Task } from '../types'
import { OptimizationResult } from '../services/optimizerService'

interface OptimizationContextType {
  optimizedTasks: Task[]
  setOptimizedTasks: (tasks: Task[]) => void
  optimizationResult: OptimizationResult | null
  setOptimizationResult: (result: OptimizationResult | null) => void
  hasOptimizedTasks: boolean
  clearOptimizedTasks: () => void
}

const OptimizationContext = createContext<OptimizationContextType | undefined>(undefined)

export function OptimizationProvider({ children }: { children: ReactNode }) {
  const [optimizedTasks, setOptimizedTasks] = useState<Task[]>([])
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)

  const clearOptimizedTasks = () => {
    setOptimizedTasks([])
    setOptimizationResult(null)
  }

  return (
    <OptimizationContext.Provider
      value={{
        optimizedTasks,
        setOptimizedTasks,
        optimizationResult,
        setOptimizationResult,
        hasOptimizedTasks: optimizedTasks.length > 0,
        clearOptimizedTasks,
      }}
    >
      {children}
    </OptimizationContext.Provider>
  )
}

export function useOptimization() {
  const context = useContext(OptimizationContext)
  if (context === undefined) {
    throw new Error('useOptimization must be used within an OptimizationProvider')
  }
  return context
}

