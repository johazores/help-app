"use client";

import { memo, useEffect, useState } from "react";
import { LifelineRing } from "@/components/lifeline-ring";
import { Button } from "@/components/ui/button";
import { countdown, formatMoney, windowProgress } from "@/lib/format";

/** Isolated countdown timer so the rest of the detail page doesn't re-render every second. */
export const SafetyNetLifeline = memo(function SafetyNetLifeline({
  amount,
  status,
  kind,
  unlockAt,
  lastCheckInAt,
  busy,
  streak,
  onCheckIn,
}: {
  amount: string;
  status: string;
  kind: string;
  unlockAt: string;
  lastCheckInAt: string;
  forName: string;
  busy: boolean;
  streak: number;
  onCheckIn: () => void;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const active = status === "ACTIVE";
  const openNow = active && Date.parse(unlockAt) <= Date.now();
  const isGift = kind === "GIFT";
  const progress = windowProgress(lastCheckInAt, unlockAt);
  const { text: remaining } = countdown(unlockAt);

  return (
    <div className="card flex flex-col items-center p-8 text-center">
      <p className="break-words font-display text-[clamp(34px,9vw,44px)] font-bold leading-none text-ink">
        {formatMoney(amount)}
      </p>
      <p className="mt-2 text-[15px] text-subtle">set aside</p>

      <div className="mt-7">
        {active ? (
          <LifelineRing
            progress={progress}
            open={openNow}
            centerLabel={openNow ? "Open" : remaining}
            centerSub={
              openNow
                ? isGift
                  ? "ready for them"
                  : "for your family"
                : isGift
                  ? "until the gift opens"
                  : "until it opens to family"
            }
          />
        ) : (
          <LifelineRing
            progress={1}
            open
            centerLabel={status === "RECEIVED" ? "Received" : "Closed"}
          />
        )}
      </div>

      {active && !openNow && !isGift ? (
        <div className="mt-8 w-full">
          <Button fullWidth loading={busy} onClick={onCheckIn}>
            I&rsquo;m okay — check in
          </Button>
          <p className="mt-3 text-[14px] text-subtle">This keeps the money yours and resets the timer.</p>
          {streak >= 2 ? (
            <p className="mt-2 text-[14px] font-semibold text-sage">
              {streak} check-ins in a row — your family is well looked after.
            </p>
          ) : null}
        </div>
      ) : null}
      {active && !openNow && isGift ? (
        <p className="mt-8 text-[15px] text-body">This gift opens on its own — nothing for you to do.</p>
      ) : null}

      {active && openNow ? (
        <div className="mt-8 w-full rounded-xl bg-marigold/15 p-4 text-[15px] text-marigold-deep">
          The check-in window has passed. Your family can now receive this money using the link below.
        </div>
      ) : null}
    </div>
  );
});
