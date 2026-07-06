import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

import { storeApi } from '../api/endpoints';
import { api } from '../api/client';
import { tabularSx } from '../theme';
import type { Valuation } from '../types';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ValuationPage() {
  const [rows, setRows] = useState<Valuation[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    storeApi.valuation().then(setRows).catch(() => setRows([]));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.item_name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  const total = rows.reduce((s, r) => s + r.value, 0);
  const valuedCount = rows.filter((r) => r.value > 0).length;

  const download = async () => {
    const res = await api.get('/analytics/export/valuation.csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valuation.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={2}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Stock Value
        </Typography>
        <TextField size="small" placeholder="Search item…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={download}>
          Export CSV
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={4}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Stock Value
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={tabularSx} color="primary.main">
              {inr(total)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Items Priced
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={tabularSx}>
              {valuedCount} / {rows.filter((r) => r.balance > 0).length}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="right">Priced Qty</TableCell>
              <TableCell align="right">Avg Cost</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.item_id} hover>
                <TableCell>{r.item_name}</TableCell>
                <TableCell align="right" sx={tabularSx}>
                  {r.balance} {r.unit_name}
                </TableCell>
                <TableCell align="right" sx={tabularSx}>
                  {r.costed_qty}
                </TableCell>
                <TableCell align="right" sx={tabularSx}>
                  {r.avg_cost ? inr(r.avg_cost) : '—'}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    sx={tabularSx}
                    fontWeight={r.value ? 700 : 400}
                    color={r.value ? 'text.primary' : 'text.secondary'}
                  >
                    {r.value ? inr(r.value) : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>
                <Typography fontWeight={700}>Total</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={tabularSx} fontWeight={700} color="primary.main">
                  {inr(total)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </>
  );
}
