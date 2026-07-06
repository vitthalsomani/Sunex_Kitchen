import { useEffect, useState } from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { consumersApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { Consumer, ConsumerType } from '../types';

const TYPES: ConsumerType[] = ['contractor', 'service', 'company_group'];
const typeColor: Record<ConsumerType, 'default' | 'info' | 'secondary'> = {
  contractor: 'default',
  service: 'info',
  company_group: 'secondary',
};

export default function ConsumersPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'store_manager');
  const [rows, setRows] = useState<Consumer[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Consumer | null>(null);
  const [form, setForm] = useState<{ name: string; type: ConsumerType; billable: boolean; meal_rate: string; active: boolean }>({
    name: '',
    type: 'contractor',
    billable: false,
    meal_rate: '',
    active: true,
  });

  const reload = () => consumersApi.list().then(setRows);
  useEffect(() => {
    reload();
  }, []);

  const openDialog = (c?: Consumer) => {
    setEditing(c ?? null);
    setForm({
      name: c?.name ?? '',
      type: c?.type ?? 'contractor',
      billable: c?.billable ?? false,
      meal_rate: c?.meal_rate != null ? String(c.meal_rate) : '',
      active: c?.active ?? true,
    });
    setOpen(true);
  };
  const save = async () => {
    const p = {
      name: form.name,
      type: form.type,
      billable: form.billable,
      meal_rate: form.billable && form.meal_rate ? Number(form.meal_rate) : null,
      active: form.active,
    };
    if (editing) await consumersApi.update(editing.id, p);
    else await consumersApi.create(p);
    setOpen(false);
    reload();
  };
  const remove = async (id: string) => {
    if (window.confirm('Delete diner?')) {
      await consumersApi.remove(id);
      reload();
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Diners
        </Typography>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}>
            Add
          </Button>
        )}
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Charged</TableCell>
              <TableCell align="right">Meal Rate</TableCell>
              <TableCell>Active</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  <Chip size="small" color={typeColor[c.type]} label={c.type.replace('_', ' ')} />
                </TableCell>
                <TableCell>{c.billable ? 'Yes' : '—'}</TableCell>
                <TableCell align="right">{c.meal_rate != null ? `₹${c.meal_rate}` : '—'}</TableCell>
                <TableCell>{c.active ? 'Yes' : 'No'}</TableCell>
                {canEdit && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openDialog(c)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(c.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Diner' : 'Add Diner'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ConsumerType })}
            >
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} />
              <Typography>Charged for meals</Typography>
            </Stack>
            {form.billable && (
              <TextField
                label="Meal rate (₹/meal)"
                type="number"
                value={form.meal_rate}
                onChange={(e) => setForm({ ...form, meal_rate: e.target.value })}
              />
            )}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <Typography>Active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
