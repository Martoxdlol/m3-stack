import { type ComponentProps, type CSSProperties, useLayoutEffect } from 'react'

export const OUTER_DIV_STYLE: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
}

export const INNER_DIV_STYLE: CSSProperties = {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    marginTop: 'var(--scroll-margin-top)',
    height: 'var(--screen-height)',
}

/**
 * This components works by sizing a custom div to the actual visible size of the screen.
 *
 * So for example if the virtual keyboard is open, the screen will resize to the visible area.
 *
 * If some bottom of top mobile nav is open, the screen will resize to the visible area.
 *
 * It will also scroll to the top to avoid force scroll when keyboard is open on some devices.
 *
 * It will also set a css variable `--scroll-margin-top` to the offsetTop of the visualViewport. (this should be 0 most of the time).
 *
 * It will also set a css variable `--screen-height` to the height of the visualViewport (Screen component).
 */
export function Screen(props: ComponentProps<'div'>) {
    useLayoutEffect(() => {
        /**
         * Handle different events that can change the screen size.
         */
        function focusEventHandler(e?: { preventDefault: () => void }) {
            e?.preventDefault()
            const vw = window.visualViewport
            if (vw) {
                document.documentElement.style.setProperty('--screen-height', `${vw.height}px`)
            }

            window.scrollTo(0, 0)

            const scrollMarginTop = window.visualViewport?.offsetTop
            document.documentElement.style.setProperty('--scroll-margin-top', `${scrollMarginTop ?? 0}px`)
        }

        // initial call
        focusEventHandler()

        // set interval to keep updating the screen size (just in case)
        const timer = setInterval(() => {
            focusEventHandler()
        }, 5000)

        // fasten the update when keyboard is open
        const timer2 = setInterval(() => {
            // if keyboard open
            if (window.visualViewport && window.innerHeight > window.visualViewport.height) {
                focusEventHandler()
            }
        }, 1000)

        // add event listeners

        // focus events
        window.addEventListener('focusin', focusEventHandler)
        window.addEventListener('focusout', focusEventHandler)

        // resize events
        window.visualViewport?.addEventListener('resize', focusEventHandler)

        // scroll events
        window.addEventListener('scroll', focusEventHandler)
        visualViewport?.addEventListener('scroll', focusEventHandler)

        return () => {
            window.removeEventListener('focusin', focusEventHandler)
            window.removeEventListener('focusout', focusEventHandler)
            clearInterval(timer)
            clearInterval(timer2)
            window.visualViewport?.removeEventListener('resize', focusEventHandler)
            window.removeEventListener('scroll', focusEventHandler)
            visualViewport?.removeEventListener('scroll', focusEventHandler)
        }
    }, [])

    return (
        <div {...props} style={{ ...OUTER_DIV_STYLE, ...props.style }}>
            <div
                {...props}
                style={{ ...INNER_DIV_STYLE, ...props.style }}
            >
                {props.children}
            </div>
        </div>
    )
}
