import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';

import { consumersApi, consumptionApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { Consumer, Shift } from '../types';

const SHIFTS: Shift[] = ['Breakfast', 'Lunch', 'Dinner'];

export default function ConsumptionPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'canteen_incharge', 'data_entry');
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [shift, setShift] = useState<Shift>('Lunch');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    consumersApi.list().then((c) => setConsumers(c.filter((x) => x.active)));
  }, []);

  const load = async () => {
    setMsg(null);
    const list = await consumptionApi.list({ from: date, to: date });
    const rec = list.find((r) => r.shift === shift);
    const map: Record<string, string> = {};
    rec?.lines.forEach((l) => {
      if (l.count) map[l.consumer_id] = String(l.count);
    });
    setCounts(map);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shift]);

  const total = useMemo(
    () => Object.values(counts).reduce((s, v) => s + (Number(v) || 0), 0),
    [counts],
  );

  const save = async () => {
    const lines = consumers
      .filter((c) => Number(counts[c.id]) > 0)
      .map((c) => ({ consumer_id: c.id, count: Number(counts[c.id]) }));
    await consumptionApi.upsert({ date, shift, lines });
    setMsg(`Saved — ${total} meals for ${shift} on ${date}.`);
  };

  return (
    <>
      <Typography variant="h4" fontWeight={800} mb={2}>
        Daily Meals
      </Typography>
      <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap">
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField select label="Shift" value={shift} onChange={(e) => setShift(e.target.value as Shift)} size="small" sx={{ minWidth: 140 }}>
          {SHIFTS.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <Chip color="primary" label={`Total: ${total} meals`} sx={{ fontWeight: 700 }} />
        {canEdit && (
          <Button variant="contained" onClick={save}>
            Save
          </Button>
        )}
      </Stack>
      {msg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={1}>
          {consumers.map((c) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={c.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label={c.name}
                  type="number"
                  size="small"
                  fullWidth
                  disabled={!canEdit}
                  value={counts[c.id] ?? ''}
                  onChange={(e) => setCounts({ ...counts, [c.id]: e.target.value })}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </>
  );
}
