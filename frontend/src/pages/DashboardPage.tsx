import { useEffect, useState } from 'react';
import { Card, CardContent, Grid, Typography } from '@mui/material';
import dayjs from 'dayjs';

import { reportsApi } from '../api/endpoints';
import type { MonthlyReportRow } from '../types';

export default function DashboardPage() {
  const [row, setRow] = useState<MonthlyReportRow | null>(null);
  const month = dayjs().format('YYYY-MM');

  useEffect(() => {
    reportsApi.monthlyCost(month).then(setRow).catch(() => setRow(null));
  }, [month]);

  const stats = [
    { label: 'Total Meals This Month', value: row?.total_meals ?? 0 },
    { label: 'Grocery & Veg ₹', value: row?.grocery_veg_expense ?? 0 },
    { label: 'Gas & Coal ₹', value: row?.gas_coal_expense ?? 0 },
    { label: 'Oil ₹', value: row?.oil_expense ?? 0 },
    { label: 'Manpower Salary ₹', value: row?.manpower_salary ?? 0 },
    { label: 'Contractor Payment ₹', value: row?.contractor_payment ?? 0 },
    { label: 'Total Expense ₹', value: row?.total_expense ?? 0 },
    { label: 'Cost Per Meal ₹', value: row?.cost_per_meal ?? 0 },
  ];

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Dashboard — {month}
      </Typography>
      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography variant="h5">
                  {typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
