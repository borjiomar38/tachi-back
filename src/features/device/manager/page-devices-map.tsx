import { getUiState } from '@bearstudio/ui-state';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  Clock3,
  Globe2,
  KeyRound,
  Languages,
  LocateFixed,
  MapPinned,
  Network,
  PackageCheck,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DataList,
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListRowResults,
} from '@/components/ui/datalist';
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionDevice } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const statusFilters = [
  'all',
  'active',
  'blocked',
  'pending',
  'revoked',
] as const;

const licenseFilters = ['all', 'linked', 'unlinked'] as const;

const DEFAULT_SEARCH_FILTERS = {
  country: 'all',
  linked: 'all',
  searchTerm: '',
  status: 'all',
} as const;

const DEFAULT_MAP_CENTER: [number, number] = [20, 0];
const DEFAULT_MAP_PADDING: [number, number] = [22, 22];

const numberFormatter = new Intl.NumberFormat();
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const regionDisplayNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, { type: 'region' })
    : null;
const languageDisplayNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, { type: 'language' })
    : null;

const mapCopy = {
  all: 'All',
  appVersion: 'App version',
  backToList: 'Back to list',
  blockFreeAccessIp: 'Block free access',
  blockFreeAccessIpDescription:
    'Free-trial users from this IP will see a subscription-required message with a pricing link.',
  blockFreeAccessIpError: 'Failed to block free access for this IP.',
  blockFreeAccessIpSuccess: 'Free access blocked for this IP.',
  blockFreeAccessIpTitle: 'Block free access from this IP?',
  buildUnknown: 'Unknown build',
  country: 'Country',
  countryFilterHint: 'Countries in current results',
  countryIp: 'Country / IP',
  countryUnknown: 'Unknown country',
  empty: 'No installs found yet.',
  emptyFiltered: 'No installs match the current filters.',
  exactPlacementHint: 'Exact coordinates from install metadata',
  exactPlacementLabel: 'Exact point',
  freeAccessBlocked: 'Free access blocked',
  countryLevelHint: 'Country-level placement',
  countryLevelLabel: 'Country level',
  geocoded: 'On map',
  geocodedHint: 'Installs with coordinates or country placement',
  geocodedResults: 'Showing',
  groupedCountries: 'Map markers',
  groupedCountriesHint: 'Countries or coordinates with visible installs',
  installId: 'Install ID',
  installsMapTitle: 'Installs map',
  ipMissing: 'No IP captured',
  ipRelatedMails: 'Mails',
  ipSharedInstalls: 'installs share this IP',
  language: 'Language',
  lastSeen: 'Last seen',
  license: 'License',
  linked: 'Linked',
  linkedShare: 'share of matched installs',
  localeMissing: 'No locale',
  mapAriaLabel: 'Install locations map',
  mapAssetsError: 'Failed to load map assets.',
  mapListDescription: 'Review installs and open details from the side list.',
  mapListEmpty:
    'No installs in the current result set can be placed on the map.',
  mapListTitle: 'Installs on map',
  mapPanelDescription:
    'Use the map to inspect install distribution and marker-level counts.',
  mapPanelEmpty: 'No installs can be placed on the map for current filters.',
  mapPanelTitle: 'Map view',
  matchedInstalls: 'Matched installs',
  matchedInstallsHint: 'Total installs matching current filters',
  neverSeen: 'Never seen',
  noActiveLicense: 'No active license',
  noRedeemCode: 'No redeem code',
  noVersion: 'No version',
  openInstall: 'Open install',
  platform: 'Platform',
  platformMissing: 'Unknown platform',
  popupStatus: 'Status',
  redeemCode: 'Redeem used',
  searchButtonLabel: 'Search installs on the map',
  searchFieldLabel: 'Search installs on the map',
  searchPlaceholder: 'Search install ID, locale, country, or license key',
  selectedMarkerDescription: 'Selected marker from the map',
  selectedMarkerTitle: 'Selected marker',
  sharedIpInstalls: 'Shared IP installs',
  sharedIpInstallsHint: 'Visible installs sharing an IP with another install',
  showAllMarkers: 'Show all',
  singleIpInstall: 'Only this install on IP',
  status: 'Status',
  tileAttribution: '(c) OpenStreetMap contributors',
  unblockFreeAccessIp: 'Unblock IP',
  unblockFreeAccessIpDescription:
    'Free-trial access from this IP will be allowed again.',
  unblockFreeAccessIpError: 'Failed to unblock this IP.',
  unblockFreeAccessIpSuccess: 'Free access unblocked for this IP.',
  unblockFreeAccessIpTitle: 'Unblock free access from this IP?',
  unlinked: 'Unlinked',
  unlinkedShare: 'share of matched installs',
  visibleInstalls: 'Visible installs',
  visibleInstallsHint: 'Installs returned by the current filters',
} as const;

type DeviceStatusFilter = (typeof statusFilters)[number];
type DeviceLicenseFilter = (typeof licenseFilters)[number];

type DeviceSearchFilter = {
  country?: string;
  linked?: DeviceLicenseFilter;
  searchTerm?: string;
  status?: DeviceStatusFilter;
};

type DeviceMapItem = {
  activeLicense?: {
    boundAt: Date;
    id: string;
    key: string;
    ownerEmail?: string | null;
    status: string;
  } | null;
  appBuild?: string | null;
  appVersion?: string | null;
  country?: string | null;
  createdAt: Date;
  freeAccessIpBlocked: boolean;
  id: string;
  installationId: string;
  lastIpAddress?: string | null;
  lastSeenAt?: Date | null;
  latitude?: number | null;
  locale?: string | null;
  longitude?: number | null;
  ownerAvatarUrl?: string | null;
  platform: 'android';
  redeemedCode?: {
    code: string;
    redeemedAt?: Date | null;
    status: string;
  } | null;
  sameIpInstallCount: number;
  sameIpOwnerEmails: string[];
  status: 'pending' | 'active' | 'revoked' | 'blocked';
};

