import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

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
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="background.default">
      <Card sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            SSPL Kitchen
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" mb={3}>
            Sign in to continue
          </Typography>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              {err && <Alert severity="error">{err}</Alert>}
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
