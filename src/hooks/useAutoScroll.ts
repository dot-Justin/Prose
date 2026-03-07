import { useEffect, useRef } from 'react'

export function useAutoScroll<T>(deps: T[]) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { scrollTop, clientHeight, scrollHeight } = el
    const distFromBottom = scrollHeight - scrollTop - clientHeight
    if (distFromBottom <= 100) {
      el.scrollTo({ top: scrollHeight, behavior: 'smooth' })
    }
  }, [deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return ref
}
