import { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

import { staffApi } from '../api/endpoints';
import { PageHeader } from '../components/ui';
import type { Staff } from '../types';

export default function StaffPage() {
  const [rows, setRows] = useState<Staff[]>([]);
  useEffect(() => {
    staffApi.list().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <PageHeader overline="Masters" title="Canteen Staff" />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Canteen</TableCell>
              <TableCell>Occupation</TableCell>
              <TableCell>Shift Time</TableCell>
              <TableCell>Rest Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.canteen_name}</TableCell>
                <TableCell>{s.occupation}</TableCell>
                <TableCell>{s.shift_time}</TableCell>
                <TableCell>{s.rest_time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
