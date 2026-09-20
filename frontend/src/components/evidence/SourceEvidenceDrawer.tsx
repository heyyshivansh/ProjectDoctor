import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, ChevronRight, FileCode, FileText, Database, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FindingDetail } from '@/types/diagnosis';

interface SourceEvidenceDrawerProps {
  isOpen: boolean;
  findingDetail: FindingDetail | null;
  onClose: () => void;
}

const getTypeIcon = (type?: string | null) => {
  switch (type?.toLowerCase()) {
    case 'repository_file':
    case 'repository_evidence':
      return <FileCode className="w-4 h-4" />;
    case 'requirement':
    case 'traceability':
      return <Database className="w-4 h-4" />;
    case 'artifact':
    case 'document':
      return <FileText className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const formatTargetType = (type?: string | null) => {
  if (!type) return 'Unknown Source';
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export function SourceEvidenceDrawer({ isOpen, findingDetail, onClose }: SourceEvidenceDrawerProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
    if (!isOpen) {
      setShowTechnical(false);
    }
  }, [isOpen]);

  if (!isOpen || !findingDetail) return null;

  const evidences = findingDetail.hydrated_evidence || [];

  const drawerVariants = {
    hidden: isMobile ? { y: '100%' } : { x: '100%' },
    visible: isMobile ? { y: 0 } : { x: 0 },
    exit: isMobile ? { y: '100%' } : { x: '100%' }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Evidence drawer"
            tabIndex={-1}
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed z-50 flex flex-col bg-[var(--pd-surface)] shadow-2xl outline-none",
              // Mobile: bottom sheet
              "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl border-t border-[var(--pd-border)]",
              // Desktop: right drawer
              "lg:top-0 lg:bottom-0 lg:left-auto lg:right-0 lg:max-h-full lg:w-[min(520px,50vw)] lg:rounded-none lg:border-l lg:border-t-0 lg:border-[var(--pd-border)]"
            )}
          >
            {/* Mobile Drag Handle */}
            {isMobile && (
              <div
                className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing"
                onClick={onClose}
              >
                <div className="w-12 h-1.5 rounded-full bg-[var(--pd-text-faint)]" />
              </div>
            )}

            {/* Header */}
            <div
              className={cn(
                "flex flex-col gap-1 px-6 pb-4 border-b border-[var(--pd-border)] bg-[var(--pd-surface)]",
                isMobile ? "pt-2" : "pt-6"
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--pd-text-primary)]">
                  Source Evidence Inspection
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 -mr-2 rounded-md text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-border-focus)]"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--pd-text-body)] line-clamp-2">
                {findingDetail.title}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {evidences.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--pd-text-muted)]">
                  <AlertTriangle className="w-10 h-10 mb-3 opacity-30 text-[var(--pd-text-muted)]" />
                  <p className="text-xs font-mono">No detailed evidence records available for this finding.</p>
                </div>
              ) : (
                evidences.map((item, idx) => (
                  <motion.div
                    key={`${item.target_id}-${idx}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                    className="flex flex-col gap-3"
                  >
                    {/* Type & Confidence Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-[var(--pd-text-muted)] bg-[var(--pd-surface-raised)] px-2.5 py-1.5 rounded-md border border-[var(--pd-border)]">
                        {getTypeIcon(item.target_type)}
                        <span>{formatTargetType(item.target_type)}</span>
                      </div>
                      {item.match_confidence != null && (
                        <div className="text-xs text-[var(--pd-text-muted)] px-2.5 py-1.5 rounded-md border border-[var(--pd-border)]">
                          {(item.match_confidence * 100).toFixed(0)}% Match
                        </div>
                      )}
                    </div>

                    {/* Evidence Title (non-file items) */}
                    {item.title && !item.file_path && (
                      <h4 className="text-sm font-medium text-[var(--pd-text-primary)]">
                        {item.title}
                      </h4>
                    )}

                    {/* File Path Header */}
                    {item.file_path && (
                      <div className="flex items-center justify-between text-sm text-[var(--pd-text-body)] font-mono bg-[var(--pd-canvas-subtle)] px-3 py-2 rounded-t-md border border-[var(--pd-border)] border-b-0">
                        <span className="truncate" title={item.file_path}>{item.file_path}</span>
                        {(item.line_start != null || item.line_end != null) && (
                          <span className="flex-shrink-0 text-xs text-[var(--pd-text-muted)]">
                            L{item.line_start}{item.line_end && item.line_end !== item.line_start ? `-${item.line_end}` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Snippet Content */}
                    {item.snippet && (
                      <div className={cn(
                        "relative text-sm text-[var(--pd-text-body)] bg-[var(--pd-canvas)] rounded-lg border border-[var(--pd-border)] overflow-hidden",
                        item.file_path ? "rounded-t-none" : "",
                        findingDetail.severity === 'critical' ? 'border-l-4 border-l-[var(--pd-coral)]' :
                        findingDetail.severity === 'major' ? 'border-l-4 border-l-[var(--pd-amber)]' : ''
                      )}>
                        {item.file_path ? (
                          <pre className="p-4 overflow-x-auto text-xs font-mono text-[var(--pd-text-body)] leading-relaxed whitespace-pre-wrap break-words">
                            {item.snippet}
                          </pre>
                        ) : (
                          <blockquote className="p-4 italic text-[var(--pd-text-body)] border-l-2 border-l-[var(--pd-ai)] bg-[var(--pd-surface-raised)]">
                            {item.snippet}
                          </blockquote>
                        )}
                      </div>
                    )}

                    {/* Divider between evidence items */}
                    {idx < evidences.length - 1 && (
                      <div className="border-b border-[var(--pd-border)] mt-2" />
                    )}
                  </motion.div>
                ))
              )}

              {/* Technical Record */}
              <div className="pt-8 pb-4">
                <button
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-border-focus)] rounded-sm"
                  aria-expanded={showTechnical}
                >
                  {showTechnical ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Technical Record
                </button>

                <AnimatePresence>
                  {showTechnical && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-raised)] space-y-3 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-[var(--pd-text-muted)]">ID</span>
                          <span className="col-span-2 font-mono text-[var(--pd-text-body)] select-all truncate">{findingDetail.id}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-[var(--pd-text-muted)]">Rule</span>
                          <span className="col-span-2 font-mono text-[var(--pd-text-body)] truncate">{findingDetail.finding_type}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-[var(--pd-text-muted)]">Hash</span>
                          <span className="col-span-2 font-mono text-[var(--pd-text-body)] truncate" title={findingDetail.finding_hash}>
                            {findingDetail.finding_hash}
                          </span>
                        </div>
                        {findingDetail.snapshot_id && (
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-[var(--pd-text-muted)]">Snapshot</span>
                            <span className="col-span-2 font-mono text-[var(--pd-text-body)] truncate">{findingDetail.snapshot_id}</span>
                          </div>
                        )}
                        {findingDetail.commit_sha && (
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-[var(--pd-text-muted)]">Commit</span>
                            <span className="col-span-2 font-mono text-[var(--pd-text-body)]">
                              {findingDetail.commit_sha.substring(0, 7)}
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-[var(--pd-text-muted)]">Severity</span>
                          <span className="col-span-2 text-[var(--pd-text-body)] capitalize">{findingDetail.severity.replace('_', ' ')}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-[var(--pd-text-muted)]">Refs</span>
                          <span className="col-span-2 text-[var(--pd-text-body)]">{findingDetail.evidence_references?.length || 0} items</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-[var(--pd-text-muted)]">Created</span>
                          <span className="col-span-2 text-[var(--pd-text-body)]">{new Date(findingDetail.created_at).toLocaleString()}</span>
                        </div>

                        {findingDetail.technical_details && Object.keys(findingDetail.technical_details).length > 0 && (
                          <div className="pt-2 mt-2 border-t border-[var(--pd-border)]">
                            <span className="text-[var(--pd-text-muted)] mb-2 block">Raw Data</span>
                            <pre className="font-mono text-[10px] text-[var(--pd-text-body)] bg-[var(--pd-canvas)] p-3 rounded-lg overflow-x-auto">
                              {JSON.stringify(findingDetail.technical_details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
