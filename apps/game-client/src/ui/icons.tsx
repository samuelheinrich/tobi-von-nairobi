export function BottleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 32" fill="none" aria-hidden="true">
      <path
        d="M9 2h6v7l3 5v15H6V14l3-5V2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M6 18h12M6 24h12M9 5h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function CompassIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.5" />
      <path d="m25 11-2 12-9 6 3-13 8-5Z" fill="currentColor" />
      <path d="M20 0v6M20 34v6M0 20h6M34 20h6" stroke="currentColor" />
    </svg>
  );
}
