import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AddIcon from '@mui/icons-material/Add'
import CampaignIcon from '@mui/icons-material/Campaign'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import EventIcon from '@mui/icons-material/Event'
import FilterListIcon from '@mui/icons-material/FilterList'
import MenuIcon from '@mui/icons-material/Menu'
import PaidIcon from '@mui/icons-material/Paid'
import PeopleIcon from '@mui/icons-material/People'
import SendIcon from '@mui/icons-material/Send'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  bulkDeleteClients,
  bulkUpdateClients,
  createClient,
  deleteClient,
  getClients,
  getPendingFollowUpQueue,
  getPendingPaymentQueue,
  getDashboardSummary,
  markFollowUpComplete,
  markPaymentsPaid,
  sendFollowUpRemindersNow,
  sendPaymentRemindersNow,
  sendBulkMessage,
  snoozeFollowUp,
  updateClient,
} from './api/clientApi'
import type { Client } from './types/client'

type NavView = 'overview' | 'workspace' | 'campaigns'

type FilterState = {
  q: string
  paymentStatus: 'all' | 'pending' | 'paid' | 'overdue'
  followUpState: 'all' | 'due' | 'upcoming' | 'none'
  tag: string
}

type ToastState = {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'info'
}

type SendAudience = 'selected' | 'filtered'

const drawerWidth = 252

const emptyClient: Partial<Client> = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  tags: [],
  paymentStatus: 'pending',
}

const defaultFilters: FilterState = {
  q: '',
  paymentStatus: 'all',
  followUpState: 'all',
  tag: 'all',
}

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('en-IN') : '-')
const toDateInputValue = (value?: string) => (value ? value.slice(0, 10) : '')

