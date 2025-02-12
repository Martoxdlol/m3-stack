import { useMemo } from 'react'

export function useFilteredArray<T>(elements: T[] | undefined, filter: (element: T) => boolean): T[] {
    return useMemo(() => {
        return elements?.filter(filter) ?? []
    }, [elements, filter])
}
