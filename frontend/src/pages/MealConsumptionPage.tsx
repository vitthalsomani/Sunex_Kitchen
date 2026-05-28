import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import dayjs from 'dayjs';

import { companyGroupsApi, contractorsApi, mealApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { MealConsumption, NamedMaster } from '../types';

const SHIFTS = ['Breakfast', 'Lunch', 'Dinner'] as const;

export default function MealConsumptionPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'data_entry');

  const [contractors, setContractors] = useState<NamedMaster[]>([]);
  const [groups, setGroups] = useState<NamedMaster[]>([]);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [shift, setShift] = useState<(typeof SHIFTS)[number]>('Breakfast');
  const [contractorCounts, setContractorCounts] = useState<Record<string, number>>({});
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [recent, setRecent] = useState<MealConsumption[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, g] = await Promise.all([contractorsApi.list(), companyGroupsApi.list()]);
      setContractors(c.filter((x) => x.active));
      setGroups(g.filter((x) => x.active));
    })();
  }, []);

  const loadExisting = async (d: string, s: string) => {
    const list = await mealApi.list({ from: d, to: d });
    const match = list.find((r) => r.shift === s);
    setContractorCounts(
      Object.fromEntries((match?.contractor_counts ?? []).map((e) => [e.ref_id, e.count])),
    );
    setGroupCounts(Object.fromEntries((match?.company_counts ?? []).map((e) => [e.ref_id, e.count])));
    setNotes(match?.notes ?? '');
  };

  useEffect(() => {
    loadExisting(date, shift);
  }, [date, shift]);

  const loadRecent = async () => {
    const list = await mealApi.list({ month: dayjs(date).format('YYYY-MM') });
    setRecent(list);
  };
  useEffect(() => {
    loadRecent();
  }, [date]);

  const total = useMemo(
    () =>
      Object.values(contractorCounts).reduce((a, b) => a + (Number(b) || 0), 0) +
      Object.values(groupCounts).reduce((a, b) => a + (Number(b) || 0), 0),
    [contractorCounts, groupCounts],
  );

  const save = async () => {
    try {
      await mealApi.upsert({
        date,
        shift,
        contractor_counts: Object.entries(contractorCounts)
          .filter(([, v]) => v > 0)
          .map(([ref_id, count]) => ({ ref_id, count: Number(count) })),
        company_counts: Object.entries(groupCounts)
          .filter(([, v]) => v > 0)
          .map(([ref_id, count]) => ({ ref_id, count: Number(count) })),
        notes: notes || undefined,
      });
      setMsg('Saved.');
      await loadRecent();
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMsg(m || 'save failed');
    }
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Daily Meal Consumption
      </Typography>
      {msg && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
                <TextField
                  type="date"
                  label="Date"
                  InputLabelProps={{ shrink: true }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <TextField select label="Shift" value={shift} onChange={(e) => setShift(e.target.value as typeof shift)}>
                  {SHIFTS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
                <Box flexGrow={1} />
                <Box display="flex" alignItems="center">
                  <Typography variant="h6" color="primary">
                    Total: {total}
                  </Typography>
                </Box>
                {canEdit && (
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
                    Save
                  </Button>
                )}
              </Stack>
              <Divider />

              <Typography variant="h6" mt={2}>
                Contractors
              </Typography>
              <Grid container spacing={2} mt={0}>
                {contractors.length === 0 && (
                  <Grid item xs={12}>
                    <Typography color="text.secondary">Add contractors first.</Typography>
                  </Grid>
                )}
                {contractors.map((c) => (
                  <Grid item xs={6} sm={4} md={3} key={c.id}>
                    <TextField
                      fullWidth
                      type="number"
                      label={c.name}
                      size="small"
                      disabled={!canEdit}
                      value={contractorCounts[c.id] ?? ''}
                      onChange={(e) =>
                        setContractorCounts({
                          ...contractorCounts,
                          [c.id]: Number(e.target.value) || 0,
                        })
                      }
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="h6" mt={3}>
                Company Side
              </Typography>
              <Grid container spacing={2}>
                {groups.length === 0 && (
                  <Grid item xs={12}>
                    <Typography color="text.secondary">Add company groups first.</Typography>
                  </Grid>
                )}
                {groups.map((g) => (
                  <Grid item xs={6} sm={4} md={3} key={g.id}>
                    <TextField
                      fullWidth
                      type="number"
                      label={g.name}
                      size="small"
                      disabled={!canEdit}
                      value={groupCounts[g.id] ?? ''}
                      onChange={(e) =>
                        setGroupCounts({ ...groupCounts, [g.id]: Number(e.target.value) || 0 })
                      }
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                ))}
              </Grid>

              <TextField
                fullWidth
                label="Notes (optional)"
                multiline
                rows={2}
                sx={{ mt: 3 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            {dayjs(date).format('MMM YYYY')} — Recent
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recent.slice(0, 30).map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{dayjs(r.date).format('DD MMM')}</TableCell>
                    <TableCell>{r.shift}</TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                  </TableRow>
                ))}
                {recent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No records this month
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </>
  );
}
