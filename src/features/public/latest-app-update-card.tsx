import {
  BookOpenCheckIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import {
  formatLatestPublicAppUpdateDate,
  type LatestPublicAppUpdate,
} from '@/features/public/latest-app-update-policy';

interface LatestAppUpdateCardProps {
  update: LatestPublicAppUpdate;
}

export const LatestAppUpdateCard = ({
  update,
}: LatestAppUpdateCardProps) => (
  <Card
    id="latest-update"
    className="mt-3 scroll-mt-24 rounded-2xl border-brand-400/70 bg-card/80 py-0 shadow-[0_0_28px_rgba(124,58,237,0.08)] backdrop-blur"
  >
    <CardContent className="grid gap-5 p-4 md:grid-cols-[minmax(12rem,0.8fr)_minmax(0,2.2fr)] md:items-center md:px-5">
      <div className="min-w-0">
        <Badge variant="brand" size="sm">
          Latest update
        </Badge>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          Nayovi {update.version}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDaysIcon className="size-3.5 text-brand-200" />
          Updated {formatLatestPublicAppUpdateDate(update.publishedDate)}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <BookOpenCheckIcon className="mt-0.5 size-5 shrink-0 text-brand-200" />
          <div>
            <h3 className="text-sm font-semibold">{update.title}</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {update.summary}
            </p>
          </div>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {update.highlights.map((highlight) => (
            <li
              key={highlight}
              className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"
            >
              <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-brand-200" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
    </CardContent>
  </Card>
);
