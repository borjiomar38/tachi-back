import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AlertCircleIcon, MailIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const CONTACT_STATUS_OPTIONS = [
  { label: 'Unread', value: 'unread' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Spam', value: 'spam' },
] as const;

type ContactStatus = (typeof CONTACT_STATUS_OPTIONS)[number]['value'];

export const PageContact = (props: { params: { id: string } }) => {
  const queryClient = useQueryClient();
  const { navigateBack } = useNavigateBack();
  const detailQuery = useQuery(
    orpc.contact.getById.queryOptions({
      input: {
        id: props.params.id,
      },
    })
  );

  const [status, setStatus] = useState<ContactStatus>('unread');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (detailQuery.status !== 'success') return;
    setStatus(detailQuery.data.status);
    setInternalNotes(detailQuery.data.internalNotes ?? '');
  }, [detailQuery.data, detailQuery.status]);

  const updateMutation = useMutation({
    mutationFn: async () =>
      await orpc.contact.updateById.call({
        id: props.params.id,
        internalNotes,
        status,
      }),
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.contact.getAll.key(),
          type: 'all',
        }),
        queryClient.setQueryData(
          orpc.contact.getById.key({
            input: { id: props.params.id },
          }),
          updated
        ),
      ]);
      toast.success('Contact message updated');
    },
    onError: () => {
      toast.error('Failed to update the contact message');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      await orpc.contact.deleteById.call({
        id: props.params.id,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.contact.getAll.key(),
          type: 'all',
        }),
        queryClient.removeQueries({
          queryKey: orpc.contact.getById.key({
            input: { id: props.params.id },
          }),
        }),
      ]);
      toast.success('Contact message deleted');
      navigateBack();
    },
    onError: () => {
      toast.error('Failed to delete the contact message');
    },
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
                title="Delete contact message?"
                description="This permanently removes the submission from the backoffice inbox."
                confirmText="Delete message"
                confirmVariant="destructive"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  loading={deleteMutation.isPending}
                >
                  <Trash2Icon />
                  Delete
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
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      label="Status"
                      value={formatStatus(item.status)}
                      subLabel={`Created ${dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}`}
                    />
                    <SummaryCard
                      label="Sender"
                      value={item.name}
                      subLabel={item.email}
                    />
                    <SummaryCard
                      label="Assigned"
                      value={item.assignedTo?.name ?? 'Unassigned'}
                      subLabel={
                        item.assignedTo?.email ?? 'Will be assigned on update'
                      }
                    />
                    <SummaryCard
                      label="Source"
                      value={item.source}
                      subLabel={
                        item.readAt
                          ? `Read ${dayjs(item.readAt).fromNow()}`
                          : 'Unread'
                      }
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Customer message</CardTitle>
                      <CardDescription>
                        Submitted from the public contact form and stored
                        directly in the database.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {formatStatus(item.status)}
                        </Badge>
                        <a
                          href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`}
                          className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary"
                        >
                          <MailIcon className="size-4" />
                          Reply by email
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
                            IP address
                          </div>
                          <div>{item.ipAddress ?? 'Not captured'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            User agent
                          </div>
                          <div className="break-all">
                            {item.userAgent ?? 'Not captured'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <WithPermissions permissions={[permissionContact.update]}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Workflow</CardTitle>
                      <CardDescription>
                        Update status, add internal notes, and assign the
                        message to yourself for follow-up.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Status</p>
                        <Select
                          items={CONTACT_STATUS_OPTIONS}
                          value={status}
                          onValueChange={(value) =>
                            setStatus(value as ContactStatus)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {CONTACT_STATUS_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Internal notes</p>
                        <Textarea
                          rows={10}
                          value={internalNotes}
                          onChange={(event) =>
                            setInternalNotes(event.currentTarget.value)
                          }
                          placeholder="Summarize what support learned, what was promised, or why the message was marked as spam."
                        />
                      </div>

                      <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-4 text-sm">
                        <div>
                          <div className="font-medium text-foreground">
                            Resolved at
                          </div>
                          <div className="text-muted-foreground">
                            {item.resolvedAt
                              ? dayjs(item.resolvedAt).format(
                                  'DD/MM/YYYY HH:mm'
                                )
                              : 'Not resolved yet'}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            Last updated
                          </div>
                          <div className="text-muted-foreground">
                            {dayjs(item.updatedAt).format('DD/MM/YYYY HH:mm')}
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => updateMutation.mutate()}
                        loading={updateMutation.isPending}
                      >
                        Save changes
                      </Button>
                    </CardContent>
                  </Card>
                </WithPermissions>
              </div>
            ))
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

const SummaryCard = (props: {
  label: string;
  subLabel: string;
  value: string;
}) => (
  <Card>
    <CardHeader className="gap-2">
      <CardTitle className="text-base">{props.label}</CardTitle>
      <CardDescription>{props.subLabel}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-lg font-semibold tracking-tight">{props.value}</div>
    </CardContent>
  </Card>
);

const formatStatus = (status: ContactStatus) =>
  status === 'in_progress'
    ? 'In progress'
    : status.charAt(0).toUpperCase() + status.slice(1);

const getStatusBadgeVariant = (status: ContactStatus) => {
  if (status === 'unread') return 'warning';
  if (status === 'in_progress') return 'default';
  if (status === 'resolved') return 'positive';
  return 'negative';
};
