import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

import { itemsApi, purchasesApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { Item, Purchase } from '../types';

export default function PurchasesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'data_entry');
  const canDelete = hasRole('admin');

  const [items, setItems] = useState<Item[]>([]);
  const [rows, setRows] = useState<Purchase[]>([]);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>('');
  const [vendor, setVendor] = useState('');
  const [billRef, setBillRef] = useState('');
  const [notes, setNotes] = useState('');

  const reload = async () => {
    const [it, ps] = await Promise.all([itemsApi.list(), purchasesApi.list({ month })]);
    setItems(it.filter((x) => x.active));
    setRows(ps);
  };

  useEffect(() => {
    reload();
  }, [month]);

  const openCreate = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
    setItemId('');
    setQty('');
    setRate('');
    setVendor('');
    setBillRef('');
    setNotes('');
    setOpen(true);
  };

  const save = async () => {
    await purchasesApi.create({
      date,
      item_id: itemId,
      quantity: Number(qty),
      rate: Number(rate),
      vendor: vendor || undefined,
      bill_ref: billRef || undefined,
      notes: notes || undefined,
    } as Omit<Purchase, 'id' | 'amount' | 'item_name' | 'category_name' | 'unit_name'>);
    setOpen(false);
    await reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this purchase?')) return;
    await purchasesApi.remove(id);
    await reload();
  };

  const total = rows.reduce((acc, r) => acc + r.amount, 0);

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={2}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Purchases
        </Typography>
        <TextField
          type="month"
          label="Month"
          InputLabelProps={{ shrink: true }}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          size="small"
        />
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Purchase
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Bill #</TableCell>
              {canDelete && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{dayjs(r.date).format('DD MMM YYYY')}</TableCell>
                <TableCell>{r.item_name}</TableCell>
                <TableCell>{r.category_name}</TableCell>
                <TableCell align="right">{r.quantity}</TableCell>
                <TableCell>{r.unit_name}</TableCell>
                <TableCell align="right">{r.rate.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{r.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>{r.vendor}</TableCell>
                <TableCell>{r.bill_ref}</TableCell>
                {canDelete && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => remove(r.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canDelete ? 10 : 9} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No purchases for this month</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {rows.length > 0 && (
              <TableRow>
                <TableCell colSpan={6} align="right">
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{total.toLocaleString('en-IN')}</strong>
                </TableCell>
                <TableCell colSpan={canDelete ? 3 : 2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Purchase</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextField select label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              {items.map((i) => (
                <MenuItem key={i.id} value={i.id}>
                  {i.name} ({i.category_name} / {i.unit_name})
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                type="number"
                label="Quantity"
                value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                type="number"
                label="Rate"
                value={rate}
                onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Amount: {qty !== '' && rate !== '' ? (Number(qty) * Number(rate)).toLocaleString('en-IN') : '—'}
            </Typography>
            <TextField label="Vendor (optional)" value={vendor} onChange={(e) => setVendor(e.target.value)} />
            <TextField label="Bill Ref (optional)" value={billRef} onChange={(e) => setBillRef(e.target.value)} />
            <TextField
              label="Notes (optional)"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!itemId || qty === '' || rate === ''}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
