import { createContext, useContext, useState, ReactNode } from 'react'
import { Task } from '../types'

interface OptimizationContextType {
  optimizedTasks: Task[]
  setOptimizedTasks: (tasks: Task[]) => void
  hasOptimizedTasks: boolean
  clearOptimizedTasks: () => void
}

const OptimizationContext = createContext<OptimizationContextType | undefined>(undefined)

export function OptimizationProvider({ children }: { children: ReactNode }) {
  const [optimizedTasks, setOptimizedTasks] = useState<Task[]>([])

  const clearOptimizedTasks = () => {
    setOptimizedTasks([])
  }

  return (
    <OptimizationContext.Provider
      value={{
        optimizedTasks,
        setOptimizedTasks,
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

