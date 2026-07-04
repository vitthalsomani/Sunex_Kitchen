import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BRAND } from '../theme';

/**
 * Foundry atmosphere: a cool steel wash with one faint ember glow in the corner,
 * over a very low-opacity blueprint grid — evoking engineering paper / a ruled
 * store register. Static (no motion), so it's inherently reduced-motion safe.
 */
export default function AppBackground() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const grid = dark ? 'rgba(231,236,240,0.04)' : 'rgba(20,24,27,0.035)';
  const wash = dark
    ? `radial-gradient(70rem 46rem at 100% -6%, ${hexA(BRAND.ember, 0.1)}, transparent 55%),
       radial-gradient(60rem 44rem at -6% 108%, rgba(80,110,130,0.12), transparent 60%)`
    : `radial-gradient(70rem 46rem at 100% -8%, ${hexA(BRAND.ember, 0.07)}, transparent 55%),
       radial-gradient(60rem 44rem at -6% 108%, rgba(120,140,160,0.12), transparent 60%)`;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: theme.palette.background.default,
        backgroundImage: `${wash},
          linear-gradient(${grid} 1px, transparent 1px),
          linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
        backgroundSize: 'auto, 32px 32px, 32px 32px',
      }}
    />
  );
}

function hexA(hex: string, a: number): string {
  const n = Math.round(a * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
}
