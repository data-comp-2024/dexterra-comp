import { createContext, useContext, ReactNode } from 'react'
import { useDispatch } from 'react-redux'
import { Crew, CrewStatus } from '../types'
import { useData } from '../hooks/useData'
import { updateCrew, addActivityLogEntry } from '../store/slices/dataSlice'
import { ActivityLogEntry } from '../types'

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
            const updatedMember = { ...member, status }
            dispatch(updateCrew(updatedMember))

            const logEntry: ActivityLogEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                userId: 'current-user',
                userName: 'Current User',
                actionType: 'crew_availability_changed',
                affectedEntityType: 'crew',
                affectedEntityId: crewId,
                details: { status, reason },
                beforeValues: { status: member.status },
                afterValues: { status: status }
            }
            dispatch(addActivityLogEntry(logEntry))
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
            const updatedMember = { ...member, ...updates }
            dispatch(updateCrew(updatedMember))

            const logEntry: ActivityLogEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                userId: 'current-user',
                userName: 'Current User',
                actionType: 'crew_updated',
                affectedEntityType: 'crew',
                affectedEntityId: crewId,
                details: { updates },
                beforeValues: member as unknown as Record<string, unknown>,
                afterValues: updatedMember as unknown as Record<string, unknown>
            }
            dispatch(addActivityLogEntry(logEntry))
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
