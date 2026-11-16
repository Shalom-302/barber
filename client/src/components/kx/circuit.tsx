/** Decorative circuit traces echoing the Kortex logo (lines ending in pads). */
export function Circuit({ className = "" }: { className?: string }) {
    const traces = [
        "M0 120 H220 L270 70 H420",
        "M0 200 H160 L220 260 H380 L420 220",
        "M1200 90 H980 L930 140 H800",
        "M1200 260 H1040 L990 210 H860",
        "M0 420 H120 L180 360 H300",
        "M1200 440 H1080 L1020 500 H900",
        "M600 0 V60 L650 110 V180",
        "M560 560 V500 L520 460 V400",
    ];
    const pads = [
        [420, 70],
        [420, 220],
        [800, 140],
        [860, 210],
        [300, 360],
        [900, 500],
        [650, 180],
        [520, 400],
    ];
    return (
        <svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {traces.map(d => (
                    <path key={d} d={d} />
                ))}
            </g>
            <g fill="currentColor">
                {pads.map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="6" />
                ))}
            </g>
        </svg>
    );
}
