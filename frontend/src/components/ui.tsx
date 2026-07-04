import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

/** Staggered container — children using <Item> reveal in sequence. */
export function Stagger({ children, gap = 0.07 }: { children: ReactNode; gap?: number }) {
  return (
    <Box
      component={motion.div}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </Box>
  );
}

export function Item({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) {
  return (
    <Box
      component={motion.div}
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

/** Single fade/rise reveal. */
export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Box>
  );
}

/** Animated number that counts up from 0. */
export function CountUp({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, duration, mv]);
  return <motion.span>{rounded}</motion.span>;
}

/** Consistent page header with overline + display title + optional subtitle/action. */
export function PageHeader({
  overline,
  title,
  subtitle,
  action,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
      spacing={2}
      sx={{ mb: { xs: 3, sm: 4 } }}
    >
      <Box>
        {overline && (
          <Typography variant="overline" color="primary" sx={{ display: 'block', mb: 0.5 }}>
            {overline}
          </Typography>
        )}
        <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', sm: '2.4rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Stack>
  );
}

export function SectionLoader({ label }: { label?: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 8 }}>
      <CircularProgress />
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
    </Stack>
  );
}
