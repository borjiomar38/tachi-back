import { getUiState } from '@bearstudio/ui-state';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import {
  BanIcon,
  CheckCircle2Icon,
  ClipboardCopyIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { orpc } from '@/lib/orpc/client';
import { useClipboard } from '@/hooks/use-clipboard';

import { Form } from '@/components/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DataList,
  DataListCell,
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListRowResults,
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';
import { Textarea } from '@/components/ui/textarea';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionLicense } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

type RedeemCodeItem = Awaited<
  ReturnType<typeof orpc.license.listRedeemCodes.call>
>[number];

type RedeemCodeStatus = 'all' | RedeemCodeItem['status'];

const redeemCodeStatuses = [
  'all',
  'available',
  'redeemed',
  'expired',
  'canceled',
] satisfies RedeemCodeStatus[];

const zGenerateRedeemCodeForm = z.object({
  deviceLimit: z.coerce.number().int().min(0).max(10),
  licenseKey: z.string().trim().max(128),
  notes: z.string().trim().max(500),
  ownerEmail: z.union([z.email(), z.literal('')]),
  redeemCodeExpiresAt: z.string().trim(),
  tokenAmount: z.coerce.number().int().positive().max(1_000_000),
});

type GenerateRedeemCodeForm = z.infer<typeof zGenerateRedeemCodeForm>;

const zAdjustRedeemCodeForm = z.object({
  deviceLimit: z.coerce.number().int().min(0).max(10),
  licenseStatus: z.enum([
    'pending',
    'active',
    'suspended',
    'revoked',
    'expired',
  ]),
  notes: z.string().trim().max(500),
  redeemCodeExpiresAt: z.string().trim(),
  status: z.enum(['available', 'expired', 'canceled']),
  tokenDelta: z.coerce.number().int().min(-1_000_000).max(1_000_000),
});

type AdjustRedeemCodeForm = z.infer<typeof zAdjustRedeemCodeForm>;

