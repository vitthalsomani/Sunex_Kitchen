import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
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

import { invoicesApi, itemsApi, uploadsApi, vendorsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { tabularSx } from '../theme';
import type { Item, PurchaseInvoice, Vendor } from '../types';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
type Line = { item_id: string; quantity: string; rate: string };

export default function InvoicesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'purchase', 'data_entry');
  const [rows, setRows] = useState<PurchaseInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    vendor_id: '',
    invoice_date: dayjs().format('YYYY-MM-DD'),
    invoice_number: '',
    invoice_photo: '',
    remarks: '',
  });
  const [lines, setLines] = useState<Line[]>([{ item_id: '', quantity: '', rate: '' }]);

  const reload = () => invoicesApi.list({ month }).then(setRows);
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);
  useEffect(() => {
    vendorsApi.list().then(setVendors);
    itemsApi.list().then(setItems);
  }, []);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0),
    [lines],
  );

  const openDialog = () => {
    setForm({ vendor_id: '', invoice_date: dayjs().format('YYYY-MM-DD'), invoice_number: '', invoice_photo: '', remarks: '' });
    setLines([{ item_id: '', quantity: '', rate: '' }]);
    setErr(null);
    setOpen(true);
  };

  const save = async () => {
    setErr(null);
    const validLines = lines
      .filter((l) => l.item_id && Number(l.quantity) > 0 && Number(l.rate) >= 0)
      .map((l) => ({ item_id: l.item_id, quantity: Number(l.quantity), rate: Number(l.rate) }));
    if (!form.vendor_id || !validLines.length) {
      setErr('Pick a vendor and at least one valid line.');
      return;
    }
    try {
      await invoicesApi.create({
        vendor_id: form.vendor_id,
        invoice_date: form.invoice_date,
        invoice_number: form.invoice_number || undefined,
        invoice_photo: form.invoice_photo || undefined,
        remarks: form.remarks || undefined,
        lines: validLines,
      });
      setOpen(false);
      reload();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Save failed');
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={2}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Purchase Invoices
        </Typography>
        <TextField label="Month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} />
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
            New Invoice
          </Button>
        )}
      </Stack>
      <Alert severity="success" sx={{ mb: 2 }}>
        This replaces the “Kitchen Material Inward” Google Form. Posting an invoice automatically
        adds the items to store stock and creates FIFO cost layers.
      </Alert>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Invoice #</TableCell>
              <TableCell align="right">Lines</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={tabularSx}>{dayjs(inv.invoice_date).format('DD MMM YYYY')}</TableCell>
                <TableCell>{inv.vendor_name}</TableCell>
                <TableCell sx={tabularSx}>{inv.invoice_number}</TableCell>
                <TableCell align="right" sx={tabularSx}>{inv.lines.length}</TableCell>
                <TableCell align="right">
                  <Typography sx={tabularSx} fontWeight={700}>{inr(inv.total)}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No invoices this month.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Purchase Invoice</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} mt={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Vendor"
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                sx={{ minWidth: 220 }}
                required
              >
                {vendors.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Invoice Date"
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Invoice #"
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
              />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" component="label" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload Invoice Photo'}
                <input
                  hidden
                  type="file"
                  accept="image/*,.pdf"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    try {
                      const res = await uploadsApi.upload(f);
                      setForm((prev) => ({ ...prev, invoice_photo: res.url }));
                    } catch {
                      setErr('Upload failed');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </Button>
              {form.invoice_photo &&
                (/\.pdf$/i.test(form.invoice_photo) ? (
                  <a href={form.invoice_photo} target="_blank" rel="noreferrer">
                    View PDF
                  </a>
                ) : (
                  <Box
                    component="img"
                    src={form.invoice_photo}
                    alt="invoice"
                    sx={{ height: 48, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  />
                ))}
            </Stack>

            <Divider>Line Items</Divider>
            {lines.map((l, i) => {
              const amount = (Number(l.quantity) || 0) * (Number(l.rate) || 0);
              return (
                <Stack direction="row" spacing={1} key={i} alignItems="center">
                  <TextField
                    select
                    label="Item"
                    value={l.item_id}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, item_id: e.target.value } : x)))}
                    sx={{ flexGrow: 1, minWidth: 200 }}
                    size="small"
                  >
                    {items.map((it) => (
                      <MenuItem key={it.id} value={it.id}>
                        {it.name} {it.unit_name ? `(${it.unit_name})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Qty"
                    type="number"
                    size="small"
                    value={l.quantity}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                    sx={{ width: 90 }}
                  />
                  <TextField
                    label="Rate"
                    type="number"
                    size="small"
                    value={l.rate}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))}
                    sx={{ width: 100 }}
                  />
                  <Typography sx={{ width: 100, textAlign: 'right' }}>{inr(amount)}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              );
            })}
            <Button startIcon={<AddIcon />} onClick={() => setLines([...lines, { item_id: '', quantity: '', rate: '' }])}>
              Add line
            </Button>

            <Stack direction="row" justifyContent="flex-end">
              <Typography variant="h6" fontWeight={800}>
                Total: {inr(total)}
              </Typography>
            </Stack>
            <TextField
              label="Remarks"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              multiline
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>
            Post Invoice
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