export default function App() {
  const queryClient = useQueryClient()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeView, setActiveView] = useState<NavView>('workspace')

  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [form, setForm] = useState<Partial<Client>>(emptyClient)
  const [tagsText, setTagsText] = useState('')

  const [sendAudience, setSendAudience] = useState<SendAudience>('selected')
  const [messageText, setMessageText] = useState('')
  const [contentSid, setContentSid] = useState('')
  const [contentVariablesText, setContentVariablesText] = useState('')

  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'success' })

  const clientsQuery = useQuery({
    queryKey: ['clients', filters.q, filters.paymentStatus, filters.followUpState, filters.tag],
    queryFn: () => getClients(filters),
  })

  const allClientsForTagsQuery = useQuery({
    queryKey: ['clients-tags'],
    queryFn: () => getClients(),
  })

  const summaryQuery = useQuery({
    queryKey: ['summary'],
    queryFn: getDashboardSummary,
  })

  const followUpQueueQuery = useQuery({
    queryKey: ['dashboard-followups'],
    queryFn: () => getPendingFollowUpQueue(8),
  })

  const paymentQueueQuery = useQuery({
    queryKey: ['dashboard-payments'],
    queryFn: () => getPendingPaymentQueue(8),
  })

  const clients = clientsQuery.data || []
  const allClients = allClientsForTagsQuery.data || []
  const followUpQueue = followUpQueueQuery.data || []
  const paymentQueue = paymentQueueQuery.data || []

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const client of allClients) {
      for (const tag of client.tags || []) {
        tagSet.add(tag)
      }
    }
    return [...tagSet].sort((a, b) => a.localeCompare(b))
  }, [allClients])

  const selectedCount = selectedIds.length
  const allFilteredSelected =
    clients.length > 0 && clients.every((client) => selectedIds.includes(client._id))

  useEffect(() => {
    setPage(0)
  }, [filters.q, filters.paymentStatus, filters.followUpState, filters.tag])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(clients.length / rowsPerPage) - 1)
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [clients.length, page, rowsPerPage])

  useEffect(() => {
    const validIdSet = new Set(allClients.map((client) => client._id))
    setSelectedIds((prev) => prev.filter((id) => validIdSet.has(id)))
  }, [allClients])

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage
    return clients.slice(start, start + rowsPerPage)
  }, [clients, page, rowsPerPage])

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] })
    queryClient.invalidateQueries({ queryKey: ['clients-tags'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-followups'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-payments'] })
  }

  const saveClientMutation = useMutation({
    mutationFn: (payload: Partial<Client>) =>
      payload._id ? updateClient(payload._id, payload) : createClient(payload),
    onSuccess: () => {
      setIsClientDialogOpen(false)
      setForm(emptyClient)
      setTagsText('')
      refreshAll()
      setToast({ open: true, message: 'Client saved', severity: 'success' })
    },
    onError: () => {
      setToast({ open: true, message: 'Could not save client', severity: 'error' })
    },
  })

  const deleteClientMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      refreshAll()
      setToast({ open: true, message: 'Client deleted', severity: 'success' })
    },
    onError: () => {
      setToast({ open: true, message: 'Could not delete client', severity: 'error' })
    },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateClients,
    onSuccess: (data) => {
      refreshAll()
      setToast({
        open: true,
        message: `Updated ${data.modifiedCount} of ${data.matchedCount} selected clients`,
        severity: 'success',
      })
    },
    onError: () => {
      setToast({ open: true, message: 'Bulk update failed', severity: 'error' })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteClients,
    onSuccess: (data) => {
      setSelectedIds([])
      refreshAll()
      setToast({ open: true, message: `Deleted ${data.deletedCount} clients`, severity: 'success' })
    },
    onError: () => {
      setToast({ open: true, message: 'Bulk delete failed', severity: 'error' })
    },
  })

  const bulkMessageMutation = useMutation({
    mutationFn: sendBulkMessage,
    onSuccess: (data) => {
      setMessageText('')
      setContentSid('')
      setContentVariablesText('')

      if (data.failedCount > 0) {
        setToast({
          open: true,
          message: `Sent: ${data.sentCount}, Failed: ${data.failedCount}`,
          severity: 'info',
        })
      } else {
        setToast({ open: true, message: `Sent to ${data.sentCount} clients`, severity: 'success' })
      }
    },
    onError: (error: any) => {
      const reason = error?.response?.data?.failedDetails?.[0]
      const message = error?.response?.data?.message || 'Message delivery failed'
      setToast({ open: true, message: reason ? `${message}: ${reason}` : message, severity: 'error' })
    },
  })

  const sendFollowUpReminderMutation = useMutation({
    mutationFn: sendFollowUpRemindersNow,
    onSuccess: (data) => {
      refreshAll()
      if (data.failedCount > 0) {
        setToast({
          open: true,
          message: `Follow-up reminders sent: ${data.sentCount}, failed: ${data.failedCount}`,
          severity: 'info',
        })
      } else {
        setToast({ open: true, message: `Follow-up reminders sent: ${data.sentCount}`, severity: 'success' })
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to send follow-up reminder'
      setToast({ open: true, message, severity: 'error' })
    },
  })

  const sendPaymentReminderMutation = useMutation({
    mutationFn: sendPaymentRemindersNow,
    onSuccess: (data) => {
      refreshAll()
      if (data.failedCount > 0) {
        setToast({
          open: true,
          message: `Payment reminders sent: ${data.sentCount}, failed: ${data.failedCount}`,
          severity: 'info',
        })
      } else {
        setToast({ open: true, message: `Payment reminders sent: ${data.sentCount}`, severity: 'success' })
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to send payment reminder'
      setToast({ open: true, message, severity: 'error' })
    },
  })

  const markFollowUpCompleteMutation = useMutation({
    mutationFn: markFollowUpComplete,
    onSuccess: () => {
      refreshAll()
      setToast({ open: true, message: 'Follow-up marked complete', severity: 'success' })
    },
    onError: () => {
      setToast({ open: true, message: 'Could not mark follow-up complete', severity: 'error' })
    },
  })

  const markPaymentsPaidMutation = useMutation({
    mutationFn: markPaymentsPaid,
    onSuccess: () => {
      refreshAll()
      setToast({ open: true, message: 'Payment marked as paid', severity: 'success' })
    },
    onError: () => {
      setToast({ open: true, message: 'Could not mark payment as paid', severity: 'error' })
    },
  })

  const snoozeFollowUpMutation = useMutation({
    mutationFn: snoozeFollowUp,
    onSuccess: () => {
      refreshAll()
      setToast({ open: true, message: 'Follow-up snoozed by 3 days', severity: 'success' })
    },
    onError: () => {
      setToast({ open: true, message: 'Could not snooze follow-up', severity: 'error' })
    },
  })

  const openCreateDialog = () => {
    setForm(emptyClient)
    setTagsText('')
    setIsClientDialogOpen(true)
  }

  const openEditDialog = (client: Client) => {
    setForm(client)
    setTagsText((client.tags || []).join(', '))
    setIsClientDialogOpen(true)
  }

  const handleSaveClient = () => {
    if (!form.name?.trim() || !form.phone?.trim()) {
      setToast({ open: true, message: 'Name and phone are required', severity: 'error' })
      return
    }

    const parsedTags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    saveClientMutation.mutate({
      ...form,
      tags: parsedTags,
      paymentDueAmount: Number(form.paymentDueAmount || 0),
    })
  }

  const handleToggleSelectAllFiltered = (checked: boolean) => {
    const filteredIds = clients.map((client) => client._id)
    if (checked) {
      const unique = new Set([...selectedIds, ...filteredIds])
      setSelectedIds([...unique])
      return
    }

    setSelectedIds(selectedIds.filter((id) => !filteredIds.includes(id)))
  }

  const handleSendMessage = () => {
    const targetIds = sendAudience === 'selected' ? selectedIds : clients.map((client) => client._id)

    if (targetIds.length === 0) {
      setToast({ open: true, message: 'No target clients found', severity: 'error' })
      return
    }

    if (!messageText.trim() && !contentSid.trim()) {
      setToast({ open: true, message: 'Enter message or Content SID', severity: 'error' })
      return
    }

    let contentVariables: Record<string, string> | undefined
    if (contentVariablesText.trim()) {
      try {
        contentVariables = JSON.parse(contentVariablesText)
      } catch (_error) {
        setToast({ open: true, message: 'Content variables must be valid JSON', severity: 'error' })
        return
      }
    }

    bulkMessageMutation.mutate({
      mode: 'selected',
      clientIds: targetIds,
      message: messageText.trim() ? messageText.trim() : undefined,
      contentSid: contentSid.trim() ? contentSid.trim() : undefined,
      contentVariables,
    })
  }

  const handleBulkMarkPaid = () => {
    if (selectedCount === 0) {
      setToast({ open: true, message: 'Select clients first', severity: 'error' })
      return
    }

    bulkUpdateMutation.mutate({
      clientIds: selectedIds,
      update: { paymentStatus: 'paid', paymentDueAmount: 0 },
    })
  }

  const handleBulkSetFollowUp = () => {
    if (selectedCount === 0) {
      setToast({ open: true, message: 'Select clients first', severity: 'error' })
      return
    }
    if (!followUpDate) {
      setToast({ open: true, message: 'Select a follow-up date', severity: 'error' })
      return
    }

    bulkUpdateMutation.mutate({
      clientIds: selectedIds,
      update: { followUpDate },
    })
    setIsFollowUpDialogOpen(false)
    setFollowUpDate('')
  }

  const openDeleteDialog = () => {
    if (selectedCount === 0) {
      setToast({ open: true, message: 'Select clients first', severity: 'error' })
      return
    }
    setIsDeleteDialogOpen(true)
  }

  const confirmBulkDelete = () => {
    setIsDeleteDialogOpen(false)
    bulkDeleteMutation.mutate({ clientIds: selectedIds })
  }

  const openWorkspaceForClient = (client: Client) => {
    setFilters((prev) => ({ ...prev, q: client.name || client.phone || '' }))
    setActiveView('workspace')
  }

  const isAnyActionRunning =
    saveClientMutation.isPending ||
    bulkUpdateMutation.isPending ||
    bulkDeleteMutation.isPending ||
    bulkMessageMutation.isPending ||
    sendFollowUpReminderMutation.isPending ||
    sendPaymentReminderMutation.isPending ||
    markFollowUpCompleteMutation.isPending ||
    markPaymentsPaidMutation.isPending ||
    snoozeFollowUpMutation.isPending

  const navItems: { key: NavView; label: string; icon: React.ReactNode; hint: string }[] = [
    { key: 'overview', label: 'Overview', icon: <DashboardIcon />, hint: 'KPIs and activity' },
    { key: 'workspace', label: 'Client Workspace', icon: <PeopleIcon />, hint: 'Table, filters, bulk actions' },
    { key: 'campaigns', label: 'Campaigns', icon: <CampaignIcon />, hint: 'WhatsApp broadcast' },
  ]

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          GetPotentialLead CRM
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Relationship Workspace
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.key}
            selected={activeView === item.key}
            onClick={() => {
              setActiveView(item.key)
              setMobileOpen(false)
            }}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} secondary={item.hint} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2">Selection Snapshot</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedCount} clients selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {clients.length} rows in current filter
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )

  const workspaceView = (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
            <FilterListIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Filters
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Name, phone, email"
                value={filters.q}
                onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="payment-filter-label">Payment</InputLabel>
                <Select
                  labelId="payment-filter-label"
                  label="Payment"
                  value={filters.paymentStatus}
                  onChange={(event) =>
                    setFilters({ ...filters, paymentStatus: event.target.value as FilterState['paymentStatus'] })
                  }
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="followup-filter-label">Follow-up</InputLabel>
                <Select
                  labelId="followup-filter-label"
                  label="Follow-up"
                  value={filters.followUpState}
                  onChange={(event) =>
                    setFilters({ ...filters, followUpState: event.target.value as FilterState['followUpState'] })
                  }
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="due">Due</MenuItem>
                  <MenuItem value="upcoming">Upcoming</MenuItem>
                  <MenuItem value="none">No Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="tag-filter-label">Tag</InputLabel>
                <Select
                  labelId="tag-filter-label"
                  label="Tag"
                  value={filters.tag}
                  onChange={(event) => setFilters({ ...filters, tag: event.target.value })}
                >
                  <MenuItem value="all">All</MenuItem>
                  {availableTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      {tag}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => setFilters(defaultFilters)} sx={{ height: '56px' }}>
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip color={selectedCount > 0 ? 'primary' : 'default'} label={`Selected: ${selectedCount}`} />
              <Chip variant="outlined" label={`Filtered Rows: ${clients.length}`} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button startIcon={<AddIcon />} variant="contained" onClick={openCreateDialog}>
                Add Client
              </Button>
              <Button
                startIcon={<EditIcon />}
                variant="outlined"
                disabled={selectedCount !== 1}
                onClick={() => {
                  const target = clients.find((client) => client._id === selectedIds[0])
                  if (target) openEditDialog(target)
                }}
              >
                Edit Selected
              </Button>
              <Button
                startIcon={<SendIcon />}
                variant="outlined"
                onClick={() => setActiveView('campaigns')}
                disabled={selectedCount === 0 && clients.length === 0}
              >
                Go To Campaigns
              </Button>
              <Button startIcon={<EventIcon />} variant="outlined" disabled={selectedCount === 0} onClick={() => setIsFollowUpDialogOpen(true)}>
                Set Follow-up
              </Button>
              <Button startIcon={<PaidIcon />} variant="outlined" disabled={selectedCount === 0} onClick={handleBulkMarkPaid}>
                Mark Paid
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                variant="outlined"
                color="error"
                disabled={selectedCount === 0}
                onClick={openDeleteDialog}
              >
                Delete Selected
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allFilteredSelected}
                      onChange={(event) => handleToggleSelectAllFiltered(event.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Follow-up</TableCell>
                  <TableCell>Due Amount</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Stack direction="row" spacing={1} sx={{ py: 2, justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress size={20} />
                        <Typography color="text.secondary">Loading clients...</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}

                {!clientsQuery.isLoading &&
                  pageRows.map((client) => (
                    <TableRow hover key={client._id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(client._id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedIds([...selectedIds, client._id])
                              return
                            }
                            setSelectedIds(selectedIds.filter((id) => id !== client._id))
                          }}
                        />
                      </TableCell>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                          {(client.tags || []).slice(0, 2).map((tag) => (
                            <Chip key={tag} size="small" label={tag} />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(client.followUpDate)}</TableCell>
                      <TableCell>{`INR ${client.paymentDueAmount || 0}`}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={client.paymentStatus || 'pending'}
                          color={
                            client.paymentStatus === 'paid'
                              ? 'success'
                              : client.paymentStatus === 'overdue'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={() => openEditDialog(client)}>
                            Edit
                          </Button>
                          <Button size="small" color="error" onClick={() => deleteClientMutation.mutate(client._id)}>
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                {!clientsQuery.isLoading && pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography sx={{ py: 2 }} color="text.secondary" align="center">
                        No clients found for current filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={clients.length}
            page={page}
            onPageChange={(_event, value) => setPage(value)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </CardContent>
      </Card>
    </Stack>
  )

  const overviewView = (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Clients</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summaryQuery.data?.totalClients || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Due Follow-ups</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summaryQuery.data?.pendingFollowUps || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Overdue Payments</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summaryQuery.data?.pendingPayments || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Pending Follow-ups</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" color="success" label="Auto reminders active" />
                  <Button
                    size="small"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, followUpState: 'due' }))
                      setActiveView('workspace')
                    }}
                  >
                    Open Workspace
                  </Button>
                </Stack>
              </Stack>

              {followUpQueueQuery.isLoading ? (
                <Stack direction="row" spacing={1} sx={{ py: 2, alignItems: 'center' }}>
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading follow-up queue...</Typography>
                </Stack>
              ) : followUpQueue.length === 0 ? (
                <Typography color="text.secondary">No pending follow-ups right now.</Typography>
              ) : (
                <Stack spacing={1}>
                  {followUpQueue.map((client) => (
                    <Card key={client._id} variant="outlined">
                      <CardContent sx={{ py: '10px !important' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 600 }}>{client.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due: {formatDate(client.followUpDate)} | {client.phone}
                            </Typography>
                          </Box>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button size="small" variant="outlined" onClick={() => sendFollowUpReminderMutation.mutate([client._id])}>
                              Remind Now
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => snoozeFollowUpMutation.mutate({ clientId: client._id, days: 3 })}>
                              Snooze +3d
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => markFollowUpCompleteMutation.mutate([client._id])}>
                              Complete
                            </Button>
                            <Button size="small" onClick={() => openWorkspaceForClient(client)}>
                              Open
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Pending Payments</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" color="success" label="Auto reminders active" />
                  <Button
                    size="small"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, paymentStatus: 'overdue' }))
                      setActiveView('workspace')
                    }}
                  >
                    Open Workspace
                  </Button>
                </Stack>
              </Stack>

              {paymentQueueQuery.isLoading ? (
                <Stack direction="row" spacing={1} sx={{ py: 2, alignItems: 'center' }}>
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading payment queue...</Typography>
                </Stack>
              ) : paymentQueue.length === 0 ? (
                <Typography color="text.secondary">No pending payments right now.</Typography>
              ) : (
                <Stack spacing={1}>
                  {paymentQueue.map((client) => (
                    <Card key={client._id} variant="outlined">
                      <CardContent sx={{ py: '10px !important' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 600 }}>{client.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              INR {client.paymentDueAmount || 0} | Due: {formatDate(client.paymentDueDate)}
                            </Typography>
                          </Box>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button size="small" variant="outlined" onClick={() => sendPaymentReminderMutation.mutate([client._id])}>
                              Remind Now
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => markPaymentsPaidMutation.mutate([client._id])}>
                              Mark Paid
                            </Button>
                            <Button size="small" onClick={() => openWorkspaceForClient(client)}>
                              Open
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Workflow
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Use the Client Workspace to filter leads and select exact rows, then execute actions.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" startIcon={<PeopleIcon />} onClick={() => setActiveView('workspace')}>
                  Open Client Workspace
                </Button>
                <Button variant="outlined" startIcon={<CampaignIcon />} onClick={() => setActiveView('campaigns')}>
                  Open Campaigns
                </Button>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateDialog}>
                  Add New Client
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Selection Context
              </Typography>
              <Typography color="text.secondary">Selected Clients: {selectedCount}</Typography>
              <Typography color="text.secondary">Rows in Active Filter: {clients.length}</Typography>
              <Typography color="text.secondary">Available Tags: {availableTags.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )

  const campaignsView = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              WhatsApp Campaign Composer
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="audience-label">Audience</InputLabel>
                <Select
                  labelId="audience-label"
                  label="Audience"
                  value={sendAudience}
                  onChange={(event) => setSendAudience(event.target.value as SendAudience)}
                >
                  <MenuItem value="selected">Selected ({selectedCount})</MenuItem>
                  <MenuItem value="filtered">Filtered ({clients.length})</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Message"
                placeholder="For user-initiated conversation"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
              />

              <TextField
                fullWidth
                label="Twilio Content SID (optional)"
                placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={contentSid}
                onChange={(event) => setContentSid(event.target.value)}
              />

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Content Variables JSON (optional)"
                placeholder='{"1":"12/1","2":"3pm"}'
                value={contentVariablesText}
                onChange={(event) => setContentVariablesText(event.target.value)}
              />

              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => setActiveView('workspace')}>
                  Back To Workspace
                </Button>
                <Button variant="contained" startIcon={<SendIcon />} onClick={handleSendMessage} disabled={bulkMessageMutation.isPending}>
                  Send Campaign
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Campaign Context
            </Typography>
            <Typography color="text.secondary">Selected Clients: {selectedCount}</Typography>
            <Typography color="text.secondary">Filtered Clients: {clients.length}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Tip: Use Content SID for template-based sending, or message text for session-based sending.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f7fb' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: '#0d47a1',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            CRM Workspace
          </Typography>
          <Chip
            label={`Selected: ${selectedCount}`}
            sx={{ color: '#0d47a1', bgcolor: 'white', fontWeight: 600 }}
          />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
        <Toolbar />
        <Stack spacing={2}>
          {activeView === 'overview' && overviewView}
          {activeView === 'workspace' && workspaceView}
          {activeView === 'campaigns' && campaignsView}
        </Stack>
      </Box>

      <Dialog open={isClientDialogOpen} onClose={() => setIsClientDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{form._id ? 'Edit Client' : 'Add Client'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                required
                label="Name"
                value={form.name || ''}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                required
                label="Phone"
                value={form.phone || ''}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                value={form.email || ''}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Follow-up Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={toDateInputValue(form.followUpDate)}
                onChange={(event) => setForm({ ...form, followUpDate: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Payment Due Amount"
                value={form.paymentDueAmount || ''}
                onChange={(event) => setForm({ ...form, paymentDueAmount: Number(event.target.value || 0) })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Payment Due Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={toDateInputValue(form.paymentDueDate)}
                onChange={(event) => setForm({ ...form, paymentDueDate: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="payment-status-label">Payment Status</InputLabel>
                <Select
                  labelId="payment-status-label"
                  label="Payment Status"
                  value={form.paymentStatus || 'pending'}
                  onChange={(event) => setForm({ ...form, paymentStatus: event.target.value as Client['paymentStatus'] })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Notes"
                value={form.notes || ''}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsClientDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveClient} disabled={saveClientMutation.isPending}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isFollowUpDialogOpen} onClose={() => setIsFollowUpDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Set Follow-up Date</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 1 }}
            fullWidth
            type="date"
            label="Follow-up Date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={followUpDate}
            onChange={(event) => setFollowUpDate(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFollowUpDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkSetFollowUp} disabled={bulkUpdateMutation.isPending}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Selected Clients</DialogTitle>
        <DialogContent>
          <Typography>
            You are deleting {selectedCount} selected clients. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmBulkDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {isAnyActionRunning && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            px: 2,
            py: 1,
            borderRadius: 2,
            boxShadow: 2,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Processing...</Typography>
          </Stack>
        </Box>
      )}
    </Box>
  )
}
