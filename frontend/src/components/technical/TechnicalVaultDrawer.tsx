import React from "react";
import { FindingDetail } from "@/types/diagnosis";
import * as Accordion from "@radix-ui/react-accordion";
import { StructuredMetadataGrid } from "./StructuredMetadataGrid";
import { DebugJsonViewer } from "./DebugJsonViewer";
import { Shield, ChevronDown } from "lucide-react";

interface TechnicalVaultDrawerProps {
  finding: FindingDetail;
}

/**
 * TechnicalVaultDrawer: Accessible collapsible technical disclosure
 * implemented using @radix-ui/react-accordion.
 * Holds structured cryptographic metadata and opt-in raw debug JSON.
 */
export const TechnicalVaultDrawer: React.FC<TechnicalVaultDrawerProps> = ({ finding }) => {
  return (
    <Accordion.Root type="single" collapsible className="w-full">
      <Accordion.Item
        value="technical-vault"
        className="overflow-hidden rounded-2xl border border-[#2a2f38] bg-[#15181d] text-[#eceae4]"
      >
        <Accordion.Header className="flex m-0">
          <Accordion.Trigger className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[#1b1f26] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c98a4b] group">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-[#c98a4b]" />
              <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-[#eceae4] font-medium">
                Technical Audit Vault
              </span>
              <span className="text-xs font-mono text-[#5c626f] hidden sm:inline">
                • Cryptographic Identifiers & AST Rules
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#9aa0aa] group-hover:text-[#eceae4]">
              <span className="group-data-[state=open]:hidden">Inspect Metadata</span>
              <span className="group-data-[state=closed]:hidden">Collapse Vault</span>
              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180 text-[#c98a4b]" />
            </div>
          </Accordion.Trigger>
        </Accordion.Header>

        <Accordion.Content className="p-5 pt-3 border-t border-[#2a2f38] bg-[#15181d] space-y-4 overflow-hidden">
          <StructuredMetadataGrid finding={finding} />
          <DebugJsonViewer data={finding} />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
};
