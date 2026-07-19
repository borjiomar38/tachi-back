import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  AlertCircleIcon,
  BotIcon,
  CheckCheckIcon,
  CircleAlertIcon,
  Clock3Icon,
  LoaderCircleIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';
import { useNavigateBack } from '@/hooks/use-navigate-back';

import { BackButton } from '@/components/back-button';
import { PageError } from '@/components/errors/page-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
                  <ContactConversationCard item={item} />
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

type ContactConversationMessage = ContactDetail['conversation'][number];

const ContactConversationCard = ({ item }: ContactBlockProps) => {
  const { t } = useTranslation(['contact']);
  const latestInbound = [...item.conversation]
    .reverse()
    .find((message) => message.direction === 'inbound');
  const isAwaitingAutomation =
    latestInbound &&
    ['pending', 'processing'].includes(latestInbound.automationStatus);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <MessageCircleIcon className="size-5 text-muted-foreground" />
            {t('contact:detail.conversation.title')}
          </CardTitle>
          <CardDescription>
            {t('contact:detail.conversation.description')}
          </CardDescription>
        </div>
        <Badge variant="secondary">
          {t('contact:detail.conversation.messageCount', {
            count: item.conversation.length,
          })}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/70 border-t border-border/70">
          {item.conversation.map((message) => (
            <ConversationTurn
              key={message.id}
              customerName={item.name}
              message={message}
            />
          ))}
          {item.conversation.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {t('contact:detail.conversation.empty')}
            </div>
          ) : null}
        </div>
        {isAwaitingAutomation ? (
          <div className="flex items-center gap-3 border-t border-warning-500/20 bg-warning-500/5 px-5 py-3 text-sm">
            <LoaderCircleIcon className="size-4 animate-spin text-warning-600 dark:text-warning-300" />
            <div>
              <div className="font-medium">
                {latestInbound.automationStatus === 'processing'
                  ? t('contact:detail.conversation.analyzing')
                  : t('contact:detail.conversation.awaitingAnalysis')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('contact:detail.conversation.analysisDescription')}
              </div>
            </div>
          </div>
        ) : null}
        <div className="grid gap-2 border-t border-border/70 bg-muted/15 px-5 py-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="truncate">
            {t('contact:detail.conversation.ip', {
              value:
                item.ipAddress ?? t('contact:detail.conversation.notCaptured'),
            })}
          </div>
          <div
            className="truncate sm:text-right"
            title={item.userAgent ?? undefined}
          >
            {t('contact:detail.conversation.userAgent', {
              value:
                item.userAgent ?? t('contact:detail.conversation.notCaptured'),
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ConversationTurn = ({
  customerName,
  message,
}: {
  customerName: string;
  message: ContactConversationMessage;
}) => {
  const { t } = useTranslation(['contact']);
  const isCustomer = message.direction === 'inbound';
  const occurredAt = message.sentAt ?? message.receivedAt ?? message.createdAt;
  const deliveryVariant =
    message.deliveryStatus === 'sent'
      ? 'positive'
      : message.deliveryStatus === 'failed'
        ? 'negative'
        : ['sending', 'delivery_unknown'].includes(message.deliveryStatus)
          ? 'warning'
          : 'secondary';
  const DeliveryIcon =
    message.deliveryStatus === 'sent' || message.deliveryStatus === 'received'
      ? CheckCheckIcon
      : message.deliveryStatus === 'failed'
        ? CircleAlertIcon
        : Clock3Icon;

  return (
    <article className="relative flex gap-3 px-5 py-5 sm:gap-4">
      <Avatar
        className={cn(
          'mt-0.5 ring-2 ring-background',
          !isCustomer && 'bg-brand-500 text-white'
        )}
        size="lg"
      >
        {isCustomer ? (
          <AvatarFallback name={customerName} variant="boring" />
        ) : (
          <AvatarFallback className="bg-brand-500 text-white">
            <BotIcon className="size-5" />
          </AvatarFallback>
        )}
      </Avatar>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">
                {isCustomer
                  ? customerName
                  : t('contact:detail.conversation.nayoviSupport')}
              </h3>
              <Badge variant={isCustomer ? 'secondary' : 'positive'} size="sm">
                {isCustomer
                  ? t('contact:detail.conversation.customer')
                  : message.aiGenerated
                    ? t('contact:detail.conversation.aiAssisted')
                    : t('contact:detail.conversation.support')}
              </Badge>
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {message.senderEmail}
            </div>
          </div>
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={dayjs(occurredAt).toISOString()}
          >
            {dayjs(occurredAt).format('DD/MM/YYYY HH:mm')}
          </time>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3.5">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {message.subject}
          </div>
          <p className="text-sm leading-6 whitespace-pre-wrap">
            {message.bodyText}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {t(`contact:detail.conversation.source.${message.source}`)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <DeliveryIcon className="size-3.5" />
            <Badge variant={deliveryVariant} size="sm">
              {t(
                `contact:detail.conversation.delivery.${message.deliveryStatus}`
              )}
            </Badge>
          </span>
        </div>
      </div>
    </article>
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
