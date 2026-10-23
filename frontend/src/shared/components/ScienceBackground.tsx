interface ScienceBackgroundProps {
  variant?: "admin" | "regional" | "field";
}

export function ScienceBackground({ variant = "admin" }: ScienceBackgroundProps) {
  const accentColor =
    variant === "regional" ? "#3D6B52" : variant === "field" ? "#B45309" : "#BE755F";

  const nodeLabel =
    variant === "regional"
      ? "REGIONAL NODE // REQ-02"
      : variant === "field"
      ? "FIELD MOBILITY UNIT // TEL-04"
      : "CENTRAL COMMAND // US-EAST-01";

  const coordinates =
    variant === "regional"
      ? "GRID: REG-42.3601 N / 71.0589 W"
      : variant === "field"
      ? "GPS: ACTIVE FIELD DEPLOYMENT"
      : "SYS // LAT 37.7749° N / 122.4194° W";

  return (
    <div
      className="science-bg pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* Blueprint Tactical Coordinates */}
      <div
        className="absolute top-16 left-72 hidden text-[10px] font-mono tracking-widest uppercase md:block"
        style={{ color: "#788286", opacity: 0.4 }}
      >
        {nodeLabel}
      </div>
      <div
        className="absolute top-16 right-8 hidden text-[10px] font-mono tracking-widest uppercase md:block"
        style={{ color: "#788286", opacity: 0.4 }}
      >
        {coordinates}
      </div>
      <div
        className="absolute bottom-6 left-72 hidden text-[9px] font-mono tracking-widest uppercase md:block"
        style={{ color: "#788286", opacity: 0.35 }}
      >
        SCHEMATIC REF // SOW-OS v1.26
      </div>

      {/* Understated Hairline Geometric Schematics */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.25]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        {/* Subtle large schematic orbit circle top-right */}
        <circle
          cx="88%"
          cy="22%"
          r="260"
          stroke={accentColor}
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle
          cx="88%"
          cy="22%"
          r="160"
          stroke="#DDD7CD"
          strokeWidth="1"
        />
        <circle
          cx="88%"
          cy="22%"
          r="4"
          fill={accentColor}
        />

        {/* Crosshair target markers */}
        <path
          d="M 88% calc(22% - 280px) L 88% calc(22% - 240px) M 88% calc(22% + 240px) L 88% calc(22% + 280px)"
          stroke="#DDD7CD"
          strokeWidth="1"
        />
        <path
          d="M calc(88% - 280px) 22% L calc(88% - 240px) 22% M calc(88% + 240px) 22% L calc(88% + 280px) 22%"
          stroke="#DDD7CD"
          strokeWidth="1"
        />

        {/* Subtle schematic orbit circle bottom-left */}
        <circle
          cx="22%"
          cy="85%"
          r="320"
          stroke="#DDD7CD"
          strokeWidth="1"
          strokeDasharray="6 8"
        />
        <circle
          cx="22%"
          cy="85%"
          r="180"
          stroke={accentColor}
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* Fine measurement tick marks */}
        <line x1="15%" y1="85%" x2="16%" y2="85%" stroke="#DDD7CD" strokeWidth="1" />
        <line x1="28%" y1="85%" x2="29%" y2="85%" stroke="#DDD7CD" strokeWidth="1" />
        <line x1="22%" y1="78%" x2="22%" y2="79%" stroke="#DDD7CD" strokeWidth="1" />
        <line x1="22%" y1="91%" x2="22%" y2="92%" stroke="#DDD7CD" strokeWidth="1" />
      </svg>
    </div>
  );
}
