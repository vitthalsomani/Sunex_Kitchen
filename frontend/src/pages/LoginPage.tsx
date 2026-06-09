import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

/**
 * KitchenScene — a hand-built SVG illustration: a simmering pot with rising
 * steam, a chef's toque and a ladle, set on a warm ember gradient. The steam
 * wisps and floating ingredient motes animate via inline CSS keyframes.
 */
function KitchenScene() {
  return (
    <Box
      component="svg"
      viewBox="0 0 520 520"
      sx={{ width: '100%', maxWidth: 440, height: 'auto', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="potBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7c6" />
          <stop offset="0.5" stopColor="#f0b756" />
          <stop offset="1" stopColor="#b9722a" />
        </linearGradient>
        <linearGradient id="potRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3da" />
          <stop offset="1" stopColor="#e0a24a" />
        </linearGradient>
        <linearGradient id="hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6ebf0" />
        </linearGradient>
        <radialGradient id="halo" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#ffd57e" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd57e" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#3a1d05" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* warm glow behind the scene */}
      <circle cx="260" cy="230" r="210" fill="url(#halo)" />

      {/* steam — three wisps rising from the pot */}
      <g fill="none" stroke="#fff6e6" strokeLinecap="round" strokeWidth="7">
        <path className="steam steam1" d="M205 168 C 188 138, 224 122, 205 92 C 190 68, 220 52, 205 26" opacity="0.75" />
        <path className="steam steam2" d="M260 158 C 242 126, 280 110, 260 76 C 244 50, 276 34, 260 6" opacity="0.9" />
        <path className="steam steam3" d="M315 168 C 298 138, 334 122, 315 92 C 300 68, 330 52, 315 26" opacity="0.7" />
      </g>

      {/* chef's toque, peeking behind the pot's left */}
      <g filter="url(#soft)" transform="translate(96 150)">
        <path
          d="M18 70 C -4 64, -6 30, 22 26 C 24 4, 64 -2, 78 16 C 96 0, 130 10, 124 36 C 150 40, 146 74, 122 76 Z"
          fill="url(#hat)"
        />
        <rect x="14" y="72" width="114" height="26" rx="8" fill="#f3f6f9" />
        <rect x="14" y="84" width="114" height="6" fill="#dfe6ed" opacity="0.8" />
      </g>

      {/* the ladle, angled behind the pot's right */}
      <g transform="translate(360 158) rotate(22)" filter="url(#soft)">
        <rect x="-7" y="-96" width="14" height="150" rx="7" fill="#c0681f" />
        <rect x="-7" y="-96" width="6" height="150" rx="3" fill="#e89b46" opacity="0.7" />
        <path d="M-34 54 a34 26 0 1 0 68 0 Z" fill="url(#potRim)" />
        <ellipse cx="0" cy="54" rx="34" ry="13" fill="#d98f3c" />
      </g>

      {/* the pot */}
      <g filter="url(#soft)">
        {/* body */}
        <path
          d="M150 200 H370 L356 330 C 352 366, 322 392, 286 392 H234 C198 392, 168 366, 164 330 Z"
          fill="url(#potBody)"
        />
        {/* body sheen */}
        <path d="M186 214 L176 330 C 173 352, 184 372, 204 380 C 192 360, 196 250, 206 214 Z" fill="#fff3da" opacity="0.45" />
        {/* rim */}
        <rect x="138" y="186" width="244" height="34" rx="17" fill="url(#potRim)" />
        <rect x="138" y="186" width="244" height="12" rx="6" fill="#fff7e8" opacity="0.7" />
        {/* handles */}
        <path d="M138 206 C 108 206, 108 246, 138 246" fill="none" stroke="#a85c1f" strokeWidth="15" strokeLinecap="round" />
        <path d="M382 206 C 412 206, 412 246, 382 246" fill="none" stroke="#a85c1f" strokeWidth="15" strokeLinecap="round" />
      </g>

      {/* floating ingredient motes */}
      <g>
        <circle className="mote mote1" cx="130" cy="300" r="9" fill="#5fae5b" />
        <circle className="mote mote2" cx="404" cy="276" r="7" fill="#e2554a" />
        <circle className="mote mote3" cx="408" cy="350" r="6" fill="#f2c14e" />
        <circle className="mote mote1" cx="112" cy="372" r="5" fill="#f2c14e" />
      </g>

      <style>{`
        @keyframes rise {
          0%   { opacity: 0;   transform: translateY(14px) scale(0.96); }
          25%  { opacity: 0.9; }
          100% { opacity: 0;   transform: translateY(-26px) scale(1.04); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .steam { transform-origin: center; animation: rise 4.2s ease-in-out infinite; }
        .steam1 { animation-delay: 0s; }
        .steam2 { animation-delay: 0.9s; }
        .steam3 { animation-delay: 1.7s; }
        .mote { transform-origin: center; animation: bob 5s ease-in-out infinite; }
        .mote2 { animation-delay: 0.6s; animation-duration: 6s; }
        .mote3 { animation-delay: 1.2s; animation-duration: 4.4s; }
        @media (prefers-reduced-motion: reduce) {
          .steam, .mote { animation: none; }
        }
      `}</style>
    </Box>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(username, password);
      navigate('/');
    } catch (e2: unknown) {
      const msg = (e2 as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErr(msg || 'login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
        bgcolor: '#0e1512',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* ── Left: brand / illustration panel ─────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          overflow: 'hidden',
          color: '#fff',
          background:
            'radial-gradient(120% 120% at 15% 0%, #2a1c10 0%, #18120c 45%, #0e1512 100%)',
        }}
      >
        {/* subtle dotted texture */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.4,
            backgroundImage:
              'radial-gradient(rgba(255,213,126,0.10) 1px, transparent 1.4px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(80% 80% at 50% 40%, #000 40%, transparent 100%)',
          }}
        />

        {/* wordmark */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(145deg,#f0b756,#b9722a)',
              boxShadow: '0 6px 18px rgba(240,183,86,0.35)',
            }}
          >
            <Box component="svg" viewBox="0 0 24 24" sx={{ width: 22, height: 22 }} aria-hidden>
              <path
                d="M6 10a6 6 0 0 1 12 0v.5a3 3 0 0 1-1 5.6V18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1.9A3 3 0 0 1 6 10.5Z"
                fill="#fff"
              />
              <rect x="7" y="19.5" width="10" height="2.2" rx="1.1" fill="#fff" opacity="0.85" />
            </Box>
          </Box>
          <Typography
            sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: 22, letterSpacing: '0.2px' }}
          >
            SSPL&nbsp;Kitchen
          </Typography>
        </Stack>

        {/* centerpiece illustration */}
        <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', flexGrow: 1, py: 2 }}>
          <KitchenScene />
        </Box>

        {/* tagline */}
        <Box sx={{ position: 'relative', maxWidth: 380 }}>
          <Typography
            sx={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 500,
              fontSize: 30,
              lineHeight: 1.2,
              mb: 1.5,
            }}
          >
            Every meal,
            <br />
            measured &amp; managed.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14.5, lineHeight: 1.6 }}>
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
          p: { xs: 3, sm: 6 },
          bgcolor: '#f7f4ef',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* compact brand mark on small screens */}
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ display: { xs: 'flex', md: 'none' }, mb: 4 }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(145deg,#f0b756,#b9722a)',
              }}
            >
              <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20 }} aria-hidden>
                <path
                  d="M6 10a6 6 0 0 1 12 0v.5a3 3 0 0 1-1 5.6V18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1.9A3 3 0 0 1 6 10.5Z"
                  fill="#fff"
                />
              </Box>
            </Box>
            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: 19 }}>
              SSPL Kitchen
            </Typography>
          </Stack>

          <Typography
            sx={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 600,
              fontSize: 30,
              color: '#1b2420',
              mb: 0.5,
            }}
          >
            Welcome back
          </Typography>
          <Typography sx={{ color: '#6c7771', fontSize: 14.5, mb: 4 }}>
            Sign in to manage the mess operations.
          </Typography>

          <form onSubmit={submit}>
            <Stack spacing={2.25}>
              {err && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {err}
                </Alert>
              )}

              <Box>
                <Typography
                  component="label"
                  htmlFor="username"
                  sx={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#46514c', mb: 0.75 }}
                >
                  Username
                </Typography>
                <TextField
                  id="username"
                  fullWidth
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineRoundedIcon sx={{ fontSize: 20, color: '#9aa39e' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="password"
                  sx={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#46514c', mb: 0.75 }}
                >
                  Password
                </Typography>
                <TextField
                  id="password"
                  fullWidth
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ fontSize: 20, color: '#9aa39e' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />
              </Box>

              <Button
                type="submit"
                disabled={busy}
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
                  background: 'linear-gradient(145deg,#1565c0,#0f4c93)',
                  boxShadow: '0 10px 22px rgba(21,101,192,0.32)',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  '&:hover': {
                    background: 'linear-gradient(145deg,#1769cf,#0f4c93)',
                    boxShadow: '0 12px 26px rgba(21,101,192,0.42)',
                    transform: 'translateY(-1px)',
                  },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.8)', opacity: 0.7 },
                }}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>

          <Typography sx={{ mt: 4, fontSize: 12.5, color: '#9aa39e', textAlign: 'center' }}>
            SSPL Kitchen · Factory Mess Management
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#fff',
    fontSize: 15,
    '& fieldset': { borderColor: '#e2ddd3' },
    '&:hover fieldset': { borderColor: '#c9c2b4' },
    '&.Mui-focused fieldset': { borderColor: '#1565c0', borderWidth: 2 },
  },
  '& .MuiOutlinedInput-input': { py: 1.4 },
} as const;
