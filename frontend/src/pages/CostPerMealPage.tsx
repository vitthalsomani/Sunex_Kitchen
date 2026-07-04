import { useEffect, useState } from 'react';
import {
  Alert,
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
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import dayjs from 'dayjs';

import { analyticsApi } from '../api/endpoints';
import { downloadCsv } from '../api/download';
import type { CostPerMealRow } from '../types';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function CostPerMealPage() {
  const [from, setFrom] = useState(dayjs().subtract(5, 'month').format('YYYY-MM'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState<CostPerMealRow[]>([]);

  const run = () => analyticsApi.costPerMeal(from, to).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => downloadCsv('/analytics/export/cost-per-meal.csv', 'cost-per-meal.csv', { from, to });

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={1}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Cost per Meal
        </Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>
          CSV
        </Button>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
          Print
        </Button>
      </Stack>
      <Alert severity="info" sx={{ mb: 2 }}>
        Food cost is the FIFO cost of stock <b>issued</b> that month. Historical issues carry no cost
        (legacy receipts had no rates), so past cost-per-meal shows ₹0 — real figures accrue as
        invoices → issues flow through the new system.
      </Alert>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField label="From (YYYY-MM)" size="small" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="To (YYYY-MM)" size="small" value={to} onChange={(e) => setTo(e.target.value)} />
        <Typography
          onClick={run}
          sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 700 }}
        >
          Run
        </Typography>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Meals</TableCell>
              <TableCell align="right">Food Cost</TableCell>
              <TableCell align="right">Cost / Meal</TableCell>
              <TableCell align="right">Purchases</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.month} hover>
                <TableCell>{r.month}</TableCell>
                <TableCell align="right">{r.meals.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{inr(r.food_cost)}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight={700} color="primary.main">
                    {inr(r.cost_per_meal)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{inr(r.purchases_value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