export const PageLicenses = (props: {
  search: { searchTerm?: string; status?: RedeemCodeStatus };
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const searchTerm = props.search.searchTerm ?? '';
  const status = props.search.status ?? 'all';
  const normalizedSearchTerm = searchTerm.trim();

  const generateForm = useForm({
    resolver: zodResolver(zGenerateRedeemCodeForm),
    values: {
      deviceLimit: 0,
      licenseKey: '',
      notes: '',
      ownerEmail: '',
      redeemCodeExpiresAt: '',
      tokenAmount: 100,
    },
  });

  const searchInputProps = {
    value: searchTerm,
    onChange: (value: string) =>
      router.navigate({
        replace: true,
        search: { searchTerm: value, status },
        to: '.',
      }),
  };

  const handleStatusChange = (nextStatus: RedeemCodeStatus) =>
    router.navigate({
      replace: true,
      search: {
        searchTerm,
        status: nextStatus,
      },
      to: '.',
    });

  const invalidateRedeemCodes = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.license.listRedeemCodes.key(),
      type: 'all',
    });
  };

  const redeemCodesQuery = useQuery(
    orpc.license.listRedeemCodes.queryOptions({
      input: {
        query: normalizedSearchTerm || undefined,
        status,
      },
    })
  );

  const generateRedeemCode = useMutation(
    orpc.license.createRedeemCode.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`Redeem generated: ${result.redeemCode}`);
        generateForm.reset();
        setIsGenerateOpen(false);
        await invalidateRedeemCodes();
      },
      onError: () => {
        toast.error('Unable to generate redeem code.');
      },
    })
  );

  const updateRedeemCodeStatus = useMutation(
    orpc.license.updateRedeemCodeStatus.mutationOptions({
      onSuccess: async () => {
        toast.success('Redeem status updated.');
        await invalidateRedeemCodes();
      },
      onError: () => {
        toast.error('Unable to update redeem status.');
      },
    })
  );

  const deleteRedeemCode = useMutation(
    orpc.license.deleteRedeemCode.mutationOptions({
      onSuccess: async () => {
        toast.success('Redeem deleted.');
        await invalidateRedeemCodes();
      },
      onError: () => {
        toast.error('Unable to delete redeem code.');
      },
    })
  );

  const regenerateRedeemCode = useMutation(
    orpc.license.regenerateRedeemCode.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`New redeem generated: ${result.redeemCode}`);
        await invalidateRedeemCodes();
      },
      onError: () => {
        toast.error('Unable to regenerate redeem code.');
      },
    })
  );

  const adjustRedeemCode = useMutation(
    orpc.license.adjustRedeemCode.mutationOptions({
      onSuccess: async (result) => {
        toast.success(
          `Redeem updated. ${result.availableTokens.toLocaleString()} tokens available.`
        );
        await invalidateRedeemCodes();
      },
      onError: () => {
        toast.error('Unable to update redeem.');
      },
    })
  );

  const ui = getUiState((set) => {
    if (redeemCodesQuery.status === 'pending') {
      return set('pending');
    }

    if (redeemCodesQuery.status === 'error') {
      return set('error');
    }

    if (!redeemCodesQuery.data.length) {
      return set('empty');
    }

    return set('default', {
      items: redeemCodesQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionLicense.read]}>
      <PageLayout>
        <PageLayoutTopBar
          endActions={
            <>
              <SearchButton
                {...searchInputProps}
                className="-mx-2 md:hidden"
                size="icon-sm"
              />
              <WithPermissions permissions={[permissionLicense.manualCredit]}>
                <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                  <DialogTrigger render={<Button size="sm" />}>
                    <PlusIcon />
                    Generate redeem
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <Form
                      {...generateForm}
                      onSubmit={(values: GenerateRedeemCodeForm) => {
                        generateRedeemCode.mutate({
                          deviceLimit: values.deviceLimit,
                          licenseKey: values.licenseKey || undefined,
                          notes: values.notes || undefined,
                          ownerEmail: values.ownerEmail || undefined,
                          redeemCodeExpiresAt: values.redeemCodeExpiresAt
                            ? new Date(values.redeemCodeExpiresAt)
                            : undefined,
                          tokenAmount: values.tokenAmount,
                        });
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle>Generate redeem</DialogTitle>
                        <DialogDescription>
                          Create an independent license and redeem code. Enter a
                          license key only when you intentionally want to add
                          credit to an existing license wallet.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogBody className="gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormFieldError
                            error={generateForm.formState.errors.ownerEmail}
                            label="Owner email"
                          >
                            <Input
                              placeholder="customer@example.com"
                              size="sm"
                              type="email"
                              {...generateForm.register('ownerEmail')}
                            />
                          </FormFieldError>
                          <FormFieldError
                            error={generateForm.formState.errors.licenseKey}
                            label="License key"
                          >
                            <Input
                              placeholder="optional existing license"
                              size="sm"
                              {...generateForm.register('licenseKey')}
                            />
                          </FormFieldError>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FormFieldError
                            error={generateForm.formState.errors.tokenAmount}
                            label="Tokens"
                          >
                            <Input
                              inputMode="numeric"
                              min={1}
                              size="sm"
                              type="number"
                              {...generateForm.register('tokenAmount')}
                            />
                          </FormFieldError>
                          <FormFieldError
                            error={generateForm.formState.errors.deviceLimit}
                            label="Device limit"
                          >
                            <Input
                              inputMode="numeric"
                              min={0}
                              size="sm"
                              type="number"
                              {...generateForm.register('deviceLimit')}
                            />
                          </FormFieldError>
                          <FormFieldError
                            error={
                              generateForm.formState.errors.redeemCodeExpiresAt
                            }
                            label="Expires at"
                          >
                            <Input
                              size="sm"
                              type="datetime-local"
                              {...generateForm.register('redeemCodeExpiresAt')}
                            />
                          </FormFieldError>
                        </div>
                        <FormFieldError
                          error={generateForm.formState.errors.notes}
                          label="Notes"
                        >
                          <Textarea
                            placeholder="optional internal note"
                            rows={3}
                            size="sm"
                            {...generateForm.register('notes')}
                          />
                        </FormFieldError>
                      </DialogBody>
                      <DialogFooter>
                        <DialogClose
                          render={<Button type="button" variant="secondary" />}
                        >
                          Cancel
                        </DialogClose>
                        <Button
                          className="min-w-24"
                          loading={generateRedeemCode.isPending}
                          type="submit"
                        >
                          Generate
                        </Button>
                      </DialogFooter>
                    </Form>
                  </DialogContent>
                </Dialog>
              </WithPermissions>
            </>
          }
        >
          <PageLayoutTopBarTitle>Redeem codes</PageLayoutTopBarTitle>
          <SearchInput
            {...searchInputProps}
            className="max-w-sm max-md:hidden"
            placeholder="Search code, email, license"
            size="sm"
          />
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm max-sm:hidden"
            value={status}
            onChange={(event) =>
              handleStatusChange(event.currentTarget.value as RedeemCodeStatus)
            }
          >
            {redeemCodeStatuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption === 'all' ? 'All statuses' : statusOption}
              </option>
            ))}
          </select>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl">
          <select
            className="mb-3 h-9 w-full rounded-md border bg-background px-2 text-sm sm:hidden"
            value={status}
            onChange={(event) =>
              handleStatusChange(event.currentTarget.value as RedeemCodeStatus)
            }
          >
            {redeemCodeStatuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption === 'all' ? 'All statuses' : statusOption}
              </option>
            ))}
          </select>
          <DataList>
            <DataListRowResults
              withClearButton={!!normalizedSearchTerm || status !== 'all'}
              onClear={() =>
                router.navigate({
                  replace: true,
                  search: { searchTerm: '', status: 'all' },
                  to: '.',
                })
              }
            >
              {getResultsLabel(normalizedSearchTerm, status)}
            </DataListRowResults>
            {ui
              .match('pending', () => <DataListLoadingState />)
              .match('error', () => (
                <DataListErrorState retry={() => redeemCodesQuery.refetch()} />
              ))
              .match('empty', () => (
                <DataListEmptyState searchTerm={normalizedSearchTerm}>
                  No redeem codes yet.
                </DataListEmptyState>
              ))
              .match('default', ({ items }) => (
                <>
                  {items.map((item) => (
                    <RedeemCodeRow
                      key={item.id}
                      item={item}
                      onDelete={(code) =>
                        deleteRedeemCode.mutateAsync({ code })
                      }
                      onRegenerate={(code) =>
                        regenerateRedeemCode.mutateAsync({ code })
                      }
                      onAdjust={(input) => adjustRedeemCode.mutateAsync(input)}
                      onSetStatus={(code, status) =>
                        updateRedeemCodeStatus.mutateAsync({ code, status })
                      }
                    />
                  ))}
                </>
              ))
              .exhaustive()}
          </DataList>
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