type DeviceMapItemWithPosition = DeviceMapItem & {
  mapLatitude: number;
  mapLongitude: number;
  positionMode: 'country' | 'exact';
};

type DeviceCountryMarker = {
  country: string;
  devices: DeviceMapItemWithPosition[];
  id: string;
  latitude: number;
  longitude: number;
  total: number;
};

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  andorra: [42.5, 1.6],
  argentina: [-38.4161, -63.6167],
  australia: [-25.2744, 133.7751],
  austria: [47.5162, 14.5501],
  belgium: [50.5039, 4.4699],
  brazil: [-14.235, -51.9253],
  canada: [56.1304, -106.3468],
  china: [35.8617, 104.1954],
  cn: [35.8617, 104.1954],
  denmark: [56.2639, 9.5018],
  dk: [56.2639, 9.5018],
  eg: [26.8206, 30.8025],
  'united states': [37.0902, -95.7129],
  usa: [37.0902, -95.7129],
  us: [37.0902, -95.7129],
  france: [46.2276, 2.2137],
  fr: [46.2276, 2.2137],
  tunisie: [33.8869, 9.5375],
  tunisia: [33.8869, 9.5375],
  tn: [33.8869, 9.5375],
  finland: [61.9241, 25.7482],
  fi: [61.9241, 25.7482],
  germany: [51.1657, 10.4515],
  de: [51.1657, 10.4515],
  india: [20.5937, 78.9629],
  in: [20.5937, 78.9629],
  indonesia: [-0.7893, 113.9213],
  id: [-0.7893, 113.9213],
  italy: [41.8719, 12.5674],
  it: [41.8719, 12.5674],
  japan: [36.2048, 138.2529],
  jp: [36.2048, 138.2529],
  marocco: [31.7917, -7.0926],
  'united kingdom': [55.3781, -3.436],
  uk: [55.3781, -3.436],
  gb: [55.3781, -3.436],
  mexico: [23.6345, -102.5528],
  mx: [23.6345, -102.5528],
  morocco: [31.7917, -7.0926],
  ma: [31.7917, -7.0926],
  norway: [60.472, 8.4689],
  no: [60.472, 8.4689],
  poland: [51.9194, 19.1451],
  pl: [51.9194, 19.1451],
  portugal: [39.3999, -8.2245],
  pt: [39.3999, -8.2245],
  russia: [61.524, 105.3188],
  ru: [61.524, 105.3188],
  saudi_arabia: [23.8859, 45.0792],
  sa: [23.8859, 45.0792],
  south_africa: [-30.5595, 22.9375],
  spain: [40.4637, -3.7492],
  es: [40.4637, -3.7492],
  sweden: [60.1282, 18.6435],
  se: [60.1282, 18.6435],
  'south africa': [-30.5595, 22.9375],
  za: [-30.5595, 22.9375],
  turkey: [38.9637, 35.2433],
  tr: [38.9637, 35.2433],
  'saudi arabia': [23.8859, 45.0792],
  ukraine: [48.3794, 31.1656],
  ua: [48.3794, 31.1656],
  egypt: [26.8206, 30.8025],
  egy: [26.8206, 30.8025],
  algeria: [28.0339, 1.6596],
  dz: [28.0339, 1.6596],
};

function getCountryCodeValue(country: string) {
  const normalized = country
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getCountryBasePoint(country: string): [number, number] | null {
  const normalized = getCountryCodeValue(country);
  const lookup = COUNTRY_COORDINATES[normalized];
  if (lookup) {
    return lookup;
  }

  return null;
}

function getDeviceMapPoint(
  device: DeviceMapItem
): DeviceMapItemWithPosition | null {
  const latitude = device.latitude;
  const longitude = device.longitude;

  if (
    isValidCoordinate(latitude, -90, 90) &&
    isValidCoordinate(longitude, -180, 180)
  ) {
    return {
      ...device,
      mapLatitude: latitude,
      mapLongitude: longitude,
      positionMode: 'exact',
    };
  }

  if (device.country) {
    const basePoint = getCountryBasePoint(device.country);
    if (basePoint) {
      const [latitude, longitude] = basePoint;
      return {
        ...device,
        mapLatitude: latitude,
        mapLongitude: longitude,
        positionMode: 'country',
      };
    }
  }
  return null;
}

function isValidCoordinate(
  value: number | null | undefined,
  min: number,
  max: number
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

type LeafletWindow = Window & {
  L?: {
    featureGroup: () => {
      addLayer: (layer: unknown) => void;
      addTo: (map: unknown) => void;
      remove: () => void;
    };
    divIcon: (options: {
      className: string;
      html: string;
      iconAnchor: [number, number];
      iconSize: [number, number];
    }) => unknown;
    latLngBounds: (points: [number, number][]) => any;
    map: (element: HTMLDivElement, options: Record<string, unknown>) => any;
    marker: (
      point: [number, number],
      options: { icon?: unknown }
    ) => {
      addTo: (layer: unknown) => void;
      bindPopup: (content: string) => void;
      on: (event: 'click', handler: () => void) => void;
    };
    tileLayer: (
      templateUrl: string,
      options: Record<string, string>
    ) => {
      addTo: (map: unknown) => void;
    };
  };
};

const LEAFLET_CSS_ID = 'tachi-openstreetmap-css';
const LEAFLET_SCRIPT_ID = 'tachi-openstreetmap-script';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_SCRIPT_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const OPEN_STREET_MAP_TILE_URL =
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

let leafletLoadPromise: Promise<void> | null = null;

function getLeaflet() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as LeafletWindow).L;
}

