interface DashedCircleSpinnerProps {
  size?: number;
  className?: string;
}

export const DashedCircleSpinner = ({
  size = 44,
  className = "",
}: DashedCircleSpinnerProps) => {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading..."
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin text-primary"
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="6 6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default DashedCircleSpinner;
