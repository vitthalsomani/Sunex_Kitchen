import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import MergeTypeIcon from '@mui/icons-material/MergeType';

import { itemAliasesApi, itemsApi } from '../api/endpoints';
import type { ReviewItem, UnmatchedName } from '../api/endpoints';
import type { Item } from '../types';

export default function AliasCurationPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedName[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [targetFor, setTargetFor] = useState<Record<string, Item | null>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [i, u, r] = await Promise.all([
      itemsApi.list(),
      itemAliasesApi.unmatched(),
      itemAliasesApi.reviewItems(),
    ]);
    setItems(i.filter((x) => !x.name.startsWith('_')));
    setUnmatched(u);
    setReview(r);
  };
  useEffect(() => {
    load();
  }, []);

  const canonical = items; // all items are valid targets

  const mapName = async (name: string, target: Item | null) => {
    if (!target) return;
    await itemAliasesApi.create({ alias: name, item_id: target.id });
    setUnmatched((prev) => prev.filter((x) => x.name !== name));
    setMsg(`Matched “${name}” → ${target.name}. Refresh stock value to apply.`);
  };

  const merge = async (source: ReviewItem, target: Item | null) => {
    if (!target) return;
    await itemAliasesApi.merge(source.item_id, target.id);
    await load();
    setMsg(`Merged “${source.name}” into ${target.name}.`);
  };

  const reseed = async () => {
    const res = await itemAliasesApi.reseed();
    setMsg(`Refreshed: ${res.items_valued} items priced · total ₹${res.total_value.toLocaleString('en-IN')}.`);
  };

  return (
    <>
      <Stack direction="row" alignItems="center" mb={1} spacing={2}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Name Cleanup
        </Typography>
        <Button variant="contained" startIcon={<AutoFixHighIcon />} onClick={reseed}>
          Refresh Stock Value
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Match different spellings of the same item to one item, so your stock &amp; cost stay together.
        Suggestions are automatic — <b>always check before matching</b>. After matching, click Refresh
        Stock Value.
      </Typography>
      {msg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      {/* Unmatched purchase names */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Names to match <Chip size="small" label={unmatched.length} sx={{ ml: 1 }} />
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Names from purchases that don’t match any item. Match spelling variants to an existing
          item; genuinely new items (e.g. fresh vegetables, milk) should be added on the Items page.
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Purchase name</TableCell>
                <TableCell align="right"># rows</TableCell>
                <TableCell>Suggested</TableCell>
                <TableCell sx={{ minWidth: 260 }}>Match to item</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {unmatched.slice(0, 60).map((u) => {
                const sel =
                  targetFor[u.name] ??
                  (u.suggestion ? items.find((i) => i.id === u.suggestion!.item_id) ?? null : null);
                return (
                  <TableRow key={u.name} hover>
                    <TableCell>{u.name}</TableCell>
                    <TableCell align="right">{u.count}</TableCell>
                    <TableCell>
                      {u.suggestion ? (
                        <Chip size="small" color="info" label={u.suggestion.name} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={canonical}
                        getOptionLabel={(o) => o.name}
                        value={sel}
                        onChange={(_, v) => setTargetFor({ ...targetFor, [u.name]: v })}
                        renderInput={(p) => <TextField {...p} placeholder="Choose item…" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => mapName(u.name, sel)} disabled={!sel}>
                        Match
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {unmatched.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" py={2}>
                      Nothing unmatched. 🎉
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        {unmatched.length > 60 && (
          <Typography variant="caption" color="text.secondary">
            Showing top 60 of {unmatched.length} by frequency.
          </Typography>
        )}
      </Paper>

      {/* Review duplicate items */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          New items to review <Chip size="small" label={review.length} sx={{ ml: 1 }} />
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Items added automatically during import. If one is the same as an existing item, merge it
          (moves its stock &amp; cost). If it’s genuinely new, leave it.
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell sx={{ minWidth: 260 }}>Merge into</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {review.map((r) => {
              const sel =
                targetFor['rev:' + r.item_id] ??
                (r.suggestion ? items.find((i) => i.id === r.suggestion!.item_id) ?? null : null);
              return (
                <TableRow key={r.item_id} hover>
                  <TableCell>{r.name}</TableCell>
                  <TableCell align="right">{r.balance}</TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={canonical.filter((i) => i.id !== r.item_id)}
                      getOptionLabel={(o) => o.name}
                      value={sel}
                      onChange={(_, v) => setTargetFor({ ...targetFor, ['rev:' + r.item_id]: v })}
                      renderInput={(p) => <TextField {...p} placeholder="Choose item…" />}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="warning"
                      variant="outlined"
                      startIcon={<MergeTypeIcon />}
                      onClick={() => merge(r, sel)}
                      disabled={!sel}
                    >
                      Merge
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {review.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" py={2}>
                    No items pending review.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
