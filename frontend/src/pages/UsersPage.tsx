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

import { usersApi } from '../api/endpoints';
import type { Role, User } from '../types';

const ROLES: Role[] = ['admin', 'data_entry', 'viewer'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('data_entry');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(true);

  const reload = async () => setUsers(await usersApi.list());

  useEffect(() => {
    reload();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setUsername('');
    setFullName('');
    setRole('data_entry');
    setEmail('');
    setPassword('');
    setActive(true);
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setRole(u.role);
    setEmail(u.email ?? '');
    setPassword('');
    setActive(u.active);
    setOpen(true);
  };

  const save = async () => {
    if (editing) {
      await usersApi.update(editing.id, {
        full_name: fullName,
        role,
        email: email || null,
        active,
        ...(password ? { password } : {}),
      });
    } else {
      await usersApi.create({
        username,
        full_name: fullName,
        role,
        email: email || null,
        password,
        active,
      });
    }
    setOpen(false);
    await reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    await usersApi.remove(id);
    await reload();
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Users
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add User
        </Button>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Active</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.full_name}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.email ?? ''}</TableCell>
                <TableCell>{u.active ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(u)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => remove(u.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box py={3}>
                    <Typography color="text.secondary">No users yet</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!!editing}
              required
            />
            <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              type="password"
              label={editing ? 'Password (leave blank to keep)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!editing}
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
              <Typography>Active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!username || !fullName || (!editing && !password)}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
