import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, title, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <button
        type="button"
        onClick={() => setIsVisible((v) => !v)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        aria-label={title || 'More information'}
      >
        <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>

      {isVisible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-lg text-xs leading-relaxed font-normal bg-zinc-900 text-zinc-100 dark:bg-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 shadow-xl z-50 pointer-events-none animate-fade-in"
        >
          {title && <div className="font-semibold text-zinc-100 dark:text-zinc-900 mb-1">{title}</div>}
          <div className="text-zinc-300 dark:text-zinc-600 text-[11px]">{content}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-white" />
        </div>
      )}
    </div>
  );
};
