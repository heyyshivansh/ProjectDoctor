import React, { useState, useMemo } from "react";
import { Requirement } from "@/types/requirement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Bookmark,
  Layers,
  AlertTriangle,
  User,
  ChevronRight,
} from "lucide-react";


interface RequirementListProps {
  requirements: Requirement[];
  onSelectRequirement: (requirementId: string) => void;
}

export const RequirementList: React.FC<RequirementListProps> = ({
  requirements,
  onSelectRequirement,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.requirement_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "ambiguous" && r.is_ambiguous) ||
        r.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [requirements, searchQuery, selectedCategory]);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "security":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "performance":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "interface":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "non_functional":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getPriorityBadgeClass = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "low":
        return "bg-slate-50 text-slate-600 border-slate-200";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter requirements by keyword, ID, or title..."
            className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {[
            { id: "all", label: "All" },
            { id: "functional", label: "Functional" },
            { id: "security", label: "Security" },
            { id: "performance", label: "Performance" },
            { id: "ambiguous", label: "Ambiguous" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requirements List */}
      {filteredRequirements.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <Layers className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No requirements found</p>
          <p className="text-xs text-slate-500">
            {requirements.length === 0
              ? "Click 'Extract Requirements' above to analyze specifications and generate atomic requirements."
              : "No requirements match your current search or category filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequirements.map((req) => (
            <Card
              key={req.id}
              className="border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => onSelectRequirement(req.requirement_id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {req.requirement_id}
                    </span>

                    <Badge
                      variant="outline"
                      className={`text-[11px] capitalize font-semibold ${getCategoryBadgeClass(
                        req.category
                      )}`}
                    >
                      {req.category}
                    </Badge>

                    {req.priority && (
                      <Badge
                        variant="outline"
                        className={`text-[11px] capitalize font-semibold ${getPriorityBadgeClass(
                          req.priority
                        )}`}
                      >
                        {req.priority}
                      </Badge>
                    )}

                    {req.actor && (
                      <Badge
                        variant="outline"
                        className="text-[11px] bg-slate-50 text-slate-600 border-slate-200"
                      >
                        <User className="h-3 w-3 mr-1 text-slate-400" />
                        {req.actor}
                      </Badge>
                    )}

                    {req.is_ambiguous && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        Ambiguous
                      </span>
                    )}

                    {req.status === "conflicted" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <AlertTriangle className="h-3 w-3" />
                        Conflicted
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRequirement(req.requirement_id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{req.evidence_count} evidence</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                  {req.title}
                </h4>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {req.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
