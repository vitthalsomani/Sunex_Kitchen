import { alpha, createTheme, type Theme } from '@mui/material/styles';

/**
 * "Foundry" — an industrial control-panel identity for the factory kitchen ERP.
 * Cool steel canvas, a single ember accent (kin to the orange crown mark), and a
 * monospaced tabular face for every number so the app reads like a precise register.
 */
export const BRAND = {
  ember: '#EA6A1E',
  emberDeep: '#C2540E',
  emberSoft: '#F58234',
  gain: '#1E9E6A',
  loss: '#D6453D',
  warn: '#E0A012',
};

const DISPLAY_FONT = '"Space Grotesk", "Hanken Grotesk", system-ui, sans-serif';
const BODY_FONT = '"Hanken Grotesk", system-ui, -apple-system, sans-serif';
export const MONO_FONT = '"Space Mono", ui-monospace, "SFMono-Regular", monospace';

/** Apply to any cell/label that holds a number so figures align like a ledger. */
export const tabularSx = { fontFamily: MONO_FONT, fontVariantNumeric: 'tabular-nums' } as const;

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark';

  const canvas = isDark ? '#0F1417' : '#EDF0F3';
  const surface = isDark ? '#171D22' : '#FFFFFF';
  const ink = isDark ? '#E7ECF0' : '#14181B';
  const steel = isDark ? '#8A97A2' : '#64707A';
  const line = isDark ? alpha('#E7ECF0', 0.1) : '#D6DCE1';
  const ember = isDark ? BRAND.emberSoft : BRAND.ember;

  return createTheme({
    palette: {
      mode,
      primary: { main: ember, dark: BRAND.emberDeep, light: BRAND.emberSoft, contrastText: '#FFFFFF' },
      secondary: { main: steel },
      background: { default: canvas, paper: surface },
      text: { primary: ink, secondary: steel },
      divider: line,
      success: { main: BRAND.gain },
      warning: { main: BRAND.warn },
      error: { main: BRAND.loss },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: BODY_FONT,
      h1: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontFamily: DISPLAY_FONT, fontWeight: 600, letterSpacing: '-0.015em' },
      h5: { fontFamily: DISPLAY_FONT, fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
      overline: { letterSpacing: '0.14em', fontWeight: 700, fontSize: '0.68rem' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(steel, isDark ? 0.5 : 0.4),
            borderRadius: 8,
            border: `2px solid ${canvas}`,
          },
          '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          // visible keyboard focus everywhere (a11y)
          'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, .MuiButtonBase-root:focus-visible':
            { outline: `2px solid ${ember}`, outlineOffset: 2 },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 16,
            transition: 'transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s ease',
            '&:active': { transform: 'scale(0.97)' },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${BRAND.ember}, ${BRAND.emberDeep})`,
            boxShadow: `0 6px 18px ${alpha(BRAND.ember, 0.34)}`,
            '&:hover': { boxShadow: `0 8px 24px ${alpha(BRAND.ember, 0.46)}` },
            '&.Mui-disabled': {
              background: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08),
              color: isDark ? alpha('#fff', 0.38) : alpha('#000', 0.3),
              boxShadow: 'none',
            },
          },
          outlined: { borderColor: line },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${line}`,
            boxShadow: isDark
              ? '0 1px 1px rgba(0,0,0,0.3), 0 12px 28px -20px rgba(0,0,0,0.8)'
              : '0 1px 1px rgba(20,24,27,0.03), 0 14px 30px -22px rgba(30,40,50,0.28)',
          },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 700, borderRadius: 8 } } },
      MuiTextField: { defaultProps: { variant: 'outlined' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: isDark ? alpha('#fff', 0.03) : alpha('#14181B', 0.015),
            '& fieldset': { borderColor: line },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: steel,
            borderColor: line,
            backgroundColor: surface,
          },
          root: { borderColor: line },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44 },
          indicator: { height: 3, borderRadius: 3, backgroundColor: ember },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 44,
            letterSpacing: '0.01em',
            color: steel,
            '&.Mui-selected': { color: ink },
          },
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 18, backgroundImage: 'none' } } },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontWeight: 600, fontSize: '0.74rem' } },
      },
    },
  });
}
