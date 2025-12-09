import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Crew, CrewStatus } from '../types'
import { useData } from '../hooks/useData'

interface CrewContextType {
    crew: Crew[]
    updateCrewStatus: (crewId: string, status: CrewStatus, reason?: string) => void
    loading: boolean
}

const CrewContext = createContext<CrewContextType | undefined>(undefined)

export function CrewProvider({ children }: { children: ReactNode }) {
    const { crew: initialCrew, loading: dataLoading } = useData()
    const [crew, setCrew] = useState<Crew[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!dataLoading && initialCrew.length > 0) {
            setCrew(initialCrew)
            setLoading(false)
        } else if (!dataLoading && initialCrew.length === 0) {
            // Handle case where data is loaded but empty
            setLoading(false)
        }
    }, [dataLoading, initialCrew])

    const updateCrewStatus = (crewId: string, status: CrewStatus, reason?: string) => {
        setCrew((prevCrew) =>
            prevCrew.map((member) =>
                member.id === crewId ? { ...member, status } : member
            )
        )
        console.log(`Updated crew ${crewId} status to ${status}${reason ? ` (${reason})` : ''}`)
    }

    return (
        <CrewContext.Provider value={{ crew, updateCrewStatus, loading: loading || dataLoading }}>
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
