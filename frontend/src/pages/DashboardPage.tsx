import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';

import { analyticsApi } from '../api/endpoints';
import { PageHeader, Stagger, Item } from '../components/ui';
import { tabularSx } from '../theme';
import type { Dashboard, SeriesPoint } from '../types';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString('en-IN');

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={tabularSx} color={accent ? 'primary.main' : 'text.primary'}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function TrendChart({ data }: { data: SeriesPoint[] }) {
  if (!data.length) return <Typography color="text.secondary">No consumption data.</Typography>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 160, overflowX: 'auto', pt: 1 }}>
      {data.map((d) => (
        <Box key={d.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 14 }}>
          <Box
            title={`${d.label}: ${d.value}`}
            sx={{
              width: 10,
              height: `${(d.value / max) * 130}px`,
              bgcolor: 'primary.main',
              borderRadius: 1,
              opacity: 0.85,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [trend, setTrend] = useState<SeriesPoint[]>([]);
  const [top, setTop] = useState<SeriesPoint[]>([]);
  const month = dayjs().format('MMMM YYYY');

  useEffect(() => {
    analyticsApi.dashboard().then(setData).catch(() => setData(null));
    analyticsApi.consumptionTrend(30).then(setTrend).catch(() => setTrend([]));
    analyticsApi.topConsumed({ limit: 8 }).then(setTop).catch(() => setTop([]));
  }, []);

  const k = data?.kpis;

  const cards = [
    { label: 'Stock Value', value: inr(k?.stock_value ?? 0), accent: true },
    { label: 'Items Below Min', value: num(k?.items_below_min ?? 0) },
    { label: 'Meals This Month', value: num(k?.meals_mtd ?? 0) },
    { label: 'Meals Today', value: num(k?.meals_today ?? 0) },
    { label: 'Purchases MTD', value: inr(k?.purchases_mtd_value ?? 0) },
    { label: 'Food Cost MTD', value: inr(k?.food_cost_mtd ?? 0) },
    { label: 'Cost / Meal MTD', value: inr(k?.cost_per_meal_mtd ?? 0), accent: true },
    { label: 'Invoices MTD', value: num(k?.invoices_mtd ?? 0) },
  ];

  return (
    <>
      <PageHeader
        overline="Overview"
        title="Dashboard"
        subtitle={`${month} · live from the stock ledger, purchases & consumption`}
      />

      <Stagger>
        <Grid container spacing={2}>
          {cards.map((c) => (
            <Grid item xs={6} md={3} key={c.label}>
              <Item>
                <Kpi label={c.label} value={c.value} accent={c.accent} />
              </Item>
            </Grid>
          ))}
        </Grid>
      </Stagger>

      <Grid container spacing={2} mt={0.5}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Daily Meals — last 30 days
            </Typography>
            <TrendChart data={trend} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Top Consumed Items
            </Typography>
            <Table size="small">
              <TableBody>
                {top.map((t) => (
                  <TableRow key={t.label}>
                    <TableCell>{t.label}</TableCell>
                    <TableCell align="right" sx={tabularSx}>
                      {num(t.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Low Stock
            </Typography>
            {data?.low_stock.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="right">Min</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.low_stock.map((r) => (
                    <TableRow key={r.item_id}>
                      <TableCell>{r.item_name}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" color="warning" label={`${r.balance} ${r.unit_name ?? ''}`} />
                      </TableCell>
                      <TableCell align="right">{r.min_stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography color="text.secondary">
                No items below minimum. (Set min levels on items to enable alerts.)
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Recent Activity
            </Typography>
            {data?.recent.length ? (
              <Stack spacing={1}>
                {data.recent.map((r, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between">
                    <Typography variant="body2">
                      <Chip size="small" label={r.kind} sx={{ mr: 1 }} />
                      {r.detail}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(r.date).format('DD MMM')}
                      {r.amount != null ? ` · ${inr(r.amount)}` : ''}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No recent purchases or issues yet.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
