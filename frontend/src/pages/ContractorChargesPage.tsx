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
  TableFooter,
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
import { tabularSx } from '../theme';
import type { ContractorChargeRow } from '../types';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ContractorChargesPage() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState<ContractorChargeRow[]>([]);

  const run = () => analyticsApi.contractorCharges(month).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  const exportCsv = () =>
    downloadCsv('/analytics/export/contractor-charges.csv', `contractor-charges-${month}.csv`, { month });

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2} spacing={1}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Contractor Meal Back-charge
        </Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!rows.length}>
          CSV
        </Button>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
          Print
        </Button>
      </Stack>
      {rows.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No billable consumers found for this month. Mark a consumer as “back-charged” with a meal
          rate on the Consumers page to bill them here.
        </Alert>
      )}
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField label="Month (YYYY-MM)" size="small" value={month} onChange={(e) => setMonth(e.target.value)} />
        <Typography onClick={run} sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 700 }}>
          Run
        </Typography>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Consumer</TableCell>
              <TableCell align="right">Meals</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.consumer_id} hover>
                <TableCell>{r.consumer_name}</TableCell>
                <TableCell align="right" sx={tabularSx}>{r.meals.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right" sx={tabularSx}>{inr(r.meal_rate)}</TableCell>
                <TableCell align="right">
                  <Typography sx={tabularSx} fontWeight={700}>{inr(r.amount)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography fontWeight={700}>Total to back-charge</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography sx={tabularSx} fontWeight={700} color="primary.main">
                    {inr(total)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </>
  );
}
