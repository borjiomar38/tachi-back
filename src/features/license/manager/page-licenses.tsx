import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';

import { orpc } from '@/lib/orpc/client';

import { Badge } from '@/components/ui/badge';
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
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionLicense } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

type SupportLookupResult = Awaited<
  ReturnType<typeof orpc.license.searchSupport.call>
>[number];

export const PageLicenses = (props: { search: { searchTerm?: string } }) => {
  const router = useRouter();
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
          {ui
            .match('idle', () => (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Search by operational identifiers</CardTitle>
                    <CardDescription>
                      Look up a customer by license key, redeem code,
                      installation ID, order ID, Lemon Squeezy IDs, or email.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Enter at least 2 characters in the search box to start a
                    support lookup.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>License-first support flow</CardTitle>
                    <CardDescription>
                      Most payment, redeem, and balance questions resolve from
                      the license detail view.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Search results will route licenses, redeem codes, and paid
                    orders back to the attached license whenever one exists.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Seeded demo queries</CardTitle>
                    <CardDescription>
                      The local seed now includes fake commerce and job data so
                      you can inspect the backoffice flow immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">
                        alex.reader@demo.local
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        DEMO-ALEX-PRO-001
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        inst_demo_pixel8_alex
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        lic_demo_unredeemed
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Device visibility</CardTitle>
                    <CardDescription>
                      Installation-bound devices remain inspectable even without
                      end-user accounts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Device results link straight to the bound installation so
                    support can inspect status and revoke access when needed.
                  </CardContent>
                </Card>
              </div>
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
