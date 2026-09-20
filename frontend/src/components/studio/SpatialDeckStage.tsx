import React, { useRef, useState, useCallback } from "react";
import { FindingSummary, FindingDetail } from "@/types/diagnosis";
import { FindingDossierCard } from "@/components/findings/FindingDossierCard";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);
if (typeof window !== "undefined") {
  (window as unknown as { ScrollTrigger: typeof ScrollTrigger }).ScrollTrigger = ScrollTrigger;
}

interface SpatialDeckStageProps {
  findings: FindingSummary[];
  detailsMap: Record<string, FindingDetail>;
  onActiveIndexChange?: (index: number) => void;
  onInspectCodebase?: (filePath?: string) => void;
  onInspectRequirements?: (requirementId?: string) => void;
  onInspectDocuments?: (artifactId?: string) => void;
}

/**
 * SpatialDeckStage: The single container-pinned spatial deck stage for CP7f.
 *
 * Implements:
 * 1. Physical Card Replacement: Card A recedes upward/backward and fades away;
 *    Card B physically rises over Card A and becomes primary.
 * 2. Single Master ScrollTrigger: No competing per-card triggers or nested pins.
 * 3. Strict Hardware-Accelerated Transforms: Only translateY, scale, opacity, z-index.
 *    ZERO blur and ZERO brightness filters to eliminate composite tile dropping.
 * 4. Zero CSS transitions on animated nodes (no transition-all conflict).
 * 5. Normalized segment model synchronized with ContextualReadingRail:
 *    N=2: 1 transition [0.0 -> 1.0]
 *    N=3: 2 transitions [0.0 -> 0.5 -> 1.0]
 *    N=4: 3 transitions [0.0 -> 0.333 -> 0.666 -> 1.0]
 * 6. Responsive Fallback: At <1024px or prefers-reduced-motion, reverts to
 *    natural high-performance document flow with zero sticky trapping.
 */
