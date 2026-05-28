import { useState } from 'react';
import {
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
import dayjs from 'dayjs';

import { reportsApi } from '../api/endpoints';
import type { MonthlyReportRow } from '../types';

export default function ReportPage() {
  const [from, setFrom] = useState(dayjs().subtract(5, 'month').format('YYYY-MM'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState<MonthlyReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setRows(await reportsApi.costAnalysis(from, to));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Monthly Mess Cost Analysis
      </Typography>
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          type="month"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          type="month"
          label="To"
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button variant="contained" onClick={run} disabled={loading}>
          {loading ? 'Loading…' : 'Run'}
        </Button>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Total Meals</TableCell>
              <TableCell align="right">Gas & Coal</TableCell>
              <TableCell align="right">Grocery & Veg</TableCell>
              <TableCell align="right">Oil</TableCell>
              <TableCell align="right">Other</TableCell>
              <TableCell align="right">Manpower</TableCell>
              <TableCell align="right">Contractor</TableCell>
              <TableCell align="right">Total Expense</TableCell>
              <TableCell align="right" sx={{ bgcolor: 'success.light' }}>
                Cost / Meal
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.month} hover>
                <TableCell>{r.month}</TableCell>
                <TableCell align="right">{r.total_meals.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{r.gas_coal_expense.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{r.grocery_veg_expense.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{r.oil_expense.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{r.other_category_expense.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{r.manpower_salary.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{r.contractor_payment.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">
                  <strong>{r.total_expense.toLocaleString('en-IN')}</strong>
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: 'success.light' }}>
                  <strong>{r.cost_per_meal.toLocaleString('en-IN')}</strong>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography color="text.secondary" py={3}>
                    Choose a date range and click Run.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
