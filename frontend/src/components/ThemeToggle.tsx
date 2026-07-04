import { Tooltip } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { useColorMode } from '../context/ColorModeContext';

/**
 * Animated SVG day/night switch. A sun springs across the track and morphs into
 * a crescent moon (via an offset mask), rays retract, and stars twinkle in.
 * Accessible: role="switch", keyboard toggle, reduced-motion aware.
 */
const RAYS = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
const STARS = [
  { cx: 18, cy: 12, r: 1.2, d: 0.05 },
  { cx: 26, cy: 20, r: 0.9, d: 0.18 },
  { cx: 14, cy: 22, r: 0.8, d: 0.3 },
];

const W = 64;
const H = 32;
const THUMB_R = 11;
const POS_LIGHT = 16; // thumb cx when light
const POS_DARK = W - 16; // thumb cx when dark

export default function ThemeToggle() {
  const { mode, toggle } = useColorMode();
  const dark = mode === 'dark';
  const reduce = useReducedMotion();

  const spring = reduce
    ? { duration: 0.001 }
    : { type: 'spring' as const, stiffness: 500, damping: 32 };

  return (
    <Tooltip title={dark ? 'Switch to light' : 'Switch to dark'}>
      <motion.button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Toggle dark mode"
        onClick={toggle}
        whileTap={reduce ? undefined : { scale: 0.93 }}
        style={{
          width: W,
          height: H,
          padding: 0,
          border: 'none',
          borderRadius: 999,
          cursor: 'pointer',
          background: 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <defs>
            <linearGradient id="tt-day" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFD79A" />
              <stop offset="100%" stopColor="#F5A623" />
            </linearGradient>
            <linearGradient id="tt-night" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2B2350" />
              <stop offset="100%" stopColor="#0E1430" />
            </linearGradient>
            <radialGradient id="tt-sun" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFF4D6" />
              <stop offset="100%" stopColor="#FFB23E" />
            </radialGradient>
            <radialGradient id="tt-moon" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#F4F1FF" />
              <stop offset="100%" stopColor="#C9CEF0" />
            </radialGradient>
            <mask id="tt-moon-mask">
              <rect width={W} height={H} fill="black" />
              <circle cx={POS_DARK} cy={H / 2} r={THUMB_R} fill="white" />
              {/* offset cut-out makes the crescent only in dark mode */}
              <motion.circle
                cy={H / 2 - 3}
                r={THUMB_R - 1}
                fill="black"
                animate={{ cx: dark ? POS_DARK + 5 : POS_DARK + THUMB_R + 8 }}
                transition={spring}
              />
            </mask>
          </defs>

          {/* Track — cross-fades day↔night */}
          <rect width={W} height={H} rx={H / 2} fill="url(#tt-day)" />
          <motion.rect
            width={W}
            height={H}
            rx={H / 2}
            fill="url(#tt-night)"
            animate={{ opacity: dark ? 1 : 0 }}
            transition={{ duration: reduce ? 0.001 : 0.4 }}
          />

          {/* Stars (dark only) */}
          {STARS.map((s, i) => (
            <motion.circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill="#FFFFFF"
              initial={false}
              animate={{
                opacity: dark ? [0.4, 1, 0.4] : 0,
                scale: dark ? 1 : 0.3,
              }}
              transition={
                dark && !reduce
                  ? { duration: 2.4, repeat: Infinity, delay: s.d, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            />
          ))}

          {/* Sun rays (light only) — retract + rotate on switch */}
          <motion.g
            animate={{ opacity: dark ? 0 : 1, rotate: dark ? 35 : 0 }}
            transition={spring}
            style={{ originX: `${POS_LIGHT}px`, originY: `${H / 2}px` }}
          >
            {RAYS.map((a, i) => {
              const x1 = POS_LIGHT + Math.cos(a) * 13;
              const y1 = H / 2 + Math.sin(a) * 13;
              const x2 = POS_LIGHT + Math.cos(a) * 16;
              const y2 = H / 2 + Math.sin(a) * 16;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FFD25A"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
          </motion.g>

          {/* Thumb — slides; sun underneath, moon overlay with crescent mask */}
          <motion.circle
            cy={H / 2}
            r={THUMB_R}
            fill="url(#tt-sun)"
            animate={{ cx: dark ? POS_DARK : POS_LIGHT }}
            transition={spring}
          />
          <motion.circle
            cy={H / 2}
            r={THUMB_R}
            fill="url(#tt-moon)"
            mask="url(#tt-moon-mask)"
            animate={{ cx: dark ? POS_DARK : POS_LIGHT, opacity: dark ? 1 : 0 }}
            transition={spring}
          />
        </svg>
      </motion.button>
    </Tooltip>
  );
}