const RedeemCodeRow = (props: {
  item: RedeemCodeItem;
  onAdjust: (input: {
    code: string;
    deviceLimit?: number;
    licenseStatus?: RedeemCodeItem['licenseStatus'];
    notes?: string;
    redeemCodeExpiresAt?: Date | null;
    status?: 'available' | 'expired' | 'canceled';
    tokenDelta?: number;
  }) => Promise<unknown>;
  onDelete: (code: string) => Promise<unknown>;
  onRegenerate: (code: string) => Promise<unknown>;
  onSetStatus: (
    code: string,
    status: 'available' | 'expired' | 'canceled'
  ) => Promise<unknown>;
}) => {
  const item = props.item;
  const isRedeemed = item.status === 'redeemed';
  const { copyToClipboard } = useClipboard();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const adjustForm = useForm({
    resolver: zodResolver(zAdjustRedeemCodeForm),
    defaultValues: {
      deviceLimit: item.deviceLimit,
      licenseStatus: item.licenseStatus,
      notes: '',
      redeemCodeExpiresAt: toDatetimeLocalValue(item.expiresAt),
      status: item.status === 'redeemed' ? 'available' : item.status,
      tokenDelta: 0,
    },
  });

  const copyRedeemCode = () => {
    copyToClipboard(item.code);
    toast.success('Redeem copied to clipboard.');
  };

  return (
    <DataListRow
      className="flex-col gap-1 py-2 sm:flex-row sm:items-stretch"
      withHover
    >
      <DataListCell className="gap-1 sm:flex-[1.1]">
        <div className="flex w-full min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Copy redeem code ${item.code}`}
            className="min-w-0 truncate rounded-sm text-left font-mono text-sm font-medium outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
            title={`Copy ${item.code}`}
            onClick={copyRedeemCode}
          >
            {item.code}
          </button>
          <Badge variant={getRedeemStatusVariant(item.status)}>
            {item.status}
          </Badge>
        </div>
        <DataListText className="text-xs text-muted-foreground">
          Created {formatDate(item.createdAt)}
        </DataListText>
      </DataListCell>

      <DataListCell className="sm:flex-[1.1]">
        <DataListTextHeader>Email / License</DataListTextHeader>
        <DataListText>{item.ownerEmail ?? 'No owner email'}</DataListText>
        <DataListText className="text-xs text-muted-foreground">
          <Link params={{ key: item.licenseKey }} to="/manager/licenses/$key">
            {item.licenseKey}
          </Link>{' '}
          · {item.licenseStatus} · {item.deviceLimit} device limit
        </DataListText>
      </DataListCell>

      <DataListCell className="sm:flex-[1.1]">
        <DataListTextHeader>License balance</DataListTextHeader>
        <DataListText>
          {item.availableTokens.toLocaleString()} available
        </DataListText>
        <DataListText className="text-xs text-muted-foreground">
          {item.creditedTokens.toLocaleString()} total credited ·{' '}
          {item.spentTokens.toLocaleString()} spent
        </DataListText>
      </DataListCell>

      <DataListCell className="sm:flex-[1.2]">
        <DataListTextHeader>Redeemed / Device</DataListTextHeader>
        <DataListText>{formatNullableDate(item.redeemedAt)}</DataListText>
        <DataListText className="text-xs text-muted-foreground">
          {item.redeemedByDevice ? (
            <Link
              params={{ id: item.redeemedByDevice.id }}
              to="/manager/devices/$id"
            >
              {item.redeemedByDevice.installationId}
            </Link>
          ) : (
            'Not redeemed yet'
          )}
        </DataListText>
      </DataListCell>

      <DataListCell className="sm:flex-[0.9]">
        <DataListTextHeader>Expiry / Ledger</DataListTextHeader>
        <DataListText>{formatNullableDate(item.expiresAt)}</DataListText>
        <DataListText className="text-xs text-muted-foreground">
          Last ledger {formatNullableDate(item.lastLedgerAt)}
        </DataListText>
      </DataListCell>

      <DataListCell className="items-end sm:flex-none">
        <WithPermissions permissions={[permissionLicense.generateRedeemCode]}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={`Actions for ${item.code}`}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={copyRedeemCode}>
                  <ClipboardCopyIcon />
                  Copy redeem
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <PencilIcon />
                  Edit redeem
                </DropdownMenuItem>
                {item.status !== 'available' && !isRedeemed ? (
                  <DropdownMenuItem
                    onClick={() => props.onSetStatus(item.code, 'available')}
                  >
                    <CheckCircle2Icon />
                    Reactivate
                  </DropdownMenuItem>
                ) : null}
                {item.status === 'available' ? (
                  <DropdownMenuItem
                    onClick={() => props.onSetStatus(item.code, 'canceled')}
                  >
                    <BanIcon />
                    Deactivate
                  </DropdownMenuItem>
                ) : null}
                {item.status === 'available' ? (
                  <DropdownMenuItem
                    onClick={() => props.onSetStatus(item.code, 'expired')}
                  >
                    <RotateCcwIcon />
                    Expire
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => props.onRegenerate(item.code)}>
                  <RefreshCcwIcon />
                  Regenerate
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </WithPermissions>
      </DataListCell>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <Form
            {...adjustForm}
            onSubmit={(values: AdjustRedeemCodeForm) => {
              props
                .onAdjust({
                  code: item.code,
                  deviceLimit: values.deviceLimit,
                  licenseStatus: values.licenseStatus,
                  notes: values.notes || undefined,
                  redeemCodeExpiresAt: values.redeemCodeExpiresAt
                    ? new Date(values.redeemCodeExpiresAt)
                    : null,
                  status: isRedeemed ? undefined : values.status,
                  tokenDelta: values.tokenDelta || undefined,
                })
                .then(() => setIsEditOpen(false));
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit redeem</DialogTitle>
              <DialogDescription>
                Adjust tokens, expiry, redeem status, or license access for{' '}
                {item.code}.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <FormFieldError
                  error={adjustForm.formState.errors.tokenDelta}
                  label="Token delta"
                >
                  <Input
                    inputMode="numeric"
                    size="sm"
                    type="number"
                    {...adjustForm.register('tokenDelta')}
                  />
                </FormFieldError>
                <FormFieldError
                  error={adjustForm.formState.errors.deviceLimit}
                  label="Device limit"
                >
                  <Input
                    inputMode="numeric"
                    min={0}
                    size="sm"
                    type="number"
                    {...adjustForm.register('deviceLimit')}
                  />
                </FormFieldError>
                <FormFieldError
                  error={adjustForm.formState.errors.redeemCodeExpiresAt}
                  label="Expires at"
                >
                  <Input
                    size="sm"
                    type="datetime-local"
                    {...adjustForm.register('redeemCodeExpiresAt')}
                  />
                </FormFieldError>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormFieldError
                  error={adjustForm.formState.errors.status}
                  label="Redeem status"
                >
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    disabled={isRedeemed}
                    {...adjustForm.register('status')}
                  >
                    <option value="available">available</option>
                    <option value="expired">expired</option>
                    <option value="canceled">canceled</option>
                  </select>
                </FormFieldError>
                <FormFieldError
                  error={adjustForm.formState.errors.licenseStatus}
                  label="License status"
                >
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    {...adjustForm.register('licenseStatus')}
                  >
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                    <option value="revoked">revoked</option>
                    <option value="expired">expired</option>
                  </select>
                </FormFieldError>
              </div>
              <FormFieldError
                error={adjustForm.formState.errors.notes}
                label="Adjustment note"
              >
                <Textarea
                  placeholder="Optional reason for the token or access change"
                  rows={3}
                  size="sm"
                  {...adjustForm.register('notes')}
                />
              </FormFieldError>
            </DialogBody>
            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="secondary" />}
              >
                Cancel
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {item.code}?</DialogTitle>
            <DialogDescription>
              This removes the redeem code record from the manager. Ledger
              history remains attached to the license.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="secondary" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                props.onDelete(item.code).then(() => setIsDeleteOpen(false));
              }}
            >
              Delete redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataListRow>
  );
};

