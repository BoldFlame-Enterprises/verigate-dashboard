import {
  cloneElement,
  ReactElement,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_DELAY_MS = 700;

interface TooltipProps {
  children: ReactElement<{ 'aria-describedby'?: string }>;
  content: ReactNode;
}

export default function Tooltip({ children, content }: TooltipProps) {
  const tooltipId = useId();
  const trigger = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInside = useRef(false);
  const focusInside = useRef(false);
  const dismissed = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    placement: 'above' | 'below';
    top: number;
  } | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const scheduleOpen = () => {
    clearTimer();
    if (dismissed.current) return;
    timer.current = setTimeout(() => {
      const bounds = trigger.current?.getBoundingClientRect();
      if (!bounds) return;
      const horizontalBoundary = Math.min(132, window.innerWidth / 2);
      setPosition({
        left: Math.min(
          window.innerWidth - horizontalBoundary,
          Math.max(horizontalBoundary, bounds.left + bounds.width / 2)
        ),
        placement: bounds.top >= 48 ? 'above' : 'below',
        top: bounds.top >= 48 ? bounds.top - 8 : bounds.bottom + 8,
      });
      setIsVisible(true);
      timer.current = null;
    }, TOOLTIP_DELAY_MS);
  };

  const closeWhenInactive = () => {
    clearTimer();
    if (!pointerInside.current && !focusInside.current) {
      setIsVisible(false);
      dismissed.current = false;
    }
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;
    const closeForViewportChange = () => {
      setIsVisible(false);
      setPosition(null);
    };
    window.addEventListener('resize', closeForViewportChange);
    window.addEventListener('scroll', closeForViewportChange, true);
    return () => {
      window.removeEventListener('resize', closeForViewportChange);
      window.removeEventListener('scroll', closeForViewportChange, true);
    };
  }, [isVisible]);

  return (
    <span
      ref={trigger}
      className="relative inline-flex"
      onMouseEnter={() => {
        pointerInside.current = true;
        scheduleOpen();
      }}
      onMouseLeave={() => {
        pointerInside.current = false;
        closeWhenInactive();
      }}
      onFocus={() => {
        focusInside.current = true;
        scheduleOpen();
      }}
      onBlur={() => {
        focusInside.current = false;
        closeWhenInactive();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          clearTimer();
          dismissed.current = true;
          setIsVisible(false);
        }
      }}
    >
      {cloneElement(children, {
        'aria-describedby': isVisible
          ? [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
          : children.props['aria-describedby'],
      })}
      {isVisible && position && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          style={{ left: position.left, top: position.top }}
          className={`pointer-events-none fixed z-[100] w-max max-w-[min(16rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-center text-xs font-medium leading-4 text-gray-50 shadow-lg shadow-gray-950/20 ${
            position.placement === 'above' ? '-translate-y-full' : ''
          }`}
        >
          {content}
        </span>,
        document.body
      )}
    </span>
  );
}
