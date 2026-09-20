import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ProjectDetail } from "@/types/project";
import {
  ProjectDiagnosis,
  FindingSummary,
  FindingDetail,
  FindingSeverity,
} from "@/types/diagnosis";
import { getFindingDetail } from "@/services/diagnosis";
import { StudioOverlookCard } from "./StudioOverlookCard";
import { SpatialDeckStage } from "./SpatialDeckStage";
import { WhatsWorkingSection } from "./WhatsWorkingSection";
import { ContextualReadingRail, RailSection } from "./ContextualReadingRail";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

interface StudioViewportProps {
  project: ProjectDetail;
  diagnosis: ProjectDiagnosis | null;
  onInspectCodebase?: (filePath?: string) => void;
  onInspectRequirements?: (requirementId?: string) => void;
  onInspectDocuments?: (artifactId?: string) => void;
}

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  critical: 1,
  major: 2,
  needs_attention: 3,
  improvement: 4,
  strength: 5,
};

/**
 * StudioViewport: Primary orchestrator of The Spatial Diagnostic Journey (CP7f).
 *
 * Implements:
 * 1. Scene 1: Studio Overlook Card (Qualitative verdict & project scope)
 * 2. Scene 2/3: SpatialDeckStage (Master container-pinned card deck with physical replacement)
 * 3. Scene 4: WhatsWorkingSection (Curated 4-pillar architectural strengths deck)
 * 4. Contextual Reading Rail synchronized in real-time with the deck's master timeline
 * 5. Full deep-link bridges into Codebase, Requirements, and Documents explorers
 */
export const StudioViewport: React.FC<StudioViewportProps> = ({
  project,
  diagnosis,
  onInspectCodebase,
  onInspectRequirements,
  onInspectDocuments,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("scene-overlook");

  // Deterministically sort findings by severity category, preserving backend array order for ties
  const sortedFindings = useMemo<FindingSummary[]>(() => {
    if (!diagnosis) return [];
    const combined = [...(diagnosis.top_findings || [])];
    return combined.sort((a, b) => {
      const weightA = SEVERITY_WEIGHT[a.severity] || 99;
      const weightB = SEVERITY_WEIGHT[b.severity] || 99;
      return weightA - weightB;
    });
  }, [diagnosis]);

  // Cache for hydrated finding details
  const [detailsMap, setDetailsMap] = useState<Record<string, FindingDetail>>({});

  // Asynchronously hydrate finding details
  const fetchAllDetails = useCallback(async () => {
    sortedFindings.forEach(async (f) => {
      if (!detailsMap[f.id]) {
        try {
          const detail = await getFindingDetail(project.id, f.id);
          setDetailsMap((prev) => ({ ...prev, [f.id]: detail }));
        } catch {
          // Quiet fallback
        }
      }
    });
  }, [sortedFindings, project.id, detailsMap]);

  useEffect(() => {
    fetchAllDetails();
  }, [fetchAllDetails]);

  // Build contextual reading rail sections
  const railSections = useMemo<RailSection[]>(() => {
    const sections: RailSection[] = [
      { id: "scene-overlook", label: "Overview", indexLabel: "00" },
    ];

    sortedFindings.forEach((f, idx) => {
      sections.push({
        id: `finding-${f.id}`,
        label: f.title,
        indexLabel: `0${idx + 1}`,
      });
    });

    if (diagnosis?.strengths && diagnosis.strengths.length > 0) {
      sections.push({
        id: "scene-whats-working",
        label: "What's Working",
        indexLabel: `0${sortedFindings.length + 1}`,
      });
    }

    return sections;
  }, [sortedFindings, diagnosis?.strengths]);

  const handleScrollToSection = (id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
      setActiveSectionId(id);
    }
  };

  // Support initial hash scrolling (e.g. from deep links)
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      const timer = setTimeout(() => {
        const elem = document.getElementById(targetId);
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth" });
          setActiveSectionId(targetId);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  // Update active section when deck stage progress changes
  const handleDeckActiveIndexChange = useCallback(
    (index: number) => {
      if (sortedFindings[index]) {
        setActiveSectionId(`finding-${sortedFindings[index].id}`);
      }
    },
    [sortedFindings]
  );

  // Monitor Overlook and What's Working viewport entry
  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: "#scene-overlook",
        start: "top 70%",
        end: "bottom 30%",
        onEnter: () => setActiveSectionId("scene-overlook"),
        onEnterBack: () => setActiveSectionId("scene-overlook"),
      });

      if (diagnosis?.strengths && diagnosis.strengths.length > 0) {
        ScrollTrigger.create({
          trigger: "#scene-whats-working",
          start: "top 60%",
          end: "bottom 80%",
          onEnter: () => setActiveSectionId("scene-whats-working"),
        });
      }
    },
    { scope: containerRef, dependencies: [diagnosis?.strengths] }
  );

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-16 sm:space-y-20 relative">
      {/* Subtle Contextual Reading Rail */}
      <ContextualReadingRail
        sections={railSections}
        activeSectionId={activeSectionId}
        onSelectSection={handleScrollToSection}
      />

      {/* SCENE 1: The Diagnosis Overlook */}
      <StudioOverlookCard project={project} diagnosis={diagnosis} />

      {/* SCENE 2 & 3: The Spatial Findings Deck Stage */}
      {sortedFindings.length > 0 && (
        <SpatialDeckStage
          findings={sortedFindings}
          detailsMap={detailsMap}
          onActiveIndexChange={handleDeckActiveIndexChange}
          onInspectCodebase={onInspectCodebase}
          onInspectRequirements={onInspectRequirements}
          onInspectDocuments={onInspectDocuments}
        />
      )}

      {/* SCENE 4: WHAT'S WORKING (Verified Architectural Strengths Deck) */}
      {diagnosis?.strengths && diagnosis.strengths.length > 0 && (
        <WhatsWorkingSection strengths={diagnosis.strengths} />
      )}
    </div>
  );
};
