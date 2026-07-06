import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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

import { itemsApi, stockApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { StockRow } from '../types';

interface RowState {
  item_id: string;
  item_name: string;
  category_name: string;
  unit_name: string;
  opening_qty: number;
  opening_value: number;
  closing_qty: number;
  closing_value: number;
  purchase_qty: number;
  purchase_value: number;
}

export default function StockPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'data_entry');
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState<RowState[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = async () => {
    const [items, stock] = await Promise.all([itemsApi.list(), stockApi.list(month)]);
    const byItem: Record<string, StockRow> = {};
    stock.forEach((s) => (byItem[s.item_id] = s));
    setRows(
      items
        .filter((i) => i.active)
        .map<RowState>((i) => {
          const s = byItem[i.id];
          return {
            item_id: i.id,
            item_name: i.name,
            category_name: i.category_name ?? '',
            unit_name: i.unit_name ?? '',
            opening_qty: s?.opening_qty ?? 0,
            opening_value: s?.opening_value ?? 0,
            closing_qty: s?.closing_qty ?? 0,
            closing_value: s?.closing_value ?? 0,
            purchase_qty: s?.purchase_qty ?? 0,
            purchase_value: s?.purchase_value ?? 0,
          };
        }),
    );
  };

  useEffect(() => {
    reload();
  }, [month]);

  const updateField = (idx: number, field: keyof RowState, value: number) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const saveAll = async () => {
    try {
      await Promise.all(
        rows
          .filter(
            (r) => r.opening_qty || r.opening_value || r.closing_qty || r.closing_value,
          )
          .map((r) =>
            stockApi.upsert({
              month,
              item_id: r.item_id,
              opening_qty: r.opening_qty,
              opening_value: r.opening_value,
              closing_qty: r.closing_qty,
              closing_value: r.closing_value,
            }),
          ),
      );
      setMsg('Saved.');
      await reload();
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMsg(m || 'save failed');
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={2}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Monthly Stock Count
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
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveAll}>
            Save All
          </Button>
        )}
      </Stack>
      {msg && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Opening Qty</TableCell>
              <TableCell align="right">Opening Value</TableCell>
              <TableCell align="right">Purchases Qty</TableCell>
              <TableCell align="right">Purchases Value</TableCell>
              <TableCell align="right">Closing Qty</TableCell>
              <TableCell align="right">Closing Value</TableCell>
              <TableCell align="right">Used Qty</TableCell>
              <TableCell align="right">Used Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => {
              const consQty = r.opening_qty + r.purchase_qty - r.closing_qty;
              const consVal = r.opening_value + r.purchase_value - r.closing_value;
              return (
                <TableRow key={r.item_id} hover>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell>{r.category_name}</TableCell>
                  <TableCell>{r.unit_name}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={r.opening_qty}
                      disabled={!canEdit}
                      onChange={(e) => updateField(idx, 'opening_qty', Number(e.target.value) || 0)}
                      sx={{ width: 90 }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={r.opening_value}
                      disabled={!canEdit}
                      onChange={(e) => updateField(idx, 'opening_value', Number(e.target.value) || 0)}
                      sx={{ width: 110 }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell align="right">{r.purchase_qty}</TableCell>
                  <TableCell align="right">{r.purchase_value.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={r.closing_qty}
                      disabled={!canEdit}
                      onChange={(e) => updateField(idx, 'closing_qty', Number(e.target.value) || 0)}
                      sx={{ width: 90 }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={r.closing_value}
                      disabled={!canEdit}
                      onChange={(e) => updateField(idx, 'closing_value', Number(e.target.value) || 0)}
                      sx={{ width: 110 }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell align="right">{consQty.toFixed(2)}</TableCell>
                  <TableCell align="right">{consVal.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No items defined yet</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
