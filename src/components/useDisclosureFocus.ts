import { RefObject, useEffect, useRef } from 'react';

export function useDisclosureFocus(
  open: boolean,
  initialFocusRef: RefObject<HTMLElement | null>,
  returnFocusRef: RefObject<HTMLElement | null>,
) {
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    } else if (wasOpen.current) {
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    }
    wasOpen.current = open;
  }, [initialFocusRef, open, returnFocusRef]);
}
