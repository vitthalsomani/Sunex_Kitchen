import { useEffect, useState } from 'react';
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';

import { auditApi } from '../api/endpoints';
import { PageHeader } from '../components/ui';
import type { AuditEntry } from '../api/endpoints';

const methodColor: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  POST: 'success',
  PUT: 'info',
  PATCH: 'warning',
  DELETE: 'error',
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  useEffect(() => {
    auditApi.list(300).then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <PageHeader overline="Staff" title="Activity Log" subtitle="Recent create / update / delete actions" />
      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Section</TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.ts ? dayjs(r.ts).format('DD MMM HH:mm:ss') : '—'}</TableCell>
                <TableCell>{r.user ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" color={methodColor[r.method] ?? 'default'} label={r.method} />
                </TableCell>
                <TableCell>
                  <code>{r.path.replace('/api', '')}</code>
                </TableCell>
                <TableCell align="right">{r.status}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" py={3}>
                    No activity recorded yet.
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
