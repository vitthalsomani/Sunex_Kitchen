import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import KeyboardCapslockRoundedIcon from '@mui/icons-material/KeyboardCapslockRounded';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { BODY_FONT, DISPLAY_FONT, MONO_FONT } from '../theme';
import { Item, Stagger } from '../components/ui';

const LOGO = `${import.meta.env.BASE_URL}favicon.png`;

/**
 * ThaliScene — a hand-built, top-down Indian *thali*: a stainless-steel plate
 * with four katori bowls (dal, sabzi, raita, curry), a stack of rotis, a mound
 * of saffron-flecked rice and a lemon-and-coriander garnish, over a warm ember
 * halo. Steam wisps rise on a gentle loop. All motion is disabled under
 * `prefers-reduced-motion`. Purely decorative → aria-hidden.
 */
function ThaliScene() {
  return (
    <Box
      component="svg"
      viewBox="0 0 520 520"
      sx={{
        width: 'clamp(210px, 24vw, 380px)',
        height: 'auto',
        overflow: 'visible',
        filter: 'drop-shadow(0 22px 28px rgba(58,29,5,0.35))',
      }}
      aria-hidden
    >
      <defs>
        <radialGradient id="thaliHalo" cx="0.5" cy="0.44" r="0.62">
          <stop offset="0" stopColor="#FFE0AE" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFE0AE" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="thaliRim" cx="0.4" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#F6F9FB" />
          <stop offset="0.55" stopColor="#D2DBE2" />
          <stop offset="1" stopColor="#9EAAB4" />
        </radialGradient>
        <radialGradient id="thaliPlate" cx="0.42" cy="0.34" r="0.8">
          <stop offset="0" stopColor="#FBFDFE" />
          <stop offset="1" stopColor="#DEE6EC" />
        </radialGradient>
        <linearGradient id="katoriRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EEF3F7" />
          <stop offset="1" stopColor="#AEB9C3" />
        </linearGradient>
      </defs>

      {/* warm glow behind the plate */}
      <circle cx="260" cy="286" r="228" fill="url(#thaliHalo)" />

      {/* steam — three wisps rising from the hot food */}
      <g fill="none" stroke="#fff6e6" strokeLinecap="round" strokeWidth="7">
        <path className="steam steam1" d="M205 150 C 188 120, 224 104, 205 74 C 190 50, 220 34, 205 8" opacity="0.7" />
        <path className="steam steam2" d="M262 140 C 244 108, 282 92, 262 58 C 246 32, 278 16, 262 -12" opacity="0.85" />
        <path className="steam steam3" d="M318 150 C 301 120, 337 104, 318 74 C 303 50, 333 34, 318 8" opacity="0.65" />
      </g>

      {/* the thali plate */}
      <circle cx="260" cy="290" r="178" fill="url(#thaliRim)" />
      <circle cx="260" cy="290" r="150" fill="url(#thaliPlate)" />
      <circle cx="260" cy="290" r="150" fill="none" stroke="#B7C2CB" strokeWidth="2" opacity="0.6" />
      {/* rim sheen */}
      <path d="M150 210 A178 178 0 0 1 372 168" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.55" />

      {/* katori — dal (turmeric) upper-left */}
      <g className="mote mote1">
        <circle cx="182" cy="236" r="42" fill="url(#katoriRim)" />
        <circle cx="182" cy="236" r="34" fill="#F2B705" />
        <circle cx="182" cy="236" r="34" fill="none" stroke="#C98A00" strokeWidth="2" opacity="0.5" />
        <ellipse cx="171" cy="225" rx="12" ry="7" fill="#FFDE71" opacity="0.7" />
      </g>

      {/* katori — sabzi (green) upper-right */}
      <g className="mote mote2">
        <circle cx="338" cy="236" r="42" fill="url(#katoriRim)" />
        <circle cx="338" cy="236" r="34" fill="#4E944F" />
        <circle cx="327" cy="228" r="6" fill="#7BC97C" />
        <circle cx="349" cy="243" r="5" fill="#2F6B31" />
        <circle cx="338" cy="230" r="4" fill="#C0463C" />
      </g>

      {/* katori — raita (cream) lower-left */}
      <g className="mote mote3">
        <circle cx="150" cy="330" r="40" fill="url(#katoriRim)" />
        <circle cx="150" cy="330" r="32" fill="#F5F1E6" />
        <circle cx="144" cy="324" r="4" fill="#3C8D40" opacity="0.7" />
        <circle cx="158" cy="335" r="3" fill="#E0A012" opacity="0.7" />
      </g>

      {/* katori — curry (deep red) lower-right */}
      <g className="mote mote1">
        <circle cx="370" cy="330" r="40" fill="url(#katoriRim)" />
        <circle cx="370" cy="330" r="32" fill="#C1440E" />
        <ellipse cx="361" cy="322" rx="10" ry="6" fill="#E8703A" opacity="0.7" />
      </g>

      {/* roti stack, lower-left of the plate centre */}
      <g>
        <ellipse cx="223" cy="372" rx="52" ry="34" fill="#D9AE6E" />
        <ellipse cx="223" cy="364" rx="52" ry="34" fill="#E8C98A" />
        <ellipse cx="223" cy="364" rx="52" ry="34" fill="none" stroke="#C99C57" strokeWidth="2" opacity="0.5" />
        <circle cx="205" cy="356" r="4" fill="#B07C3A" opacity="0.55" />
        <circle cx="238" cy="366" r="3" fill="#B07c3a" opacity="0.5" />
        <circle cx="222" cy="372" r="3.5" fill="#B07C3A" opacity="0.45" />
      </g>

      {/* rice mound, lower-right, with saffron flecks */}
      <g>
        <path d="M266 388 C 272 350, 348 350, 352 388 C 352 402, 266 402, 266 388 Z" fill="#FBFBF5" />
        <path d="M270 386 C 300 372, 320 372, 348 386" fill="none" stroke="#E7E7DC" strokeWidth="2" opacity="0.7" />
        <circle cx="298" cy="374" r="3" fill="#F2B705" />
        <circle cx="322" cy="380" r="2.6" fill="#EA6A1E" />
        <circle cx="309" cy="384" r="2.4" fill="#F2B705" />
      </g>

      {/* lemon wedge + coriander garnish, plate centre */}
      <g transform="translate(260 292)">
        <path d="M-22 0 A22 22 0 0 1 22 0 Z" fill="#F7D046" />
        <path d="M-22 0 A22 22 0 0 1 22 0 Z" fill="none" stroke="#D9A400" strokeWidth="2" />
        <path d="M0 0 L-14 -10 M0 0 L0 -16 M0 0 L14 -10" stroke="#FFEFA6" strokeWidth="2" />
        <circle cx="30" cy="-4" r="4" fill="#3C8D40" />
        <circle cx="38" cy="-9" r="3.4" fill="#4EA353" />
        <circle cx="24" cy="-11" r="3" fill="#2F6B31" />
      </g>

      <style>{`
        @keyframes rise {
          0%   { opacity: 0;   transform: translateY(14px) scale(0.96); }
          25%  { opacity: 0.9; }
          100% { opacity: 0;   transform: translateY(-26px) scale(1.04); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        .steam { transform-origin: center; animation: rise 4.4s ease-in-out infinite; }
        .steam1 { animation-delay: 0s; }
        .steam2 { animation-delay: 1s; }
        .steam3 { animation-delay: 1.9s; }
        .mote { transform-origin: center; animation: bob 5s ease-in-out infinite; }
        .mote2 { animation-delay: 0.6s; animation-duration: 6s; }
        .mote3 { animation-delay: 1.2s; animation-duration: 4.6s; }
        @media (prefers-reduced-motion: reduce) {
          .steam, .mote { animation: none; }
        }
      `}</style>
    </Box>
  );
}

