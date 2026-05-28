import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

import { monthlyExpensesApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { MonthlyExpense } from '../types';

export default function MonthlyExpensesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'data_entry');
  const canDelete = hasRole('admin');
  const [list, setList] = useState<MonthlyExpense[]>([]);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [manpower, setManpower] = useState<number | ''>('');
  const [contractor, setContractor] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const reload = async () => setList(await monthlyExpensesApi.list());

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    const exist = list.find((e) => e.month === month);
    setManpower(exist?.manpower_salary ?? '');
    setContractor(exist?.contractor_payment ?? '');
    setNotes(exist?.notes ?? '');
  }, [month, list]);

  const save = async () => {
    try {
      await monthlyExpensesApi.upsert({
        month,
        manpower_salary: Number(manpower) || 0,
        contractor_payment: Number(contractor) || 0,
        notes: notes || undefined,
      });
      setMsg('Saved.');
      await reload();
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMsg(m || 'save failed');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this monthly expense entry?')) return;
    await monthlyExpensesApi.remove(id);
    await reload();
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Monthly Expenses (Manpower + Contractor)
      </Typography>
      {msg && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              type="month"
              label="Month"
              InputLabelProps={{ shrink: true }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <TextField
              type="number"
              label="Manpower Salary (₹)"
              value={manpower}
              onChange={(e) => setManpower(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={!canEdit}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              type="number"
              label="Contractor Payment (₹)"
              value={contractor}
              onChange={(e) => setContractor(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={!canEdit}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
            {canEdit && (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
                Save
              </Button>
            )}
          </Stack>
          <TextField
            sx={{ mt: 2 }}
            label="Notes (optional)"
            fullWidth
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Manpower Salary</TableCell>
              <TableCell align="right">Contractor Payment</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Notes</TableCell>
              {canDelete && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell>{e.month}</TableCell>
                <TableCell align="right">{e.manpower_salary.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{e.contractor_payment.toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">
                  {(e.manpower_salary + e.contractor_payment).toLocaleString('en-IN')}
                </TableCell>
                <TableCell>{e.notes}</TableCell>
                {canDelete && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => remove(e.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={canDelete ? 6 : 5} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No monthly expense entries yet</Typography>
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
