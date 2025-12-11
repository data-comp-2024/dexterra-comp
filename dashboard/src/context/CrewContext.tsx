import { createContext, useContext, ReactNode } from 'react'
import { useDispatch } from 'react-redux'
import { Crew, CrewStatus } from '../types'
import { useData } from '../hooks/useData'
import { updateCrew } from '../store/slices/dataSlice'

interface CrewContextType {
    crew: Crew[]
    updateCrewStatus: (crewId: string, status: CrewStatus, reason?: string) => void
    updateCrewShift: (crewId: string, startTime: Date, endTime: Date) => void
    updateCrewDetails: (crewId: string, updates: Partial<Crew>) => void
    loading: boolean
}

const CrewContext = createContext<CrewContextType | undefined>(undefined)

export function CrewProvider({ children }: { children: ReactNode }) {
    const { crew, loading } = useData()
    const dispatch = useDispatch()

    const updateCrewStatus = (crewId: string, status: CrewStatus, reason?: string) => {
        const member = crew.find(c => c.id === crewId)
        if (member) {
            dispatch(updateCrew({ ...member, status }))
            console.log(`Updated crew ${crewId} status to ${status}${reason ? ` (${reason})` : ''}`)
        }
    }

    const updateCrewShift = (crewId: string, startTime: Date, endTime: Date) => {
        const member = crew.find(c => c.id === crewId)
        if (member) {
            dispatch(updateCrew({
                ...member,
                shift: {
                    startTime,
                    endTime,
                },
            }))
            console.log(`Updated crew ${crewId} shift to ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`)
        }
    }

    const updateCrewDetails = (crewId: string, updates: Partial<Crew>) => {
        const member = crew.find(c => c.id === crewId)
        if (member) {
            dispatch(updateCrew({ ...member, ...updates }))
            console.log(`Updated crew ${crewId} details`, updates)
        }
    }

    return (
        <CrewContext.Provider value={{ crew, updateCrewStatus, updateCrewShift, updateCrewDetails, loading }}>
            {children}
        </CrewContext.Provider>
    )
}

export function useCrew() {
    const context = useContext(CrewContext)
    if (context === undefined) {
        throw new Error('useCrew must be used within a CrewProvider')
    }
    return context
}