/** Capitalize the first letter so server messages read as proper sentences. */
function cap(s?: string): string | undefined {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  /** Clear a stale error the moment the user starts correcting their input. */
  const clearErr = () => {
    if (err) setErr(null);
  };

  const capsFrom = (e: React.KeyboardEvent) => setCaps(e.getModifierState('CapsLock'));

  const useDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    clearErr();
    submitRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(username, password);
      navigate('/');
    } catch (e2: unknown) {
      const res = (e2 as { response?: { data?: { detail?: string } } })?.response;
      if (res) {
        setErr(cap(res.data?.detail) || 'Incorrect username or password.');
      } else {
        setErr("Can't reach the server. Check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        height: { xs: 'auto', md: '100dvh' },
        minHeight: '100dvh',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
        overflow: { md: 'hidden' },
        bgcolor: '#FBFBFC',
        fontFamily: BODY_FONT,
      }}
    >
      {/* ── Left: warm thali hero ─────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 0,
          p: 'clamp(30px, 4vw, 56px)',
          overflow: 'hidden',
          color: '#fff',
          background:
            'radial-gradient(120% 120% at 20% 0%, #F58234 0%, #C2540E 58%, #A8460A 100%)',
        }}
      >
        {/* subtle dotted texture */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            backgroundImage: 'radial-gradient(rgba(255,240,210,0.16) 1px, transparent 1.4px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(85% 85% at 50% 40%, #000 40%, transparent 100%)',
          }}
        />

        {/* wordmark (real favicon logo) */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={LOGO}
            alt=""
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: '11px',
              boxShadow: '0 6px 18px rgba(58,29,5,0.35)',
            }}
          />
          <Typography
            sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 22, letterSpacing: '0.2px' }}
          >
            SSPL&nbsp;Kitchen
          </Typography>
        </Stack>

        {/* centerpiece illustration */}
        <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', flexGrow: 1, minHeight: 0, py: 2 }}>
          <ThaliScene />
        </Box>

        {/* tagline */}
        <Box sx={{ position: 'relative', maxWidth: 400 }}>
          <Typography
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 500,
              fontSize: 'clamp(24px, 2.4vw, 30px)',
              lineHeight: 1.2,
              mb: 1.25,
            }}
          >
            Every meal,
            <br />
            measured &amp; managed.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: 14.5, lineHeight: 1.6 }}>
            Track daily headcount, purchases and monthly stock — and turn it all
            into a clear cost-per-meal picture for the factory mess.
          </Typography>
        </Box>
      </Box>

      {/* ── Right: login form ────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          overflowY: { md: 'auto' },
          p: 'clamp(28px, 5vw, 56px)',
          bgcolor: '#FBFBFC',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Stagger>
            {/* compact brand mark on small screens */}
            <Item>
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{ display: { xs: 'flex', md: 'none' }, mb: 4 }}
              >
                <Box
                  component="img"
                  src={LOGO}
                  alt=""
                  aria-hidden
                  sx={{ width: 36, height: 36, borderRadius: '10px' }}
                />
                <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 19, color: '#14181B' }}>
                  SSPL Kitchen
                </Typography>
              </Stack>
            </Item>

            <Item>
              <Typography
                sx={{
                  fontFamily: MONO_FONT,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#EA6A1E',
                  mb: 1,
                }}
              >
                Mess Ops · Sign in
              </Typography>
              <Typography
                sx={{
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 600,
                  fontSize: 'clamp(26px, 3vw, 30px)',
                  color: '#14181B',
                  letterSpacing: '-0.01em',
                  mb: 0.5,
                }}
              >
                Welcome back
              </Typography>
              <Typography sx={{ color: '#64707A', fontSize: 14.5, mb: 3.5 }}>
                Sign in to manage the mess operations.
              </Typography>
            </Item>

            <Item>
              <form onSubmit={submit}>
                <Stack spacing={2}>
                  {err && (
                    <Alert severity="error" role="alert" sx={{ borderRadius: 2 }}>
                      {err}
                    </Alert>
                  )}

                  <Box>
                    <Typography component="label" htmlFor="username" sx={monoLabelSx}>
                      Username
                    </Typography>
                    <TextField
                      id="username"
                      fullWidth
                      placeholder="admin"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        clearErr();
                      }}
                      autoFocus
                      required
                      autoComplete="username"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineRoundedIcon sx={{ fontSize: 20, color: '#64707A' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldSx}
                    />
                  </Box>

                  <Box>
                    <Typography component="label" htmlFor="password" sx={monoLabelSx}>
                      Password
                    </Typography>
                    <TextField
                      id="password"
                      fullWidth
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearErr();
                      }}
                      onKeyUp={capsFrom}
                      onKeyDown={capsFrom}
                      onBlur={() => setCaps(false)}
                      required
                      autoComplete="current-password"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon sx={{ fontSize: 20, color: '#64707A' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPw((v) => !v)}
                              onMouseDown={(e) => e.preventDefault()}
                              edge="end"
                              size="small"
                              aria-label={showPw ? 'Hide password' : 'Show password'}
                              sx={{
                                color: '#64707A',
                                '&:focus-visible': { outline: '2px solid #EA6A1E', outlineOffset: 2 },
                              }}
                            >
                              {showPw ? (
                                <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} />
                              ) : (
                                <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldSx}
                    />
                    {caps && (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        role="status"
                        aria-live="polite"
                        sx={{ mt: 1, color: '#B07A0A' }}
                      >
                        <KeyboardCapslockRoundedIcon sx={{ fontSize: 16 }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Caps Lock is on</Typography>
                      </Stack>
                    )}
                  </Box>

                  <Button
                    ref={submitRef}
                    type="submit"
                    disabled={busy}
                    aria-busy={busy}
                    disableElevation
                    endIcon={
                      busy ? (
                        <CircularProgress size={16} sx={{ color: 'inherit' }} />
                      ) : (
                        <ArrowForwardRoundedIcon />
                      )
                    }
                    sx={{
                      mt: 0.5,
                      py: 1.4,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: 15.5,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'linear-gradient(135deg,#EA6A1E,#C2540E)',
                      boxShadow: '0 10px 24px rgba(234,106,30,0.32)',
                      transition: 'transform .15s ease, box-shadow .15s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg,#F58234,#C2540E)',
                        boxShadow: '0 12px 30px rgba(234,106,30,0.46)',
                        transform: 'translateY(-1px)',
                      },
                      '&.Mui-disabled': { color: 'rgba(255,255,255,0.8)', opacity: 0.7 },
                    }}
                  >
                    {busy ? 'Signing in…' : 'Sign in'}
                  </Button>

                  <Typography sx={{ fontSize: 13, color: '#64707A', textAlign: 'center' }}>
                    Forgot your password?{' '}
                    <Box component="span" sx={{ color: '#C2540E', fontWeight: 600 }}>
                      Contact your admin
                    </Box>
                  </Typography>
                </Stack>
              </form>
            </Item>

            {/* the order chit — one-tap demo access, styled as a torn kitchen ticket */}
            <Item>
              <Box
                component="button"
                type="button"
                onClick={useDemo}
                aria-label="Fill demo credentials: admin / admin123"
                sx={{
                  mt: 3,
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  bgcolor: '#fff',
                  border: '1px solid #E4E8EC',
                  borderTop: '2px dashed #CDD5DC',
                  borderRadius: '0 0 12px 12px',
                  transition: 'border-color .15s ease, transform .15s ease',
                  '&:hover': { borderColor: '#EA6A1E', transform: 'translateY(-1px)' },
                  '&:focus-visible': { outline: '2px solid #EA6A1E', outlineOffset: 2 },
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontFamily: MONO_FONT,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: '#64707A',
                    }}
                  >
                    DEMO PASS
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: MONO_FONT,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#C2540E',
                      mt: 0.25,
                    }}
                  >
                    admin / admin123
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: MONO_FONT,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: '#98A2AC',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tap to fill
                </Typography>
              </Box>
            </Item>
          </Stagger>
        </Box>
      </Box>
    </Box>
  );
}

const monoLabelSx = {
  display: 'block',
  fontFamily: MONO_FONT,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#64707A',
  mb: 0.75,
} as const;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#fff',
    fontSize: 15,
    '& fieldset': { borderColor: '#E4E8EC' },
    '&:hover fieldset': { borderColor: '#C3CCD4' },
    '&.Mui-focused fieldset': { borderColor: '#EA6A1E', borderWidth: 2 },
  },
  '& .MuiOutlinedInput-input': { py: 1.35 },
} as const;
