import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BRAND } from '../theme';

/**
 * Atmospheric background: soft warm radial glows behind everything, plus the
 * grain overlay (applied via the `.sunex-grain` class on the wrapper).
 */
export default function AppBackground() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: dark
          ? `radial-gradient(60rem 40rem at 12% -8%, ${alphaHex(BRAND.orange, 0.18)}, transparent 60%),
             radial-gradient(50rem 36rem at 100% 0%, ${alphaHex(BRAND.ember, 0.12)}, transparent 55%),
             radial-gradient(48rem 40rem at 50% 120%, ${alphaHex(BRAND.amber, 0.1)}, transparent 60%)`
          : `radial-gradient(60rem 40rem at 10% -10%, ${alphaHex(BRAND.orange, 0.16)}, transparent 60%),
             radial-gradient(52rem 38rem at 100% -4%, ${alphaHex(BRAND.amber, 0.14)}, transparent 58%),
             radial-gradient(46rem 38rem at 50% 118%, ${alphaHex(BRAND.orangeSoft, 0.12)}, transparent 60%)`,
      }}
    />
  );
}

function alphaHex(hex: string, a: number): string {
  const n = Math.round(a * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
}