export const SpatialDeckStage: React.FC<SpatialDeckStageProps> = ({
  findings,
  detailsMap,
  onActiveIndexChange,
  onInspectCodebase,
  onInspectRequirements,
  onInspectDocuments,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const deckWrapperRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const N = findings.length;

  const notifyActiveIndex = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (onActiveIndexChange) {
        onActiveIndexChange(index);
      }
    },
    [onActiveIndexChange]
  );

  // Single card case: static presentation without scroll pinning
  if (N === 1) {
    const finding = findings[0];
    return (
      <div className="w-full max-w-4xl mx-auto px-1 py-4">
        <FindingDossierCard
          finding={finding}
          findingDetail={detailsMap[finding.id] || null}
          index={0}
          totalFindings={1}
          isPrimary={true}
          onInspectCodebase={onInspectCodebase}
          onInspectRequirements={onInspectRequirements}
          onInspectDocuments={onInspectDocuments}
        />
      </div>
    );
  }

  // Multi-card spatial deck with master GSAP timeline
  useGSAP(
    () => {
      if (N < 2) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.innerWidth < 1024) return; // Native document flow on mobile/tablet

      const stage = stageRef.current;
      const deckWrapper = deckWrapperRef.current;
      if (!stage || !deckWrapper) return;

      const cards = gsap.utils.toArray<HTMLDivElement>(".spatial-deck-card", deckWrapper);
      if (cards.length < 2) return;

      // Measure cards to ensure stage accommodates the largest card comfortably
      let maxHeight = 0;
      cards.forEach((c) => {
        if (c.offsetHeight > maxHeight) maxHeight = c.offsetHeight;
      });
      if (maxHeight > 0 && deckWrapperRef.current) {
        deckWrapperRef.current.style.minHeight = `${maxHeight + 24}px`;
      }

      // Initial visual setup for the card stack
      cards.forEach((card, i) => {
        if (i === 0) {
          gsap.set(card, {
            yPercent: 0,
            scale: 1.0,
            opacity: 1.0,
            zIndex: 10 + i,
            visibility: "visible",
            pointerEvents: "auto",
            transformOrigin: "center top",
          });
        } else {
          gsap.set(card, {
            yPercent: 24,
            scale: 0.96,
            opacity: 0.0,
            zIndex: 10 + i,
            visibility: "hidden",
            pointerEvents: "none",
            transformOrigin: "center top",
          });
        }
      });

      // Total scroll distance: 75vh of scroll travel per transition segment
      const numTransitions = N - 1;
      const travelPerSegment = 75; // vh
      const totalTravelPx = window.innerHeight * ((numTransitions * travelPerSegment) / 100);

      // Create the single master timeline
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: "top top+=88px",
          end: () => `+=${totalTravelPx}`,
          pin: true,
          pinType: "fixed",
          pinSpacing: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
          onEnter: () => {
            if (stage) stage.style.transform = "none";
          },
          onEnterBack: () => {
            if (stage) stage.style.transform = "none";
          },
          onLeaveBack: () => {
            if (stage) stage.style.transform = "none";
            notifyActiveIndex(0);
          },
          onLeave: () => {
            notifyActiveIndex(N - 1);
          },
          onUpdate: (self) => {
            if (self.isActive && stage) {
              stage.style.transform = "none";
            }
            const p = self.progress;
            let currentIdx: number;
            if (p >= 0.999) {
              currentIdx = N - 1;
            } else {
              // Normalized segment model matching user specification
              const segment = Math.floor(p * numTransitions);
              currentIdx = Math.min(Math.max(segment, 0), N - 2);
              // If we are halfway through the transition segment, highlight the rising card
              const segmentProgress = (p * numTransitions) - segment;
              if (segmentProgress >= 0.5) {
                currentIdx = segment + 1;
              }
            }
            notifyActiveIndex(currentIdx);
          },
        },
      });

      // Explicit timeline duration: each transition is 1.0 unit
      for (let i = 0; i < numTransitions; i++) {
        const cardA = cards[i];
        const cardB = cards[i + 1];
        const label = `handoff-${i}-to-${i + 1}`;
        const timeOffset = i * 1.0;

        masterTl.addLabel(label, timeOffset);

        // Before handoff starts, ensure Card B is visible and below
        masterTl.set(
          cardB,
          {
            visibility: "visible",
            pointerEvents: "auto",
          },
          timeOffset
        );

        // Card A: recedes upward slightly, scales down gently, fades away
        masterTl.to(
          cardA,
          {
            yPercent: -14,
            scale: 0.94,
            opacity: 0.0,
            ease: "power2.inOut",
            duration: 1.0,
          },
          timeOffset
        );

        // Card B: physically rises from below, scales to full size, fades in
        masterTl.to(
          cardB,
          {
            yPercent: 0,
            scale: 1.0,
            opacity: 1.0,
            ease: "power2.inOut",
            duration: 1.0,
          },
          timeOffset
        );

        // After handoff completes, Card A stops occupying pointer events
        masterTl.set(
          cardA,
          {
            visibility: "hidden",
            pointerEvents: "none",
          },
          timeOffset + 1.0
        );
      }

      // Handle window resize cleanly
      const handleResize = () => {
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        masterTl.scrollTrigger?.kill(true);
        masterTl.kill();
      };
    },
    {
      scope: stageRef,
      dependencies: [N, findings],
    }
  );

  return (
    <div ref={stageRef} className="w-full max-w-4xl mx-auto px-1 relative">
      {/* Visual Header above Deck */}
      <div className="flex items-center justify-between gap-3 px-2 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4924f]" />
          <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-[#d4924f]">
            Diagnostic Findings Deck
          </h2>
        </div>
        <span className="text-xs font-mono text-[#888e9b]">
          Finding {activeIndex + 1} of {N}
        </span>
      </div>

      {/* Desktop Container-Pinned Spatial Stage (relative container with stacked cards) */}
      <div ref={deckWrapperRef} className="hidden lg:block relative w-full">
        {/* The active card wrapper sets natural content-aware height for the stage */}
        {findings.map((finding, index) => (
          <div
            key={finding.id}
            ref={(el) => { cardRefs.current[index] = el; }}
            id={`finding-${finding.id}`}
            className={`w-full spatial-deck-card ${index === 0 ? "relative" : "absolute inset-0"}`}
            style={{ willChange: "transform, opacity" }}
          >
            <FindingDossierCard
              finding={finding}
              findingDetail={detailsMap[finding.id] || null}
              index={index}
              totalFindings={N}
              isPrimary={index === 0}
              onInspectCodebase={onInspectCodebase}
              onInspectRequirements={onInspectRequirements}
              onInspectDocuments={onInspectDocuments}
            />
          </div>
        ))}
      </div>

      {/* Mobile / Tablet Natural Document Flow (< 1024px or reduced-motion) */}
      <div className="block lg:hidden space-y-8">
        {findings.map((finding, index) => (
          <div key={finding.id} id={`finding-mobile-${finding.id}`}>
            <FindingDossierCard
              finding={finding}
              findingDetail={detailsMap[finding.id] || null}
              index={index}
              totalFindings={N}
              isPrimary={index === 0}
              onInspectCodebase={onInspectCodebase}
              onInspectRequirements={onInspectRequirements}
              onInspectDocuments={onInspectDocuments}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
