type IconProps = { className?: string };

const base = "h-5 w-5";

export function CarIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 16V11.5L6 7h12l2 4.5V16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16h16v2.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V17H7v1.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V16Z" strokeLinejoin="round" />
      <circle cx="7.5" cy="16" r="1.3" />
      <circle cx="16.5" cy="16" r="1.3" />
      <path d="M4.5 12h15" />
    </svg>
  );
}

export function BusIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16" strokeLinecap="round" />
      <path d="M7 4v13M17 4v13" />
      <circle cx="7.5" cy="19.5" r="1.2" />
      <circle cx="16.5" cy="19.5" r="1.2" />
      <path d="M9 7.5h2M13 7.5h2" strokeLinecap="round" />
    </svg>
  );
}

export function TrainIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="5" y="3.5" width="14" height="13" rx="4" />
      <path d="M5 11h14" />
      <circle cx="9" cy="13.5" r="1" />
      <circle cx="15" cy="13.5" r="1" />
      <path d="M8 20l-2 2M16 20l2 2" strokeLinecap="round" />
      <path d="M9 6.5h6" strokeLinecap="round" />
    </svg>
  );
}

export function MapIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path
        d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M9 4v14M15 6v14" strokeLinecap="round" />
    </svg>
  );
}

export function MapPinIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path
        d="M12 21s-7-6.1-7-11.3A7 7 0 0 1 19 9.7C19 14.9 12 21 12 21Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

export function ClockIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WalkIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="13.5" cy="4.5" r="1.6" />
      <path
        d="M10 8.5 8 11l1.5 2 .5 5-2.5 3.5M14 8.5l2 3-1 3 3 3M9.5 13l4.5.5 2-2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
