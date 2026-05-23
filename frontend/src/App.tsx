import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AddIcon from '@mui/icons-material/Add'
import CampaignIcon from '@mui/icons-material/Campaign'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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
const collapsedDrawerWidth = 72

const emptyClient: Partial<Client> = {
  name: '',
  phone: '',
  email: '',
  city: '',
  customerStatus: 'Interested',
  followUpStatus: 'Pending',
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
  const [desktopDrawerOpen, setDesktopDrawerOpen] = useState(true)
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
      weddingAnniversary: form.weddingAnniversary || form.anniversary,
      lastFollowUpDate: form.lastFollowUpDate,
      nextFollowUpDate: form.nextFollowUpDate || form.followUpDate,
      followUpDate: form.nextFollowUpDate || form.followUpDate,
      anniversary: form.weddingAnniversary || form.anniversary,
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

  const drawerContent = (isCollapsed: boolean) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: isCollapsed ? 1 : 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        {!isCollapsed && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              GetPotentialLead CRM
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Relationship Workspace
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={() => setDesktopDrawerOpen((prev) => !prev)}
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          size="small"
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
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
            sx={{
              borderRadius: 2,
              mb: 0.5,
              minHeight: 48,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              px: isCollapsed ? 1 : 1.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, mr: isCollapsed ? 0 : 1 }}>
              {item.icon}
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary={item.label} secondary={item.hint} />}
          </ListItemButton>
        ))}
      </List>
      {!isCollapsed && (
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
      )}
    </Box>
  )

  const workspaceView = (
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ pb: '14px !important' }}>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: 'center' }}>
            <FilterListIcon sx={{ fontSize: 22, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Table Controls
            </Typography>
          </Stack>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
              <Button fullWidth variant="outlined" onClick={() => setFilters(defaultFilters)} sx={{ height: '40px' }}>
                Reset
              </Button>
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mt: 1.5, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Chip
                icon={<PeopleIcon />}
                color={selectedCount > 0 ? 'primary' : 'default'}
                label={`Selected: ${selectedCount}`}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                variant="outlined"
                label={`Total: ${clients.length}`}
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} sx={{ justifyContent: 'flex-end' }}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={openCreateDialog}
              >
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
                Edit
              </Button>
              <Button
                startIcon={<SendIcon />}
                variant="outlined"
                onClick={() => setActiveView('campaigns')}
                disabled={selectedCount === 0 && clients.length === 0}
              >
                Campaign
              </Button>
              <Button
                startIcon={<EventIcon />}
                variant="outlined"
                disabled={selectedCount === 0}
                onClick={() => setIsFollowUpDialogOpen(true)}
              >
                Follow-up
              </Button>
              <Button
                startIcon={<PaidIcon />}
                variant="outlined"
                disabled={selectedCount === 0}
                onClick={handleBulkMarkPaid}
                color="success"
              >
                Mark Paid
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                variant="outlined"
                color="error"
                disabled={selectedCount === 0}
                onClick={openDeleteDialog}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
          <Table sx={{ minWidth: 800 }}>
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
      </Card>
    </Stack>
  )

  const overviewView = (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '8px',
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                  }}
                >
                  <PeopleIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Clients
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {summaryQuery.data?.totalClients || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '8px',
                    backgroundColor: '#ffebee',
                    color: '#F44336',
                  }}
                >
                  <EventIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Due Follow-ups
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {summaryQuery.data?.pendingFollowUps || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '8px',
                    backgroundColor: '#e8f5e9',
                    color: '#4CAF50',
                  }}
                >
                  <PaidIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Overdue Payments
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {summaryQuery.data?.pendingPayments || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '8px',
                    backgroundColor: '#fff3e0',
                    color: '#FFA726',
                  }}
                >
                  <CampaignIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Campaigns
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    0
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Pending Follow-ups
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {followUpQueue.length} clients awaiting action
                </Typography>
              </Box>

              {followUpQueueQuery.isLoading ? (
                <Stack direction="row" spacing={1} sx={{ py: 2, alignItems: 'center' }}>
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading follow-up queue...</Typography>
                </Stack>
              ) : followUpQueue.length === 0 ? (
                <Typography color="text.secondary">No pending follow-ups right now</Typography>
              ) : (
                <Stack spacing={1}>
                  {followUpQueue.map((client) => (
                    <Card key={client._id} variant="outlined">
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600 }}>{client.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due: {formatDate(client.followUpDate)} | {client.phone}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button size="small" onClick={() => sendFollowUpReminderMutation.mutate([client._id])}>
                              Remind
                            </Button>
                            <Button size="small" onClick={() => snoozeFollowUpMutation.mutate({ clientId: client._id, days: 3 })}>
                              Snooze
                            </Button>
                            <Button size="small" color="success" onClick={() => markFollowUpCompleteMutation.mutate([client._id])}>
                              Done
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, followUpState: 'due' }))
                  setActiveView('workspace')
                }}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Pending Payments
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {paymentQueue.length} clients with overdue payments
                </Typography>
              </Box>

              {paymentQueueQuery.isLoading ? (
                <Stack direction="row" spacing={1} sx={{ py: 2, alignItems: 'center' }}>
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading payment queue...</Typography>
                </Stack>
              ) : paymentQueue.length === 0 ? (
                <Typography color="text.secondary">No pending payments right now</Typography>
              ) : (
                <Stack spacing={1}>
                  {paymentQueue.map((client) => (
                    <Card key={client._id} variant="outlined">
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600 }}>{client.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              INR {client.paymentDueAmount || 0} | Due: {formatDate(client.paymentDueDate)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button size="small" onClick={() => sendPaymentReminderMutation.mutate([client._id])}>
                              Remind
                            </Button>
                            <Button size="small" color="success" onClick={() => markPaymentsPaidMutation.mutate([client._id])}>
                              Mark Paid
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, paymentStatus: 'overdue' }))
                  setActiveView('workspace')
                }}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )

  const campaignsView = (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, alignItems: 'center' }}>
              <CampaignIcon sx={{ fontSize: 24, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                WhatsApp Campaign Composer
              </Typography>
            </Stack>

            <Stack spacing={2.5}>
              <FormControl fullWidth>
                <InputLabel id="audience-label">Audience</InputLabel>
                <Select
                  labelId="audience-label"
                  label="Audience"
                  value={sendAudience}
                  onChange={(event) => setSendAudience(event.target.value as SendAudience)}
                >
                  <MenuItem value="selected">
                    <Stack direction="row" spacing={1}>
                      <span>Selected Clients</span>
                      <Chip size="small" label={selectedCount} />
                    </Stack>
                  </MenuItem>
                  <MenuItem value="filtered">
                    <Stack direction="row" spacing={1}>
                      <span>Filtered Results</span>
                      <Chip size="small" label={clients.length} />
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Message"
                placeholder="Type your message here for user-initiated conversation..."
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                helperText="Leave empty if using Twilio Content SID"
              />

              <TextField
                fullWidth
                label="Twilio Content SID (optional)"
                placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={contentSid}
                onChange={(event) => setContentSid(event.target.value)}
                helperText="For template-based sending, leave message empty"
              />

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Content Variables JSON (optional)"
                placeholder='{"1":"12/1","2":"3pm"}'
                value={contentVariablesText}
                onChange={(event) => setContentVariablesText(event.target.value)}
                helperText="Only used with Content SID"
              />

              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveView('workspace')}
                  sx={{ px: 3 }}
                >
                  Back to Workspace
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleSendMessage}
                  disabled={bulkMessageMutation.isPending}
                  sx={{ px: 3 }}
                >
                  {bulkMessageMutation.isPending ? 'Sending...' : 'Send Campaign'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                  }}
                >
                  <PeopleIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Audience Size
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Selected Clients:</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{selectedCount}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Filtered Results:</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{clients.length}</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: 'info.light' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'info.dark' }}>
                💡 Campaign Tips
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Message:</strong> For session-based conversations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Content SID:</strong> For pre-built templates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Variables:</strong> Personalize templates with JSON
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${desktopDrawerOpen ? drawerWidth : collapsedDrawerWidth}px)` },
          ml: { md: `${desktopDrawerOpen ? drawerWidth : collapsedDrawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ px: { xs: 1, md: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                GetPotentialLead CRM
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Enterprise Workspace
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Chip
              label={`Selected: ${selectedCount}`}
              icon={<PeopleIcon />}
              color={selectedCount > 0 ? 'primary' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`Total: ${clients.length}`}
              color="default"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: desktopDrawerOpen ? drawerWidth : collapsedDrawerWidth }, flexShrink: { md: 0 } }}>
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
          {drawerContent(false)}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: desktopDrawerOpen ? drawerWidth : collapsedDrawerWidth,
              overflowX: 'hidden',
              transition: (theme) =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
        >
          {drawerContent(!desktopDrawerOpen)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          overflow: 'auto',
          height: '100vh',
        }}
      >
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
                label="City"
                value={form.city || ''}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="customer-status-label">Customer Status</InputLabel>
                <Select
                  labelId="customer-status-label"
                  label="Customer Status"
                  value={form.customerStatus || 'Interested'}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customerStatus: event.target.value as Client['customerStatus'],
                    })
                  }
                >
                  <MenuItem value="Interested">Interested</MenuItem>
                  <MenuItem value="Converted">Converted</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
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
              <FormControl fullWidth>
                <InputLabel id="followup-status-label">Follow-up Status</InputLabel>
                <Select
                  labelId="followup-status-label"
                  label="Follow-up Status"
                  value={form.followUpStatus || 'Pending'}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      followUpStatus: event.target.value as Client['followUpStatus'],
                    })
                  }
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Last Follow-up Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={toDateInputValue(form.lastFollowUpDate)}
                onChange={(event) => setForm({ ...form, lastFollowUpDate: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Next Follow-up Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={toDateInputValue(form.nextFollowUpDate || form.followUpDate)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nextFollowUpDate: event.target.value,
                    followUpDate: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Wedding Anniversary"
                slotProps={{ inputLabel: { shrink: true } }}
                value={toDateInputValue(form.weddingAnniversary || form.anniversary)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    weddingAnniversary: event.target.value,
                    anniversary: event.target.value,
                  })
                }
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
