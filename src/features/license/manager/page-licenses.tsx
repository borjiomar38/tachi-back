import { getUiState } from '@bearstudio/ui-state';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

type SupportLookupResult = Awaited<
  ReturnType<typeof orpc.license.searchSupport.call>
>[number];

type ManualGrantResult = Awaited<
  ReturnType<typeof orpc.license.createManualGrant.call>
>;

export const PageLicenses = (props: { search: { searchTerm?: string } }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchTerm = props.search.searchTerm ?? '';
  const normalizedSearchTerm = searchTerm.trim();
  const shouldSearch = normalizedSearchTerm.length >= 2;

  const searchInputProps = {
    value: searchTerm,
    onChange: (value: string) =>
      router.navigate({
        replace: true,
        search: { searchTerm: value },
        to: '.',
      }),
  };

  const searchQuery = useQuery({
    ...orpc.license.searchSupport.queryOptions({
      input: {
        query: normalizedSearchTerm,
      },
    }),
    enabled: shouldSearch,
  });

  const [manualGrantResult, setManualGrantResult] =
    useState<ManualGrantResult | null>(null);

  const manualGrant = useMutation(
    orpc.license.createManualGrant.mutationOptions({
      onSuccess: async (result) => {
        setManualGrantResult(result);
        toast.success('Redeem code generated');
        await queryClient.invalidateQueries({
          queryKey: orpc.license.searchSupport.key(),
          type: 'all',
        });
      },
      onError: () => {
        toast.error('Unable to generate redeem code');
      },
    })
  );

  const handleManualGrantSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const tokenAmount = Number(formData.get('tokenAmount'));
    const ownerEmail = String(formData.get('ownerEmail') ?? '').trim();
    const expiresAt = String(formData.get('expiresAt') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();

    if (!Number.isInteger(tokenAmount) || tokenAmount <= 0) {
      toast.error('Token amount must be a positive whole number');
      return;
    }

    manualGrant.mutate({
      deviceLimit: 0,
      notes: notes || undefined,
      ownerEmail: ownerEmail || undefined,
      redeemCodeExpiresAt: expiresAt ? new Date(expiresAt) : undefined,
      tokenAmount,
    });
  };

  const ui = getUiState((set) => {
    if (!shouldSearch) {
      return set('idle');
    }

    if (searchQuery.status === 'pending') {
      return set('pending');
    }

    if (searchQuery.status === 'error') {
      return set('error');
    }

    if (!searchQuery.data.length) {
      return set('empty');
    }

    return set('default', {
      items: searchQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionLicense.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Support Lookup</PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...searchInputProps}
            className="max-w-sm max-md:hidden"
            size="sm"
          />
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-6xl">
          <WithPermissions permissions={[permissionLicense.manualCredit]}>
            <Card>
              <CardHeader>
                <CardTitle>Generate redeem code</CardTitle>
                <CardDescription>
                  Create a fresh hosted-access redeem code with manual token
                  credit. Codes stay usable across devices until they expire.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_14rem_auto]"
                  onSubmit={handleManualGrantSubmit}
                >
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Owner email</span>
                    <Input
                      name="ownerEmail"
                      placeholder="optional"
                      size="sm"
                      type="email"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Tokens</span>
                    <Input
                      defaultValue={100}
                      inputMode="numeric"
                      name="tokenAmount"
                      required
                      size="sm"
                      type="number"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Expires at</span>
                    <Input name="expiresAt" size="sm" type="datetime-local" />
                  </label>
                  <div className="flex items-end">
                    <Button
                      className="w-full md:w-auto"
                      loading={manualGrant.isPending}
                      size="sm"
                      type="submit"
                    >
                      Generate
                    </Button>
                  </div>
                  <label className="grid gap-1.5 text-sm md:col-span-3">
                    <span className="font-medium">Notes</span>
                    <Textarea
                      name="notes"
                      placeholder="optional internal note"
                      rows={2}
                      size="sm"
                    />
                  </label>
                  {manualGrantResult ? (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm md:col-span-4">
                      <div className="font-medium">
                        Redeem code: {manualGrantResult.redeemCode}
                      </div>
                      <div className="text-muted-foreground">
                        License {manualGrantResult.licenseKey} ·{' '}
                        {manualGrantResult.tokenAmount} tokens
                      </div>
                    </div>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          </WithPermissions>
          {ui
            .match('idle', () => (
              <Card>
                <CardHeader>
                  <CardTitle>Support Lookup</CardTitle>
                  <CardDescription>
                    Type at least 2 characters in the search box to find a
                    license, redeem code, device installation, or order.
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
            .match('pending', () => (
              <DataList>
                <DataListRowResults
                  withClearButton
                  onClear={() =>
                    router.navigate({
                      replace: true,
                      search: { searchTerm: '' },
                      to: '.',
                    })
                  }
                >
                  {`Results for "${normalizedSearchTerm}"`}
                </DataListRowResults>
                <DataListLoadingState />
              </DataList>
            ))
            .match('error', () => (
              <DataList>
                <DataListRowResults
                  withClearButton
                  onClear={() =>
                    router.navigate({
                      replace: true,
                      search: { searchTerm: '' },
                      to: '.',
                    })
                  }
                >
                  {`Results for "${normalizedSearchTerm}"`}
                </DataListRowResults>
                <DataListErrorState retry={() => searchQuery.refetch()} />
              </DataList>
            ))
            .match('empty', () => (
              <DataList>
                <DataListRowResults
                  withClearButton
                  onClear={() =>
                    router.navigate({
                      replace: true,
                      search: { searchTerm: '' },
                      to: '.',
                    })
                  }
                >
                  {`Results for "${normalizedSearchTerm}"`}
                </DataListRowResults>
                <DataListEmptyState searchTerm={normalizedSearchTerm} />
              </DataList>
            ))
            .match('default', ({ items }) => (
              <DataList>
                <DataListRowResults
                  withClearButton
                  onClear={() =>
                    router.navigate({
                      replace: true,
                      search: { searchTerm: '' },
                      to: '.',
                    })
                  }
                >
                  {`Results for "${normalizedSearchTerm}"`}
                </DataListRowResults>
                {items.map((item) => {
                  const linkProps =
                    item.entityType === 'device'
                      ? {
                          params: { id: item.deviceId },
                          to: '/manager/devices/$id' as const,
                        }
                      : item.key
                        ? {
                            params: { key: item.key },
                            to: '/manager/licenses/$key' as const,
                          }
                        : null;

                  return (
                    <DataListRow
                      key={`${item.entityType}-${getItemKey(item)}`}
                      withHover
                    >
                      <DataListCell className="flex-none">
                        <Badge variant={getEntityBadgeVariant(item.entityType)}>
                          {item.entityType.replace('_', ' ')}
                        </Badge>
                      </DataListCell>
                      <DataListCell>
                        <DataListText className="font-medium">
                          {linkProps ? (
                            <Link {...linkProps}>
                              {getPrimaryLabel(item)}
                              <span className="absolute inset-0" />
                            </Link>
                          ) : (
                            getPrimaryLabel(item)
                          )}
                        </DataListText>
                        <DataListText className="text-xs text-muted-foreground">
                          {getSecondaryLabel(item)}
                        </DataListText>
                      </DataListCell>
                      <DataListCell className="max-w-56 max-sm:hidden">
                        <DataListTextHeader>Matched On</DataListTextHeader>
                        <DataListText className="text-xs text-muted-foreground">
                          {item.matchedOn}
                        </DataListText>
                        <DataListText className="text-xs">
                          {item.matchedValue}
                        </DataListText>
                      </DataListCell>
                      <DataListCell className="flex-[0.55] max-md:hidden">
                        <DataListTextHeader>Status</DataListTextHeader>
                        <DataListText className="text-xs">
                          {getStatusLabel(item)}
                        </DataListText>
                      </DataListCell>
                    </DataListRow>
                  );
                })}
              </DataList>
            ))
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function getItemKey(item: SupportLookupResult) {
  switch (item.entityType) {
    case 'device':
      return item.deviceId;
    case 'order':
      return item.id;
    case 'redeem_code':
      return item.code;
    case 'license':
      return item.key;
  }
}

function getPrimaryLabel(item: SupportLookupResult) {
  switch (item.entityType) {
    case 'device':
      return item.installationId;
    case 'order':
      return item.id;
    case 'redeem_code':
      return item.code;
    case 'license':
      return item.key;
  }
}

function getSecondaryLabel(item: SupportLookupResult) {
  switch (item.entityType) {
    case 'device':
      return item.key
        ? `License ${item.key}${item.lastSeenAt ? ` · last seen ${dayjs(item.lastSeenAt).fromNow()}` : ''}`
        : 'No attached license yet';
    case 'order':
      return `${item.payerEmail ?? 'No payer email'} · ${(item.amountTotalCents / 100).toFixed(2)} ${item.currency.toUpperCase()}`;
    case 'redeem_code':
      return `License ${item.key}${item.ownerEmail ? ` · ${item.ownerEmail}` : ''}`;
    case 'license':
      return `${item.ownerEmail ?? 'No owner email'} · ${item.activeDeviceCount} active device${item.activeDeviceCount === 1 ? '' : 's'}`;
  }
}

function getStatusLabel(item: SupportLookupResult) {
  switch (item.entityType) {
    case 'device':
      return item.status;
    case 'order':
      return item.status;
    case 'redeem_code':
      return item.status;
    case 'license':
      return item.status;
  }
}

function getEntityBadgeVariant(entityType: string) {
  switch (entityType) {
    case 'device':
      return 'secondary' as const;
    case 'order':
      return 'warning' as const;
    case 'redeem_code':
      return 'warning' as const;
    case 'license':
      return 'default' as const;
    default:
      return 'secondary' as const;
  }
}
