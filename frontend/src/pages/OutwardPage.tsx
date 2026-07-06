import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

import { canteensApi, storeApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { NamedMaster, Outward, StockBalance } from '../types';

const inr = (n?: number | null) => (n != null ? '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—');
type Line = { item_id: string; quantity: string };

export default function OutwardPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'store_manager', 'data_entry');
  const [rows, setRows] = useState<Outward[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [canteens, setCanteens] = useState<NamedMaster[]>([]);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ date: dayjs().format('YYYY-MM-DD'), canteen_id: '', issued_by: '', note: '' });
  const [lines, setLines] = useState<Line[]>([{ item_id: '', quantity: '' }]);

  const reload = () => storeApi.listOutward({ month }).then(setRows);
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);
  useEffect(() => {
    storeApi.balances().then(setBalances);
    canteensApi.list().then(setCanteens);
  }, []);

  const balMap = Object.fromEntries(balances.map((b) => [b.item_id, b]));

  const save = async () => {
    setErr(null);
    const valid = lines
      .filter((l) => l.item_id && Number(l.quantity) > 0)
      .map((l) => ({ item_id: l.item_id, quantity: Number(l.quantity) }));
    if (!valid.length) {
      setErr('Add at least one item with quantity.');
      return;
    }
    try {
      await storeApi.outward({
        date: form.date,
        canteen_id: form.canteen_id || null,
        issued_by: form.issued_by || undefined,
        note: form.note || undefined,
        lines: valid,
      });
      setOpen(false);
      setLines([{ item_id: '', quantity: '' }]);
      reload();
      storeApi.balances().then(setBalances);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Save failed');
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={2}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Items Given Out
        </Typography>
        <TextField label="Month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} />
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setErr(null); setOpen(true); }}>
            Give Out Items
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Canteen</TableCell>
              <TableCell>Given By</TableCell>
              <TableCell align="right">Items</TableCell>
              <TableCell align="right">Cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell>{dayjs(o.date).format('DD MMM YYYY')}</TableCell>
                <TableCell>{o.canteen_name ?? '—'}</TableCell>
                <TableCell>{o.issued_by}</TableCell>
                <TableCell align="right">{o.lines.length}</TableCell>
                <TableCell align="right">{inr(o.total_cost)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" py={3}>
                    Nothing given out this month.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Give Out Items</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                label="Canteen (optional)"
                value={form.canteen_id}
                onChange={(e) => setForm({ ...form, canteen_id: e.target.value })}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">—</MenuItem>
                {canteens.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Given By"
                value={form.issued_by}
                onChange={(e) => setForm({ ...form, issued_by: e.target.value })}
              />
            </Stack>
            <Divider>Items</Divider>
            {lines.map((l, i) => {
              const bal = balMap[l.item_id];
              return (
                <Stack direction="row" spacing={1} key={i} alignItems="center">
                  <Autocomplete
                    sx={{ flexGrow: 1 }}
                    size="small"
                    options={balances}
                    getOptionLabel={(o) => `${o.item_name} (${o.balance} ${o.unit_name ?? ''})`}
                    value={bal ?? null}
                    onChange={(_, v) => setLines(lines.map((x, j) => (j === i ? { ...x, item_id: v?.item_id ?? '' } : x)))}
                    renderInput={(p) => <TextField {...p} label="Item" />}
                  />
                  <TextField
                    label="Qty"
                    type="number"
                    size="small"
                    value={l.quantity}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                    sx={{ width: 90 }}
                    helperText={bal ? `avail ${bal.balance}` : ' '}
                  />
                  <IconButton size="small" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              );
            })}
            <Button startIcon={<AddIcon />} onClick={() => setLines([...lines, { item_id: '', quantity: '' }])}>
              Add line
            </Button>
            <TextField label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>
            Give Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
