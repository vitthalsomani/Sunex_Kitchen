import { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import { itemCategoriesApi, itemsApi, unitsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import type { Item, NamedMaster } from '../types';

export default function ItemsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin');
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<NamedMaster[]>([]);
  const [units, setUnits] = useState<NamedMaster[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [active, setActive] = useState(true);

  const reload = async () => {
    const [i, c, u] = await Promise.all([itemsApi.list(), itemCategoriesApi.list(), unitsApi.list()]);
    setItems(i);
    setCats(c);
    setUnits(u);
  };

  useEffect(() => {
    reload();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCategoryId('');
    setUnitId('');
    setActive(true);
    setOpen(true);
  };
  const openEdit = (it: Item) => {
    setEditing(it);
    setName(it.name);
    setCategoryId(it.category_id);
    setUnitId(it.unit_id);
    setActive(it.active);
    setOpen(true);
  };

  const save = async () => {
    if (editing) {
      await itemsApi.update(editing.id, { name, category_id: categoryId, unit_id: unitId, active });
    } else {
      await itemsApi.create({ name, category_id: categoryId, unit_id: unitId, active });
    }
    setOpen(false);
    await reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    await itemsApi.remove(id);
    await reload();
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Items
        </Typography>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Item
          </Button>
        )}
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Active</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id} hover>
                <TableCell>{it.name}</TableCell>
                <TableCell>{it.category_name}</TableCell>
                <TableCell>{it.unit_name}</TableCell>
                <TableCell>{it.active ? 'Yes' : 'No'}</TableCell>
                {canEdit && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(it)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(it.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No items yet. Add a category + unit first.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Item' : 'Add Item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField
              select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {cats.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
            >
              {units.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
              <Typography>Active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!name || !categoryId || !unitId} onClick={save}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
