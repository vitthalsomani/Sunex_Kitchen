import { alpha, createTheme, type Theme } from '@mui/material/styles';

/**
 * "Warm Quartz" — a luxury-minimal palette for Sunex Stones.
 * Brand orange as a glowing accent over warm stone neutrals (not cold blue SaaS).
 */
export const BRAND = {
  orange: '#E8852C',
  orangeDeep: '#C96E1B',
  orangeSoft: '#F4A65A',
  amber: '#F5B544',
  ember: '#FF6A3D',
};

const DISPLAY_FONT = '"Bricolage Grotesque", "Manrope", system-ui, sans-serif';
const BODY_FONT = '"Manrope", system-ui, -apple-system, sans-serif';

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark';

  const bgDefault = isDark ? '#14110E' : '#F7F4EF';
  const bgPaper = isDark ? '#1C1813' : '#FFFFFF';
  const textPrimary = isDark ? '#F3EDE4' : '#211C16';
  const textSecondary = isDark ? alpha('#F3EDE4', 0.62) : alpha('#211C16', 0.58);
  const divider = isDark ? alpha('#F3EDE4', 0.1) : alpha('#211C16', 0.09);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: BRAND.orange,
        dark: BRAND.orangeDeep,
        light: BRAND.orangeSoft,
        contrastText: '#1a1208',
      },
      secondary: { main: isDark ? '#C8BCA8' : '#5A5043' },
      background: { default: bgDefault, paper: bgPaper },
      text: { primary: textPrimary, secondary: textSecondary },
      divider,
      success: { main: '#3FB07A' },
      warning: { main: BRAND.amber },
      error: { main: '#E25563' },
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: BODY_FONT,
      h1: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.03em' },
      h3: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.025em' },
      h4: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontFamily: DISPLAY_FONT, fontWeight: 600, letterSpacing: '-0.015em' },
      h6: { fontFamily: DISPLAY_FONT, fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
      overline: { letterSpacing: '0.16em', fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(BRAND.orange, isDark ? 0.45 : 0.35),
            borderRadius: 8,
            border: `2px solid ${bgDefault}`,
          },
          '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            paddingInline: 18,
            transition: 'transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease',
            '&:active': { transform: 'scale(0.97)' },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.orangeDeep})`,
            boxShadow: `0 8px 22px ${alpha(BRAND.orange, 0.36)}`,
            '&:hover': { boxShadow: `0 10px 30px ${alpha(BRAND.orange, 0.5)}` },
            // Ensure disabled buttons actually look disabled (gradient would otherwise win).
            '&.Mui-disabled': {
              background: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08),
              color: isDark ? alpha('#fff', 0.38) : alpha('#000', 0.32),
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1px solid ${divider}`,
            backgroundImage: isDark
              ? `linear-gradient(180deg, ${alpha('#fff', 0.03)}, ${alpha('#fff', 0)})`
              : `linear-gradient(180deg, ${alpha('#fff', 0.7)}, ${alpha('#fff', 0)})`,
            boxShadow: isDark
              ? '0 2px 1px rgba(0,0,0,0.2), 0 18px 40px -24px rgba(0,0,0,0.7)'
              : '0 2px 1px rgba(180,150,110,0.05), 0 22px 48px -30px rgba(120,90,50,0.35)',
          },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 700, borderRadius: 9 } } },
      MuiTextField: { defaultProps: { variant: 'outlined' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.015),
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: textSecondary,
            borderColor: divider,
          },
          root: { borderColor: divider },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 24, backgroundImage: 'none' } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 8, fontWeight: 600, fontSize: '0.74rem' },
        },
      },
    },
  });
}
