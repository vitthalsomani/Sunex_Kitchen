import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
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
import HistoryIcon from '@mui/icons-material/History';

import { storeApi } from '../api/endpoints';
import { tabularSx } from '../theme';
import type { StockBalance, StockMovement } from '../types';

export default function StockBalancesPage() {
  const [rows, setRows] = useState<StockBalance[]>([]);
  const [q, setQ] = useState('');
  const [ledgerItem, setLedgerItem] = useState<StockBalance | null>(null);
  const [ledger, setLedger] = useState<StockMovement[]>([]);

  useEffect(() => {
    storeApi.balances().then(setRows).catch(() => setRows([]));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.item_name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  const lowCount = rows.filter((r) => r.low).length;

  const openLedger = async (r: StockBalance) => {
    setLedgerItem(r);
    setLedger(await storeApi.ledger(r.item_id));
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={2}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Current Stock
        </Typography>
        {lowCount > 0 && <Chip color="warning" label={`${lowCount} running low`} />}
        <TextField size="small" placeholder="Search item…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Min</TableCell>
              <TableCell align="right">Max</TableCell>
              <TableCell align="right">History</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.item_id} hover selected={r.low}>
                <TableCell>{r.item_name}</TableCell>
                <TableCell>{r.category_name}</TableCell>
                <TableCell align="right">
                  <Typography sx={tabularSx} fontWeight={700} color={r.low ? 'warning.main' : 'text.primary'}>
                    {r.balance}
                  </Typography>
                </TableCell>
                <TableCell>{r.unit_name}</TableCell>
                <TableCell align="right" sx={tabularSx}>{r.min_stock ?? '—'}</TableCell>
                <TableCell align="right" sx={tabularSx}>{r.max_stock ?? '—'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openLedger(r)} title="View history">
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No items.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!ledgerItem} onClose={() => setLedgerItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>History — {ledgerItem?.item_name}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Source</TableCell>
                <TableCell align="right">In</TableCell>
                <TableCell align="right">Out</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ledger.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.date}</TableCell>
                  <TableCell>
                    <Chip size="small" label={m.source} />
                  </TableCell>
                  <TableCell align="right" sx={{ ...tabularSx, color: 'success.main' }}>
                    {m.direction === 'in' ? m.quantity : ''}
                  </TableCell>
                  <TableCell align="right" sx={{ ...tabularSx, color: 'error.main' }}>
                    {m.direction === 'out' ? m.quantity : ''}
                  </TableCell>
                  <TableCell align="right" sx={tabularSx}>{m.balance_after}</TableCell>
                </TableRow>
              ))}
              {ledger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" py={2}>
                      No movements.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
