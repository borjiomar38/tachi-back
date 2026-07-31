import { cn } from "@/lib/tailwind/utils";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  formatCurrency,
  formatTokenCount,
  type PublicTokenPack,
} from "@/features/public/data";

interface TokenPackCardProps {
  compact?: boolean;
  tokenPack: PublicTokenPack;
  featured?: boolean;
  id?: string;
  showCoffeePrice?: boolean;
}

export const TokenPackCard = (props: TokenPackCardProps) => {
  const {
    compact = false,
    tokenPack,
    featured = false,
    showCoffeePrice = false,
  } = props;
  const isFreePlan = tokenPack.key === "free";
  const textMutedClassName = featured
    ? "text-neutral-300"
    : "text-muted-foreground";
  const primaryHref = isFreePlan
    ? "/download"
    : tokenPack.checkoutEnabled
      ? `/checkout/${tokenPack.key}`
      : "/support";
  const primaryLabel = isFreePlan
    ? "Try for free"
    : tokenPack.checkoutEnabled
      ? `Choose ${tokenPack.name.split(" ")[0]}`
      : "Contact support";
  const formattedPrice = formatCurrency(
    tokenPack.priceAmountCents,
    tokenPack.currency,
  );
  const displayedPrice = showCoffeePrice
    ? formattedPrice.replace(/\.00$/, "")
    : formattedPrice;

  return (
    <Card
      id={props.id}
      className={cn(
        "h-full scroll-mt-28 rounded-[1.5rem] border-border/80 bg-background/90 shadow-sm backdrop-blur",
        featured &&
          "public-brand-panel text-neutral-50 ring-1 ring-brand-400/30",
      )}
    >
      <CardHeader className={cn("gap-3", compact && "p-4 pb-2")}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              {tokenPack.name}
            </CardTitle>
            <CardDescription className={textMutedClassName}>
              {tokenPack.marketingSummary}
            </CardDescription>
          </div>
          {isFreePlan ? (
            <Badge variant="secondary" size="sm">
              Free trial
            </Badge>
          ) : featured ? (
            <Badge variant="brand" size="sm">
              Most popular
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              Monthly plan
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex h-full flex-col gap-5",
          compact && "gap-3 p-4 pt-2",
        )}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            <p
              className={cn(
                "font-semibold tracking-tight",
                compact ? "text-2xl" : "text-3xl",
              )}
            >
              {isFreePlan
                ? "Free"
                : displayedPrice}
            </p>
            {!isFreePlan && showCoffeePrice ? (
              <span className={cn("text-sm font-medium", textMutedClassName)}>
                /month
              </span>
            ) : null}
          </div>
          {!isFreePlan && showCoffeePrice ? (
            <p className={cn("text-sm font-medium", textMutedClassName)}>
              The price of a coffee
            </p>
          ) : null}
          <p className={cn("text-sm", textMutedClassName)}>
            {isFreePlan ? (
              <>About {tokenPack.estimatedChapters} chapters included</>
            ) : (
              <>
                About {formatTokenCount(tokenPack.marketedChaptersPerMonth)}{" "}
                chapters / month
              </>
            )}
          </p>
        </div>

        <div className={cn("grid gap-2 text-sm", compact && "gap-1 text-xs")}>
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2",
              compact && "rounded-lg px-2 py-1.5",
            )}
          >
            <span className={textMutedClassName}>Best for</span>
            <span className="font-medium">{tokenPack.marketingSummary}</span>
          </div>
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2",
              compact && "rounded-lg px-2 py-1.5",
            )}
          >
            <span className={textMutedClassName}>
              {isFreePlan ? "Access" : "Billing"}
            </span>
            <span className="font-medium">
              {isFreePlan ? "One-time trial" : "Renews monthly"}
            </span>
          </div>
        </div>

        <div className={cn("mt-auto flex flex-col gap-2", compact && "pt-1")}>
          <a
            href={primaryHref}
            className={cn(
              buttonVariants({
                variant: featured ? "secondary" : "default",
              }),
              "w-full",
            )}
          >
            {primaryLabel}
          </a>
          {!compact ? (
            <a
              href="/how-it-works"
              className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
            >
              How it works
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
