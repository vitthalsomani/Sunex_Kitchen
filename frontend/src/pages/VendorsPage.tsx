import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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

import { vendorsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { Vendor } from '../types';

export default function VendorsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'store_manager');
  const [rows, setRows] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', active: true });

  const reload = () => vendorsApi.list().then(setRows);
  useEffect(() => {
    reload();
  }, []);

  const openDialog = (v?: Vendor) => {
    setEditing(v ?? null);
    setForm({ name: v?.name ?? '', phone: v?.phone ?? '', address: v?.address ?? '', active: v?.active ?? true });
    setOpen(true);
  };
  const save = async () => {
    const p = { name: form.name, phone: form.phone || null, address: form.address || null, active: form.active };
    if (editing) await vendorsApi.update(editing.id, p);
    else await vendorsApi.create(p);
    setOpen(false);
    reload();
  };
  const remove = async (id: string) => {
    if (window.confirm('Delete supplier?')) {
      await vendorsApi.remove(id);
      reload();
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Suppliers
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
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Active</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>{v.name}</TableCell>
                <TableCell>{v.phone}</TableCell>
                <TableCell>{v.address}</TableCell>
                <TableCell>{v.active ? 'Yes' : 'No'}</TableCell>
                {canEdit && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openDialog(v)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(v.id)}>
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
        <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} multiline />
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
