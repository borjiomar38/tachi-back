import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  AlertCircleIcon,
  MailIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';
import { useNavigateBack } from '@/hooks/use-navigate-back';

import { BackButton } from '@/components/back-button';
import { PageError } from '@/components/errors/page-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmResponsiveDrawer } from '@/components/ui/confirm-responsive-drawer';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionContact } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import { ContactTriageCard } from '@/features/contact/manager/contact-triage-card';
import { useContactWorkflowStore } from '@/features/contact/manager/use-contact-workflow-store';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';
import type { Outputs } from '@/server/router';

const CONTACT_STATUS_OPTIONS = [
  'unread',
  'in_progress',
  'resolved',
  'spam',
] as const;

type ContactDetail = Outputs['contact']['getById'];
type ContactStatus = ContactDetail['status'];

interface PageContactProps {
  params: { id: string };
}

export const PageContact = ({ params }: PageContactProps) => {
  const { t } = useTranslation(['contact']);
  const queryClient = useQueryClient();
  const { navigateBack } = useNavigateBack();
  const detailQuery = useQuery(
    orpc.contact.getById.queryOptions({ input: { id: params.id } })
  );
  const internalNotes = useContactWorkflowStore((state) => state.internalNotes);
  const setInternalNotes = useContactWorkflowStore(
    (state) => state.setInternalNotes
  );
  const status = useContactWorkflowStore((state) => state.status);
  const setStatus = useContactWorkflowStore((state) => state.setStatus);
  const hydrate = useContactWorkflowStore((state) => state.hydrate);

  useEffect(() => {
    if (detailQuery.status !== 'success') return;
    hydrate({
      internalNotes: detailQuery.data.internalNotes,
      status: detailQuery.data.status,
    });
  }, [detailQuery.data, detailQuery.status, hydrate]);

  const refreshContactQueries = async (updated: ContactDetail) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.contact.getAll.key(),
        type: 'all',
      }),
      queryClient.setQueryData(
        orpc.contact.getById.key({ input: { id: params.id } }),
        updated
      ),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: async () =>
      await orpc.contact.updateById.call({
        id: params.id,
        internalNotes,
        status,
      }),
    onSuccess: async (updated) => {
      await refreshContactQueries(updated);
      toast.success(t('contact:detail.updated'));
    },
    onError: () => toast.error(t('contact:detail.updateError')),
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async () =>
      await orpc.contact.reanalyzeById.call({ id: params.id }),
    onSuccess: async (updated) => {
      await refreshContactQueries(updated);
      toast.success(t('contact:triage.reanalyzeQueued'));
    },
    onError: () => toast.error(t('contact:triage.reanalyzeError')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      await orpc.contact.deleteById.call({ id: params.id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.contact.getAll.key(),
          type: 'all',
        }),
        queryClient.removeQueries({
          queryKey: orpc.contact.getById.key({ input: { id: params.id } }),
        }),
      ]);
      toast.success(t('contact:detail.deleted'));
      navigateBack();
    },
    onError: () => toast.error(t('contact:detail.deleteError')),
  });

  const ui = getUiState((set) => {
    if (detailQuery.status === 'pending') return set('pending');
    if (
      detailQuery.status === 'error' &&
      detailQuery.error instanceof ORPCError &&
      detailQuery.error.code === 'NOT_FOUND'
    ) {
      return set('not-found');
    }
    if (detailQuery.status === 'error') return set('error');
    return set('default', { item: detailQuery.data });
  });

  return (
    <GuardPermissions permissions={[permissionContact.read]}>
      <PageLayout>
        <PageLayoutTopBar
          startActions={<BackButton />}
          endActions={
            <WithPermissions permissions={[permissionContact.delete]}>
              <ConfirmResponsiveDrawer
                onConfirm={() => deleteMutation.mutate()}
                title={t('contact:detail.deleteTitle')}
                description={t('contact:detail.deleteDescription')}
                confirmText={t('contact:detail.deleteConfirm')}
                confirmVariant="destructive"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  loading={deleteMutation.isPending}
                >
                  <Trash2Icon />
                  {t('contact:detail.delete')}
                </Button>
              </ConfirmResponsiveDrawer>
            </WithPermissions>
          }
        >
          <PageLayoutTopBarTitle>
            {ui
              .match('pending', () => <Skeleton className="h-4 w-64" />)
              .match(['not-found', 'error'], () => (
                <AlertCircleIcon className="size-4 text-muted-foreground" />
              ))
              .match('default', ({ item }) => item.subject)
              .exhaustive()}
          </PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-6xl">
          {ui
            .match('pending', () => <Spinner full />)
            .match('not-found', () => <PageError type="404" />)
            .match('error', () => <PageError type="unknown-server-error" />)
            .match('default', ({ item }) => (
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <ContactSummaryGrid item={item} />
                  <CustomerMessageCard item={item} />
                </div>
                <div className="space-y-4">
                  <ContactTriageCard
                    actions={
                      <WithPermissions permissions={[permissionContact.update]}>
                        <Button
                          className="w-full"
                          variant="secondary"
                          disabled={['processing', 'delivery_unknown'].includes(
                            item.triage.state
                          )}
                          loading={reanalyzeMutation.isPending}
                          onClick={() => reanalyzeMutation.mutate()}
                        >
                          <RefreshCwIcon />
                          {t('contact:triage.analyzeAgain')}
                        </Button>
                      </WithPermissions>
                    }
                    triage={item.triage}
                  />
                  <WithPermissions permissions={[permissionContact.update]}>
                    <ContactWorkflowCard
                      internalNotes={internalNotes}
                      loading={updateMutation.isPending}
                      item={item}
                      status={status}
                      onInternalNotesChange={setInternalNotes}
                      onSave={() => updateMutation.mutate()}
                      onStatusChange={setStatus}
                    />
                  </WithPermissions>
                </div>
              </div>
            ))
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

interface ContactBlockProps {
  item: ContactDetail;
}

const ContactSummaryGrid = ({ item }: ContactBlockProps) => {
  const { t } = useTranslation(['contact']);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label={t('contact:detail.summary.status')}
        value={t(`contact:status.${item.status}`)}
        subLabel={t('contact:detail.summary.created', {
          date: dayjs(item.createdAt).format('DD/MM/YYYY HH:mm'),
        })}
      />
      <SummaryCard
        label={t('contact:detail.summary.sender')}
        value={item.name}
        subLabel={item.email}
      />
      <SummaryCard
        label={t('contact:detail.summary.assigned')}
        value={item.assignedTo?.name ?? t('contact:detail.summary.unassigned')}
        subLabel={
          item.assignedTo?.email ?? t('contact:detail.summary.assignOnUpdate')
        }
      />
      <SummaryCard
        label={t('contact:detail.summary.source')}
        value={item.source}
        subLabel={
          item.readAt
            ? t('contact:detail.summary.read', {
                relativeTime: dayjs(item.readAt).fromNow(),
              })
            : t('contact:detail.summary.unread')
        }
      />
    </div>
  );
};

const CustomerMessageCard = ({ item }: ContactBlockProps) => {
  const { t } = useTranslation(['contact']);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('contact:detail.message.title')}</CardTitle>
        <CardDescription>
          {t('contact:detail.message.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={getStatusBadgeVariant(item.status)}>
            {t(`contact:status.${item.status}`)}
          </Badge>
          <a
            href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary"
          >
            <MailIcon className="size-4" />
            {t('contact:detail.message.reply')}
          </a>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
          <p className="text-sm leading-7 whitespace-pre-wrap">
            {item.message}
          </p>
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <div>
            <div className="font-medium text-foreground">
              {t('contact:detail.message.ip')}
            </div>
            <div>
              {item.ipAddress ?? t('contact:detail.message.notCaptured')}
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground">
              {t('contact:detail.message.userAgent')}
            </div>
            <div className="break-all">
              {item.userAgent ?? t('contact:detail.message.notCaptured')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ContactWorkflowCardProps extends ContactBlockProps {
  internalNotes: string;
  loading: boolean;
  onInternalNotesChange: (value: string) => void;
  onSave: () => void;
  onStatusChange: (status: ContactStatus) => void;
  status: ContactStatus;
}

const ContactWorkflowCard = ({
  internalNotes,
  item,
  loading,
  onInternalNotesChange,
  onSave,
  onStatusChange,
  status,
}: ContactWorkflowCardProps) => {
  const { t } = useTranslation(['contact']);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('contact:detail.workflow.title')}</CardTitle>
        <CardDescription>
          {t('contact:detail.workflow.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t('contact:detail.workflow.status')}
          </p>
          <Select
            items={CONTACT_STATUS_OPTIONS.map((value) => ({
              label: t(`contact:status.${value}`),
              value,
            }))}
            value={status}
            onValueChange={(value) => onStatusChange(value as ContactStatus)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t('contact:detail.workflow.selectStatus')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CONTACT_STATUS_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`contact:status.${value}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t('contact:detail.workflow.notes')}
          </p>
          <Textarea
            rows={6}
            value={internalNotes}
            onChange={(event) =>
              onInternalNotesChange(event.currentTarget.value)
            }
            placeholder={t('contact:detail.workflow.notesPlaceholder')}
          />
        </div>

        <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-4 text-sm md:grid-cols-2">
          <div>
            <div className="font-medium text-foreground">
              {t('contact:detail.workflow.resolvedAt')}
            </div>
            <div className="text-muted-foreground">
              {item.resolvedAt
                ? dayjs(item.resolvedAt).format('DD/MM/YYYY HH:mm')
                : t('contact:detail.workflow.notResolved')}
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground">
              {t('contact:detail.workflow.lastUpdated')}
            </div>
            <div className="text-muted-foreground">
              {dayjs(item.updatedAt).format('DD/MM/YYYY HH:mm')}
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={onSave} loading={loading}>
          {t('contact:detail.workflow.save')}
        </Button>
      </CardContent>
    </Card>
  );
};

interface SummaryCardProps {
  label: string;
  subLabel: string;
  value: string;
}

const SummaryCard = ({ label, subLabel, value }: SummaryCardProps) => (
  <Card>
    <CardHeader className="gap-2">
      <CardTitle className="text-base">{label}</CardTitle>
      <CardDescription className="truncate">{subLabel}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-lg font-semibold tracking-tight break-words">
        {value}
      </div>
    </CardContent>
  </Card>
);

const getStatusBadgeVariant = (status: ContactStatus) => {
  if (status === 'unread') return 'warning';
  if (status === 'in_progress') return 'default';
  if (status === 'resolved') return 'positive';
  return 'negative';
};