function loadLeafletAssets() {
  const leaflet = getLeaflet();
  if (leaflet) {
    return Promise.resolve();
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  leafletLoadPromise = new Promise((resolve, reject) => {
    const onLoad = () => {
      if (getLeaflet()) {
        resolve();
      } else {
        reject(new Error('Leaflet failed to initialize.'));
      }
    };
    const onError = () => {
      leafletLoadPromise = null;
      reject(new Error('Failed to load Leaflet assets.'));
    };

    const existingCss = document.getElementById(
      LEAFLET_CSS_ID
    ) as HTMLLinkElement | null;
    if (!existingCss) {
      const css = document.createElement('link');
      css.id = LEAFLET_CSS_ID;
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS_URL;
      document.head.appendChild(css);
    }

    const existingScript = document.getElementById(
      LEAFLET_SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (existingScript) {
      if (getLeaflet()) {
        resolve();
        return;
      }

      existingScript.addEventListener('load', onLoad, { once: true });
      existingScript.addEventListener('error', onError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = LEAFLET_SCRIPT_ID;
    script.src = LEAFLET_SCRIPT_URL;
    script.defer = true;
    script.async = true;
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.body.appendChild(script);
  });

  return leafletLoadPromise;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const PageDevicesMap = (props: { search: DeviceSearchFilter }) => {
  const router = useRouter();
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const country = props.search.country ?? DEFAULT_SEARCH_FILTERS.country;
  const linked = props.search.linked ?? DEFAULT_SEARCH_FILTERS.linked;
  const searchTerm =
    props.search.searchTerm ?? DEFAULT_SEARCH_FILTERS.searchTerm;
  const status = props.search.status ?? DEFAULT_SEARCH_FILTERS.status;
  const normalizedSearchTerm = searchTerm.trim();
  const hasFilters =
    normalizedSearchTerm !== '' ||
    country !== DEFAULT_SEARCH_FILTERS.country ||
    status !== DEFAULT_SEARCH_FILTERS.status ||
    linked !== DEFAULT_SEARCH_FILTERS.linked;

  const goToSearch = useCallback(
    (next: DeviceSearchFilter) => {
      router.navigate({
        replace: true,
        search: {
          country: next.country ?? country,
          linked: next.linked ?? linked,
          searchTerm: next.searchTerm ?? searchTerm,
          status: next.status ?? status,
        },
        to: '.',
      });
    },
    [country, linked, router, searchTerm, status]
  );

  const mapSearchInputProps = useMemo(
    () => ({
      value: searchTerm,
      onChange: (value: string) =>
        goToSearch({
          searchTerm: value,
        }),
    }),
    [goToSearch, searchTerm]
  );

  const devicesQuery = useQuery(
    orpc.device.list.queryOptions({
      input: {
        country,
        limit: 100,
        linked,
        searchTerm: normalizedSearchTerm,
        status,
      },
    })
  );
  const countryOptionsQuery = useQuery(
    orpc.device.list.queryOptions({
      input: {
        country: DEFAULT_SEARCH_FILTERS.country,
        limit: 100,
        linked,
        searchTerm: normalizedSearchTerm,
        status,
      },
    })
  );
  const countryFilters = useMemo(
    () =>
      getCountryFilterItems(
        countryOptionsQuery.data?.items ?? devicesQuery.data?.items ?? [],
        country
      ),
    [country, countryOptionsQuery.data?.items, devicesQuery.data?.items]
  );
  const { refetch: refetchDevices } = devicesQuery;
  const { refetch: refetchCountryOptions } = countryOptionsQuery;
  const refreshDeviceLists = useCallback(async () => {
    await Promise.all([refetchDevices(), refetchCountryOptions()]);
  }, [refetchCountryOptions, refetchDevices]);
  const blockFreeAccessIp = useMutation({
    mutationFn: async (ipAddress: string) =>
      await orpc.device.blockFreeAccessIp.call({
        ipAddress,
      }),
    onSuccess: async () => {
      toast.success(mapCopy.blockFreeAccessIpSuccess);
      await refreshDeviceLists();
    },
    onError: () => {
      toast.error(mapCopy.blockFreeAccessIpError);
    },
  });
  const unblockFreeAccessIp = useMutation({
    mutationFn: async (ipAddress: string) =>
      await orpc.device.unblockFreeAccessIp.call({
        ipAddress,
      }),
    onSuccess: async () => {
      toast.success(mapCopy.unblockFreeAccessIpSuccess);
      await refreshDeviceLists();
    },
    onError: () => {
      toast.error(mapCopy.unblockFreeAccessIpError);
    },
  });
  const {
    isPending: isBlockingFreeAccessIp,
    mutate: blockFreeAccessIpMutate,
    variables: blockingIpAddress,
  } = blockFreeAccessIp;
  const {
    isPending: isUnblockingFreeAccessIp,
    mutate: unblockFreeAccessIpMutate,
    variables: unblockingIpAddress,
  } = unblockFreeAccessIp;
  const pendingIpAddress = isBlockingFreeAccessIp
    ? blockingIpAddress
    : isUnblockingFreeAccessIp
      ? unblockingIpAddress
      : null;
  const toggleFreeAccessIp = useCallback(
    (device: DeviceMapItem) => {
      if (!device.lastIpAddress) {
        return;
      }

      if (device.freeAccessIpBlocked) {
        unblockFreeAccessIpMutate(device.lastIpAddress);
        return;
      }

      blockFreeAccessIpMutate(device.lastIpAddress);
    },
    [blockFreeAccessIpMutate, unblockFreeAccessIpMutate]
  );

  const visibleDevices = useMemo(
    () => devicesQuery.data?.items ?? [],
    [devicesQuery.data?.items]
  );
  const mappedDevices = useMemo(
    () =>
      visibleDevices
        .map((device) => getDeviceMapPoint(device))
        .filter(Boolean) as DeviceMapItemWithPosition[],
    [visibleDevices]
  );
  const countryMarkers = useMemo(() => {
    const grouped = new Map<string, DeviceCountryMarker>();

    mappedDevices.forEach((device) => {
      const country = device.country ?? mapCopy.countryUnknown;
      const pointKey = `${device.mapLatitude.toFixed(4)},${device.mapLongitude.toFixed(4)}`;
      const mapKey = `${getCountryCodeValue(country)}|${pointKey}`;
      const existing = grouped.get(mapKey);

      if (existing) {
        existing.total += 1;
        existing.devices.push(device);
        return;
      }

      grouped.set(mapKey, {
        country,
        devices: [device],
        id: mapKey,
        latitude: device.mapLatitude,
        longitude: device.mapLongitude,
        total: 1,
      });
    });

    return [...grouped.values()];
  }, [mappedDevices]);
  const selectedMarker = useMemo(
    () =>
      selectedMarkerId
        ? (countryMarkers.find((marker) => marker.id === selectedMarkerId) ??
          null)
        : null,
    [countryMarkers, selectedMarkerId]
  );

  useEffect(() => {
    if (
      selectedMarkerId &&
      !countryMarkers.some((marker) => marker.id === selectedMarkerId)
    ) {
      setSelectedMarkerId(null);
    }
  }, [countryMarkers, selectedMarkerId]);

  const ui = getUiState((set) => {
    if (devicesQuery.status === 'pending') {
      return set('pending');
    }

    if (devicesQuery.status === 'error') {
      return set('error');
    }

    if (!devicesQuery.data.items.length) {
      return set(hasFilters ? 'empty-filter' : 'empty');
    }

    return set('default', {
      devices: visibleDevices as DeviceMapItem[],
      linkedCount: devicesQuery.data.linkedCount,
      total: devicesQuery.data.total,
      unlinkedCount: devicesQuery.data.unlinkedCount,
    });
  });

  return (
    <GuardPermissions permissions={[permissionDevice.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>
            {mapCopy.installsMapTitle}
          </PageLayoutTopBarTitle>
          <SearchButton
            {...mapSearchInputProps}
            aria-label={mapCopy.searchButtonLabel}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...mapSearchInputProps}
            aria-label={mapCopy.searchFieldLabel}
            className="max-w-sm max-md:hidden"
            placeholder={mapCopy.searchPlaceholder}
            size="sm"
          />
          <Button
            aria-label={mapCopy.backToList}
            className="ml-2 shrink-0"
            onClick={() =>
              router.navigate({
                replace: true,
                search: {
                  country,
                  linked,
                  searchTerm,
                  status,
                },
                to: '/manager/devices',
              })
            }
            size="sm"
            variant="secondary"
          >
            <ArrowLeft className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">{mapCopy.backToList}</span>
          </Button>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl pb-12">
          {ui
            .match('pending', () => (
              <DataList>
                <DataListLoadingState />
              </DataList>
            ))
            .match('error', () => (
              <DataList>
                <DataListErrorState retry={() => devicesQuery.refetch()} />
              </DataList>
            ))
            .match('empty', () => (
              <DataList>
                <DataListEmptyState>{mapCopy.empty}</DataListEmptyState>
              </DataList>
            ))
            .match('empty-filter', () => (
              <DataList>
                <DataListEmptyState>{mapCopy.emptyFiltered}</DataListEmptyState>
              </DataList>
            ))
            .match(
              'default',
              ({
                devices,
                linkedCount,
                total,
                unlinkedCount,
              }: {
                devices: DeviceMapItem[];
                linkedCount: number;
                total: number;
                unlinkedCount: number;
              }) => {
                const linkedRate =
                  total > 0 ? Math.round((linkedCount / total) * 100) : 0;
                const repeatedIpInstallCount = devices.filter(
                  (device) => device.sameIpInstallCount > 1
                ).length;
                const listedDevices = selectedMarker
                  ? selectedMarker.devices
                  : mappedDevices;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                      <SummaryCard
                        label={mapCopy.visibleInstalls}
                        subLabel={mapCopy.visibleInstallsHint}
                        value={formatCount(devices.length)}
                      />
                      <SummaryCard
                        label={mapCopy.geocoded}
                        subLabel={mapCopy.geocodedHint}
                        value={formatCount(mappedDevices.length)}
                      />
                      <SummaryCard
                        label={mapCopy.groupedCountries}
                        subLabel={mapCopy.groupedCountriesHint}
                        value={formatCount(countryMarkers.length)}
                      />
                      <SummaryCard
                        label={mapCopy.linked}
                        subLabel={`${linkedRate}% ${mapCopy.linkedShare}`}
                        value={formatCount(linkedCount)}
                      />
                      <SummaryCard
                        label={mapCopy.sharedIpInstalls}
                        subLabel={mapCopy.sharedIpInstallsHint}
                        value={formatCount(repeatedIpInstallCount)}
                      />
                    </div>

                    <div className="space-y-3 rounded-md border bg-card p-3 sm:p-4">
                      <FilterPillGroup
                        items={statusFilters}
                        label={mapCopy.status}
                        onSelect={(item) =>
                          goToSearch({ status: item as DeviceStatusFilter })
                        }
                        selected={status}
                      />
                      <FilterPillGroup
                        items={licenseFilters}
                        label={mapCopy.license}
                        onSelect={(item) =>
                          goToSearch({ linked: item as DeviceLicenseFilter })
                        }
                        selected={linked}
                      />
                      <FilterPillGroup
                        getItemLabel={(item) =>
                          item === DEFAULT_SEARCH_FILTERS.country
                            ? mapCopy.all
                            : getCountryLabel(item)
                        }
                        items={countryFilters}
                        label={mapCopy.country}
                        onSelect={(item) =>
                          goToSearch({
                            country: item,
                          })
                        }
                        selected={country}
                      />
                    </div>

                    <DataListRowResults
                      onClear={() => goToSearch(DEFAULT_SEARCH_FILTERS)}
                      withClearButton={hasFilters}
                    >
                      {mapCopy.geocodedResults}{' '}
                      {formatCount(mappedDevices.length)} /{' '}
                      {formatCount(devices.length)} installs on the map ·{' '}
                      {formatCount(unlinkedCount)}{' '}
                      {mapCopy.unlinked.toLowerCase()}
                    </DataListRowResults>

                    <div className="grid gap-4 xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)] xl:min-h-[560px] xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] xl:overflow-hidden">
                      <Card className="order-1 overflow-hidden xl:h-full xl:min-h-0">
                        <CardHeader className="space-y-1 p-4">
                          <CardTitle>{mapCopy.mapPanelTitle}</CardTitle>
                          <CardDescription>
                            {countryMarkers.length
                              ? mapCopy.mapPanelDescription
                              : mapCopy.mapPanelEmpty}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 p-0">
                          <div className="relative h-[440px] w-full sm:h-[560px] xl:h-full">
                            <OpenStreetMapPanel
                              devices={countryMarkers}
                              onMarkerSelect={setSelectedMarkerId}
                              selectedMarkerId={selectedMarkerId}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="order-2 xl:h-full xl:min-h-0 xl:overflow-hidden">
                        <CardHeader className="shrink-0 gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <CardTitle>
                                {selectedMarker
                                  ? mapCopy.selectedMarkerTitle
                                  : mapCopy.mapListTitle}
                              </CardTitle>
                              <CardDescription>
                                {selectedMarker
                                  ? `${getCountryLabel(selectedMarker.country)} · ${formatCount(selectedMarker.total)} installs`
                                  : mapCopy.mapListDescription}
                              </CardDescription>
                            </div>
                            {selectedMarker ? (
                              <Button
                                className="shrink-0"
                                onClick={() => setSelectedMarkerId(null)}
                                size="xs"
                                variant="secondary"
                              >
                                {mapCopy.showAllMarkers}
                              </Button>
                            ) : null}
                          </div>
                          {selectedMarker ? (
                            <div className="text-xs text-muted-foreground">
                              {mapCopy.selectedMarkerDescription}
                            </div>
                          ) : null}
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 overflow-y-auto px-3 pr-2 sm:px-4 sm:pr-3">
                          <DataList>
                            {!countryMarkers.length ? (
                              <DataListEmptyState>
                                {mapCopy.mapListEmpty}
                              </DataListEmptyState>
                            ) : (
                              listedDevices.map((device) => (
                                <MapDeviceRow
                                  device={device}
                                  isIpAccessPending={
                                    pendingIpAddress === device.lastIpAddress
                                  }
                                  isSelected={Boolean(selectedMarker)}
                                  key={device.id}
                                  onToggleFreeAccessIp={toggleFreeAccessIp}
                                />
                              ))
                            )}
                          </DataList>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              }
            )
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function MapDeviceRow(props: {
  device: DeviceMapItemWithPosition;
  isIpAccessPending: boolean;
  isSelected: boolean;
  onToggleFreeAccessIp: (device: DeviceMapItem) => void;
}) {
  const { device } = props;

  return (
    <DataListRow
      className={cn(
        'block px-0 py-0',
        props.isSelected && 'bg-primary/5 ring-1 ring-primary/20'
      )}
      withHover
    >
      <div className="space-y-3 p-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="mt-0.5 size-10 shrink-0">
            <AvatarImage
              alt={device.installationId}
              src={device.ownerAvatarUrl ?? undefined}
            />
            <AvatarFallback>
              {initialsFromInstallation(device.installationId)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
              {mapCopy.installId}
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <Link
                className="min-w-0 flex-1 text-sm leading-5 font-semibold break-all text-foreground hover:underline"
                params={{ id: device.id }}
                to="/manager/devices/$id"
              >
                {device.installationId}
              </Link>
              <Badge
                className="mt-0.5 shrink-0"
                variant={getStatusBadgeVariant(device.status)}
              >
                {humanizeToken(device.status)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <InfoPill
                icon={Smartphone}
                label={mapCopy.platform}
                value={getPlatformLabel(device.platform)}
              />
              <InfoPill
                icon={Languages}
                label={mapCopy.language}
                value={getLanguageLabel(device.locale)}
              />
              <InfoPill
                icon={Globe2}
                label={mapCopy.country}
                value={getCountryLabel(device.country)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <MetaBlock
            icon={device.positionMode === 'exact' ? LocateFixed : MapPinned}
            label={getPlacementLabel(device.positionMode)}
            value={getPlacementValue(device)}
            helper={getPlacementHelper(device)}
          />
          <MetaBlock
            icon={Clock3}
            label={mapCopy.lastSeen}
            value={formatRelative(device.lastSeenAt)}
            helper={
              device.lastSeenAt ? formatDateTime(device.lastSeenAt) : null
            }
          />
          <MetaBlock
            icon={KeyRound}
            label={mapCopy.license}
            value={
              device.activeLicense ? (
                <Link
                  className="font-medium break-all text-foreground hover:underline"
                  params={{ key: device.activeLicense.key }}
                  to="/manager/licenses/$key"
                >
                  {device.activeLicense.key}
                </Link>
              ) : (
                mapCopy.noActiveLicense
              )
            }
            helper={getLicenseHelper(device.activeLicense)}
          />
          <MetaBlock
            icon={PackageCheck}
            label={mapCopy.redeemCode}
            value={device.redeemedCode?.code ?? mapCopy.noRedeemCode}
            helper={getRedeemCodeHelper(device.redeemedCode)}
          />
          <MetaBlock
            icon={Network}
            label={mapCopy.countryIp}
            value={getCountryLabel(device.country)}
            helper={
              <IpAccessSummary
                device={device}
                isPending={props.isIpAccessPending}
                onToggleFreeAccessIp={props.onToggleFreeAccessIp}
              />
            }
          />
          <MetaBlock
            icon={PackageCheck}
            label={mapCopy.appVersion}
            value={device.appVersion ?? mapCopy.noVersion}
            helper={
              device.appBuild
                ? `Build ${device.appBuild}`
                : mapCopy.buildUnknown
            }
          />
        </div>
      </div>
    </DataListRow>
  );
}

function IpAccessSummary(props: {
  device: DeviceMapItem;
  isPending: boolean;
  onToggleFreeAccessIp: (device: DeviceMapItem) => void;
}) {
  const { device } = props;

  if (!device.lastIpAddress) {
    return mapCopy.ipMissing;
  }

  const isBlocked = device.freeAccessIpBlocked;

  return (
    <div className="space-y-2">
      <div>{getIpSummary(device)}</div>
      <div className="flex flex-wrap items-center gap-2">
        {isBlocked ? (
          <Badge size="sm" variant="negative">
            {mapCopy.freeAccessBlocked}
          </Badge>
        ) : null}
        <WithPermissions permissions={[permissionDevice.revoke]}>
          <ConfirmResponsiveDrawer
            confirmText={
              isBlocked
                ? mapCopy.unblockFreeAccessIp
                : mapCopy.blockFreeAccessIp
            }
            confirmVariant={isBlocked ? 'default' : 'destructive'}
            description={
              isBlocked
                ? mapCopy.unblockFreeAccessIpDescription
                : `${mapCopy.blockFreeAccessIpDescription} ${formatCount(device.sameIpInstallCount)} installs currently share this IP.`
            }
            onConfirm={() => props.onToggleFreeAccessIp(device)}
            title={
              isBlocked
                ? mapCopy.unblockFreeAccessIpTitle
                : mapCopy.blockFreeAccessIpTitle
            }
          >
            <Button
              loading={props.isPending}
              size="xs"
              variant={isBlocked ? 'secondary' : 'destructive-secondary'}
            >
              {isBlocked ? (
                <ShieldCheck className="size-3" />
              ) : (
                <ShieldOff className="size-3" />
              )}
              {isBlocked
                ? mapCopy.unblockFreeAccessIp
                : mapCopy.blockFreeAccessIp}
            </Button>
          </ConfirmResponsiveDrawer>
        </WithPermissions>
      </div>
    </div>
  );
}

function OpenStreetMapPanel({
  devices,
  onMarkerSelect,
  selectedMarkerId,
}: {
  devices: DeviceCountryMarker[];
  onMarkerSelect: (markerId: string) => void;
  selectedMarkerId: string | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const [errorLoadingMap, setErrorLoadingMap] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const container = mapContainerRef.current;

    if (!container || typeof window === 'undefined') {
      return;
    }

    setErrorLoadingMap(false);

    loadLeafletAssets()
      .then(() => {
        if (!isMounted) {
          return;
        }

        const Leaflet = getLeaflet();
        if (!Leaflet) {
          setErrorLoadingMap(true);
          return;
        }

        const map =
          mapRef.current ??
          (() => {
            const nextMap = Leaflet.map(container, {
              attributionControl: false,
              zoomControl: true,
            });
            Leaflet.tileLayer(OPEN_STREET_MAP_TILE_URL, {
              attribution: mapCopy.tileAttribution,
            }).addTo(nextMap);
            nextMap.setView(DEFAULT_MAP_CENTER, 2);
            mapRef.current = nextMap;
            return nextMap;
          })();

        map.invalidateSize();

        if (markersRef.current) {
          map.removeLayer(markersRef.current);
        }

        const layer = Leaflet.featureGroup();
        const bounds = Leaflet.latLngBounds([]);

        devices.forEach((device) => {
          const marker = Leaflet.marker([device.latitude, device.longitude], {
            icon: Leaflet.divIcon({
              className: '',
              html: buildCountryMarkerHtml(
                device,
                device.id === selectedMarkerId
              ),
              iconAnchor: [22, 44],
              iconSize: [50, 52],
            }),
          });
          marker.bindPopup(buildCountryPopupHtml(device));
          marker.on('click', () => onMarkerSelect(device.id));
          marker.addTo(layer);
          bounds.extend([device.latitude, device.longitude]);
        });

        layer.addTo(map);
        markersRef.current = layer;

        if (devices.length === 0) {
          map.setView(DEFAULT_MAP_CENTER, 2);
        } else if (devices.length === 1) {
          const device = devices[0];
          if (device) {
            map.setView([device.latitude, device.longitude], 11);
          }
        } else {
          map.fitBounds(bounds, {
            animate: false,
            maxZoom: 14,
            padding: DEFAULT_MAP_PADDING,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorLoadingMap(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [devices, onMarkerSelect, selectedMarkerId]);

  useEffect(() => {
    return () => {
      if (markersRef.current) {
        markersRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (errorLoadingMap) {
    return (
      <div
        aria-live="polite"
        className="flex h-full items-center justify-center bg-muted/40 p-4 text-sm text-muted-foreground"
        role="status"
      >
        {mapCopy.mapAssetsError}
      </div>
    );
  }

  return (
    <div
      aria-label={mapCopy.mapAriaLabel}
      className="h-full w-full"
      ref={mapContainerRef}
      role="region"
    />
  );
}

function InfoPill(props: {
  icon: typeof Smartphone;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <span
      className="inline-flex h-6 max-w-full min-w-0 items-center gap-1 rounded-sm bg-muted px-2 text-xs text-muted-foreground"
      title={`${props.label}: ${props.value}`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="shrink-0 font-medium">{props.label}:</span>
      <span className="truncate">{props.value}</span>
    </span>
  );
}

function MetaBlock(props: {
  helper?: ReactNode;
  icon: typeof Smartphone;
  label: string;
  value: ReactNode;
}) {
  const Icon = props.icon;

  return (
    <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 gap-y-1">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
          {props.label}
        </div>
        <div className="mt-0.5 min-w-0 text-sm leading-5 font-medium break-words text-foreground">
          {props.value}
        </div>
        {props.helper ? (
          <div className="mt-0.5 min-w-0 text-xs leading-5 break-words text-muted-foreground">
            {props.helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterPillGroup(props: {
  getItemLabel?: (item: string) => string;
  items: readonly string[];
  label: string;
  onSelect: (item: string) => void;
  selected: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {props.label}
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={props.label}
      >
        {props.items.map((item) => {
          const label = props.getItemLabel?.(item) ?? getFilterLabel(item);

          return (
            <Button
              aria-pressed={props.selected === item}
              key={item}
              onClick={() => props.onSelect(item)}
              size="xs"
              variant={props.selected === item ? 'default' : 'secondary'}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function getCountryFilterItems(
  devices: Array<{ country?: string | null }>,
  selected: string
) {
  const countryItems = new Map<string, string>();

  for (const device of devices) {
    if (!device.country) {
      continue;
    }

    const key = getCountryOptionKey(device.country);
    if (!countryItems.has(key)) {
      countryItems.set(key, device.country);
    }
  }

  if (selected !== DEFAULT_SEARCH_FILTERS.country) {
    countryItems.set(getCountryOptionKey(selected), selected);
  }

  return [DEFAULT_SEARCH_FILTERS.country, ...countryItems.values()];
}

function getCountryOptionKey(country: string) {
  return getCountryLabel(country).toLowerCase();
}

function SummaryCard(props: {
  label: string;
  subLabel: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1 p-3 pb-1 sm:p-4 sm:pb-2">
        <CardDescription className="text-xs leading-tight">
          {props.label}
        </CardDescription>
        <CardTitle className="text-xl sm:text-2xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 text-xs leading-snug text-muted-foreground sm:px-4 sm:pb-4">
        {props.subLabel}
      </CardContent>
    </Card>
  );
}

function buildCountryMarkerHtml(
  marker: DeviceCountryMarker,
  isSelected: boolean
) {
  const sampleDevice = marker.devices[0];
  const avatarUrl = sampleDevice?.ownerAvatarUrl ?? null;
  const initial = sampleDevice
    ? initialsFromInstallation(sampleDevice.installationId)
    : 'ID';
  const markerBorder = isSelected ? '#facc15' : '#ffffff';
  const markerBackground = isSelected ? '#0f766e' : '#166534';
  const markerScale = isSelected ? 'scale(1.12)' : 'scale(1)';

  const avatarHtml = avatarUrl
    ? `<img alt="" src="${escapeHtml(avatarUrl)}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="color:#ffffff;font-size:11px;font-weight:600;">${escapeHtml(initial)}</span>`;

  return `
    <div style="position:relative;transform:translate(-50%, -100%) ${markerScale};width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .16s ease;">
      <div style="width:40px;height:40px;border:3px solid ${markerBorder};border-radius:9999px;box-shadow:0 8px 18px rgba(15,23,42,.35);overflow:hidden;display:flex;align-items:center;justify-content:center;background:${markerBackground};">
        ${avatarHtml}
      </div>
      <span style="position:absolute;right:-4px;top:-5px;min-width:20px;height:20px;border-radius:9999px;background:#111827;color:#ffffff;border:1px solid rgba(255,255,255,.9);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;">${marker.total}</span>
    </div>
  `;
}

function buildCountryPopupHtml(marker: DeviceCountryMarker) {
  const country = escapeHtml(getCountryLabel(marker.country));
  const localeBreakdown = marker.devices
    .map((device) => device.locale)
    .filter((locale): locale is string => Boolean(locale))
    .filter((value, index, self) => self.indexOf(value) === index)
    .slice(0, 3)
    .map((locale) => escapeHtml(getLanguageLabel(locale)));
  const emails = marker.devices
    .flatMap((device) => device.sameIpOwnerEmails)
    .filter((email, index, self) => self.indexOf(email) === index)
    .slice(0, 3)
    .map(escapeHtml);
  const installs = marker.devices.slice(0, 3).map((device) => {
    const id = escapeHtml(device.id);
    const installationId = escapeHtml(device.installationId);
    return `<li><a href="/manager/devices/${id}" style="color:#2563eb;text-decoration:underline;">${installationId}</a></li>`;
  });

  const localeDetails = localeBreakdown.length
    ? `<p>${mapCopy.language}: ${localeBreakdown.join(', ')}</p>`
    : '';

  const emailDetails = emails.length
    ? `<p>${mapCopy.ipRelatedMails}: ${emails.join(', ')}</p>`
    : '';

  const sampleInstallation = marker.devices[0];
  const statusText = sampleInstallation
    ? `<p>${mapCopy.popupStatus}: ${escapeHtml(humanizeToken(sampleInstallation.status))}</p>`
    : '';

  const lastSeenText = sampleInstallation
    ? `<p>${mapCopy.lastSeen}: ${escapeHtml(formatRelative(sampleInstallation.lastSeenAt))}</p>`
    : '';

  return `
    <div style="font-size:12px;display:flex;gap:.45rem;flex-direction:column;max-width:260px;">
      <strong style="font-size:13px;">${country}</strong>
      <p>${marker.total} ${mapCopy.visibleInstalls.toLowerCase()}</p>
      ${localeDetails}
      ${emailDetails}
      ${statusText}
      ${lastSeenText}
      ${installs.length ? `<ul style="margin:0;padding-left:1rem;">${installs.join('')}</ul>` : ''}
    </div>
  `;
}

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

function formatRelative(date: Date | null | undefined) {
  if (!date) {
    return mapCopy.neverSeen;
  }

  return dayjs(date).fromNow();
}

function getCountryLabel(country: string | null | undefined) {
  if (!country) {
    return mapCopy.countryUnknown;
  }

  const normalized = country.trim();
  if (normalized.length === 2) {
    return getRegionDisplayName(normalized) ?? normalized.toUpperCase();
  }

  return humanizeToken(normalized);
}

function getRegionDisplayName(countryCode: string) {
  try {
    return regionDisplayNames?.of(countryCode.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

function getFilterLabel(value: string) {
  if (value === 'linked') {
    return mapCopy.linked;
  }

  if (value === 'unlinked') {
    return mapCopy.unlinked;
  }

  if (value === 'all') {
    return mapCopy.all;
  }

  return humanizeToken(value);
}

function getLanguageLabel(locale: string | null | undefined) {
  if (!locale) {
    return mapCopy.localeMissing;
  }

  const normalized = locale.replace(/_/g, '-');
  const languageCode = normalized.split('-').at(0);
  const languageName = languageCode
    ? (languageDisplayNames?.of(languageCode) ?? languageCode.toUpperCase())
    : mapCopy.localeMissing;

  return `${languageName} (${normalized})`;
}

function getPlatformLabel(platform: string | null | undefined) {
  if (!platform) {
    return mapCopy.platformMissing;
  }

  return humanizeToken(platform);
}

function getPlacementLabel(mode: DeviceMapItemWithPosition['positionMode']) {
  return mode === 'exact'
    ? mapCopy.exactPlacementLabel
    : mapCopy.countryLevelLabel;
}

function getPlacementValue(device: DeviceMapItemWithPosition) {
  return device.positionMode === 'exact'
    ? formatCoordinates(device.mapLatitude, device.mapLongitude)
    : getCountryLabel(device.country);
}

function getPlacementHelper(device: DeviceMapItemWithPosition) {
  return device.positionMode === 'exact'
    ? `${mapCopy.exactPlacementHint} · ${getCountryLabel(device.country)}`
    : mapCopy.countryLevelHint;
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
}

function getIpSummary(device: DeviceMapItem) {
  if (!device.lastIpAddress) {
    return mapCopy.ipMissing;
  }

  const installCount = device.sameIpInstallCount;
  const countLabel =
    installCount > 1
      ? `${formatCount(installCount)} ${mapCopy.ipSharedInstalls}`
      : mapCopy.singleIpInstall;

  if (installCount <= 1 || device.sameIpOwnerEmails.length === 0) {
    return `${device.lastIpAddress} · ${countLabel}`;
  }

  const visibleEmails = device.sameIpOwnerEmails.slice(0, 5);
  const hiddenEmailCount =
    device.sameIpOwnerEmails.length - visibleEmails.length;

  return (
    <span className="space-y-1">
      <span className="block">
        {device.lastIpAddress} · {countLabel}
      </span>
      <span className="block">
        {mapCopy.ipRelatedMails}:{' '}
        {visibleEmails.map((email, index) => (
          <span key={email}>
            {index > 0 ? ', ' : ''}
            {email}
          </span>
        ))}
        {hiddenEmailCount > 0 ? `, +${formatCount(hiddenEmailCount)}` : null}
      </span>
    </span>
  );
}

function getLicenseHelper(activeLicense: DeviceMapItem['activeLicense']) {
  if (!activeLicense) {
    return null;
  }

  const owner = activeLicense.ownerEmail ?? mapCopy.noActiveLicense;
  return `Bound ${dayjs(activeLicense.boundAt).fromNow()} · ${owner}`;
}

function getRedeemCodeHelper(redeemedCode: DeviceMapItem['redeemedCode']) {
  if (!redeemedCode) {
    return null;
  }

  const status = humanizeToken(redeemedCode.status);
  if (!redeemedCode.redeemedAt) {
    return status;
  }

  return `${status} · ${dayjs(redeemedCode.redeemedAt).fromNow()}`;
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
    case 'paid':
    case 'posted':
    case 'redeemed':
      return 'positive' as const;
    case 'pending':
    case 'available':
    case 'partially_refunded':
    case 'suspended':
      return 'warning' as const;
    case 'revoked':
    case 'blocked':
    case 'released':
    case 'failed':
    case 'canceled':
    case 'expired':
    case 'refunded':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}

function humanizeToken(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function initialsFromInstallation(installationId: string) {
  return installationId
    .split('-')
    .map((part) => part.slice(0, 1).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}
