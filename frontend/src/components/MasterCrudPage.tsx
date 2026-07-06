import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
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
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UploadIcon from '@mui/icons-material/Upload';
import AddIcon from '@mui/icons-material/Add';

import { useAuth } from '../context/AuthContext';
import type { BulkUploadResult, NamedMaster } from '../types';

interface MasterApi {
  list: () => Promise<NamedMaster[]>;
  create: (p: { name: string; code?: string; active?: boolean }) => Promise<NamedMaster>;
  update: (id: string, p: Partial<NamedMaster>) => Promise<NamedMaster>;
  remove: (id: string) => Promise<unknown>;
  bulkUpload: (f: File) => Promise<BulkUploadResult>;
}

export default function MasterCrudPage({
  title,
  api,
  showCode = true,
  uploadHint = 'CSV with a "name" column (or single-column CSV)',
}: {
  title: string;
  api: MasterApi;
  showCode?: boolean;
  uploadHint?: string;
}) {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin');
  const [rows, setRows] = useState<NamedMaster[]>([]);
  const [editing, setEditing] = useState<NamedMaster | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => setRows(await api.list());

  useEffect(() => {
    reload();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setActive(true);
    setOpen(true);
  };
  const openEdit = (r: NamedMaster) => {
    setEditing(r);
    setName(r.name);
    setCode(r.code ?? '');
    setActive(r.active);
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.update(editing.id, { name, code: code || undefined, active });
      } else {
        await api.create({ name, code: code || undefined, active });
      }
      setOpen(false);
      await reload();
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMsg(m || 'save failed');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this record?')) return;
    await api.remove(id);
    await reload();
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await api.bulkUpload(f);
      setMsg(`Inserted ${res.inserted}, skipped ${res.skipped}` + (res.errors.length ? `, errors: ${res.errors.length}` : ''));
      await reload();
    } catch (e2: unknown) {
      const m = (e2 as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMsg(m || 'upload failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Tooltip title={uploadHint}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileRef.current?.click()}
              >
                Upload CSV
              </Button>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={upload} />
          </Stack>
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
              <TableCell>Name</TableCell>
              {showCode && <TableCell>Code</TableCell>}
              <TableCell>Active</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                {showCode && <TableCell>{r.code ?? ''}</TableCell>}
                <TableCell>{r.active ? 'Yes' : 'No'}</TableCell>
                {canEdit && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(r.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 3} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No records yet</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            {showCode && (
              <TextField label="Code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
            )}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
              <Typography>Active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
