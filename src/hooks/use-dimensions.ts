import { useEffect, useState } from 'react'

export function useDimensions(element?: HTMLElement | null) {
    const elem = element ?? window.document.body

    const [dimensions, setDimensions] = useState<{ width: number; height: number }>(() => {
        const rect = elem.getBoundingClientRect()
        return {
            width: rect.width,
            height: rect.height,
        }
    })

    useEffect(() => {
        const handleResize = () => {
            const rect = elem.getBoundingClientRect()

            setDimensions({
                width: rect.width,
                height: rect.height,
            })
        }

        handleResize()

        window.addEventListener?.('resize', handleResize)
        element?.addEventListener?.('resize', handleResize)
        return () => {
            window.removeEventListener?.('resize', handleResize)
            element?.removeEventListener?.('resize', handleResize)
        }
    }, [elem, element])

    return dimensions
}
