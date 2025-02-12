import { useEffect, useState } from 'react'

export type Opts = {
    updateInterval?: number
}

export function useCurrentDate(opts?: Opts) {
    const [date, setDate] = useState(new Date())

    const updateInterval = opts?.updateInterval ?? 1000

    useEffect(() => {
        const interval = setInterval(() => {
            setDate(new Date())
        }, updateInterval)

        return () => clearInterval(interval)
    }, [updateInterval])

    return date
}