const FormFieldError = (props: {
  children: ReactNode;
  error?: { message?: string };
  label: string;
}) => {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{props.label}</span>
      {props.children}
      {props.error?.message ? (
        <span className="text-xs text-destructive">{props.error.message}</span>
      ) : null}
    </label>
  );
};

function getResultsLabel(searchTerm: string, status: RedeemCodeStatus) {
  if (searchTerm && status !== 'all') {
    return `Redeems matching "${searchTerm}" · ${status}`;
  }

  if (searchTerm) {
    return `Redeems matching "${searchTerm}"`;
  }

  if (status !== 'all') {
    return `Redeems filtered by ${status}`;
  }

  return 'Latest redeem codes';
}

function formatDate(date: Date | string) {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

function formatNullableDate(date: Date | string | null | undefined) {
  return date ? formatDate(date) : 'Never';
}

function toDatetimeLocalValue(date: Date | string | null | undefined) {
  return date ? dayjs(date).format('YYYY-MM-DDTHH:mm') : '';
}

function getRedeemStatusVariant(status: RedeemCodeItem['status']) {
  switch (status) {
    case 'available':
      return 'positive' as const;
    case 'redeemed':
      return 'default' as const;
    case 'expired':
      return 'warning' as const;
    case 'canceled':
      return 'negative' as const;
  }
}
