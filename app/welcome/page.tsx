"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const slides = [
  {
    art: "🛟",
    title: "Welcome to Sagip",
    body: "A simple way to make sure the people you love are taken care of — even when you're far from home.",
  },
  {
    art: "💛",
    title: "Set money aside",
    body: "Choose an amount for a loved one. It's kept safe, and it stays completely yours.",
  },
  {
    art: "👋",
    title: "Just check in now and then",
    body: "Tap “I'm okay” every so often. Each time, the money stays in your hands.",
  },
  {
    art: "🏠",
    title: "Your family is always covered",
    body: "If you ever can't check in, the money opens to your loved one on its own. No paperwork, no waiting.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const last = index === slides.length - 1;
  const slide = slides[index];

  function finish() {
    router.push("/wallet-setup");
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo tone="paper" />
        <button onClick={finish} className="text-[15px] font-semibold text-paper/70 hover:text-paper">
          Skip
        </button>
      </header>

      <div className="container-page flex flex-1 flex-col items-center justify-center py-10 text-center">
        <div className="w-full max-w-md">
          <div
            className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-[56px] animate-fade-up"
            aria-hidden="true"
          >
            {slide.art}
          </div>
          <h1 className="mt-8 font-display text-[32px] font-bold">{slide.title}</h1>
          <p className="mt-3 text-[19px] leading-relaxed text-paper/85">{slide.body}</p>

          {/* Progress dots */}
          <div className="mt-8 flex justify-center gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 rounded-full transition-all ${
                  i === index ? "w-7 bg-marigold" : "w-2.5 bg-white/25"
                }`}
              />
            ))}
          </div>

          <div className="mt-10">
            {last ? (
              <Button variant="secondary" fullWidth onClick={finish}>
                Let&rsquo;s begin
              </Button>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => setIndex((i) => i + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
