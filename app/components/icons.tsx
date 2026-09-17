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

export function ChatIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path
        d="M4 5.5h16v11H9.5L5 20.5v-4H4v-11Z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M8 10h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

export function LocationIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

export function SendIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 12 20 4l-6 16-3-7-7-3Z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export function MinimizeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 12h12" strokeLinecap="round" />
    </svg>
  );
}

export function RefreshIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path
        d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5M19.5 12a7.5 7.5 0 0 1-12.6 5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 3.5v3.5h-3.5M7 20.5V17h3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LineIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#06C755" />
      <path
        d="M12 5.2c-4.42 0-8 2.86-8 6.4 0 3.17 2.85 5.83 6.7 6.32.26.06.62.17.71.4.08.2.05.53.02.74l-.11.7c-.03.2-.16.79.69.43.85-.36 4.6-2.71 6.28-4.64C19.4 14.1 20 12.94 20 11.6c0-3.54-3.58-6.4-8-6.4Z"
        fill="#fff"
      />
    </svg>
  );
}

export function WhatsAppIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        d="M16.7 13.6c-.26-.13-1.53-.75-1.77-.84-.24-.09-.41-.13-.58.13-.17.26-.67.84-.82 1.01-.15.17-.3.19-.56.06-.26-.13-1.09-.4-2.08-1.28-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.39-.79-1.9-.21-.5-.42-.43-.58-.44h-.5c-.17 0-.45.06-.68.32-.24.26-.9.88-.9 2.14s.92 2.48 1.05 2.65c.13.17 1.81 2.76 4.38 3.87.61.26 1.09.42 1.46.54.61.19 1.17.17 1.61.1.49-.07 1.53-.62 1.75-1.23s.22-1.11.15-1.23c-.06-.11-.24-.17-.5-.3Z"
        fill="#fff"
      />
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
