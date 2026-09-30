with open('frontend/src/pages/ReviewDeskPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

start_marker = "{/* VIEW 4: ANALYZE */}"
end_marker = "{/* VIEW 5: IMPROVE */}"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_analyze = '''{/* VIEW 4: ANALYZE */}
          {activeSection === 'analyze' && (
            <div className="space-y-6 pb-32 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-[var(--pd-text-primary)]">Control Room: {project.title}</h2>
                <p className="text-sm text-[var(--pd-text-body)]">
                  Project Doctor compares your specification documents with the repository code to find what is implemented, what is missing, and what needs attention.
                </p>
              </div>

              {/* Analysis Inputs Panel */}
              <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 shadow-pd-card space-y-4">
                <h3 className="text-sm font-semibold text-[var(--pd-text-primary)] uppercase tracking-wider font-mono">
                  Included in Analysis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(project.artifacts || []).map((artifact) => (
                    <div key={artifact.id} className="bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-xl p-4 flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[var(--pd-text-muted)] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--pd-text-primary)] truncate">{artifact.original_filename}</p>
                        <p className="text-xs text-[var(--pd-text-muted)]">Specification Document</p>
                      </div>
                    </div>
                  ))}
                  {repoConnection && (
                    <div className="bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-xl p-4 flex items-start gap-3">
                      <Github className="w-4 h-4 text-[var(--pd-text-muted)] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--pd-text-primary)] truncate">{repoConnection.owner}/{repoConnection.repo_name}</p>
                        <p className="text-xs text-[var(--pd-text-muted)]">
                          {repoConnection.current_snapshot ? f"{repoConnection.current_snapshot.total_files} files" : 'GitHub Repository'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis Status Panel */}
              <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 shadow-pd-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--pd-text-primary)] uppercase tracking-wider font-mono">
                      Analysis State
                    </h3>
                    {analysisStatus?.analyzed_at && (
                      <p className="text-xs text-[var(--pd-text-muted)] mt-1">
                        Last analyzed: {new Date(analysisStatus.analyzed_at + 'Z').toLocaleString()}
                      </p>
                    )}
                  </div>
                  {analysisStatus?.status === 'running' && (
                    <span className="flex items-center gap-2 text-xs font-mono font-medium text-[var(--pd-ai)] bg-[var(--pd-ai)]/10 px-3 py-1.5 rounded-full border border-[var(--pd-ai)]/20">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analysis Active
                    </span>
                  )}
                  {(analysisStatus?.status === 'completed' || analysisStatus?.status === 'stale') && (
                    <span className={cn(
                      "flex items-center gap-2 text-xs font-mono font-medium px-3 py-1.5 rounded-full",
                      analysisStatus.status === 'stale' 
                        ? "text-amber-700 bg-amber-50 border border-amber-200"
                        : "text-[var(--pd-mint)] bg-[var(--pd-mint-wash)] border border-[var(--pd-mint)]/20"
                    )}>
                      {analysisStatus.status === 'stale' ? (
                        <><AlertCircle className="w-3.5 h-3.5" /> Results Stale (Re-analyze needed)</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Up to Date</>
                      )}
                    </span>
                  )}
                </div>

                {analysisStatus?.status === 'running' && analysisStatus.stages && analysisStatus.stages.length > 0 && (
                  <div className="space-y-3 bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] p-4 rounded-xl">
                    {analysisStatus.stages.map((stage, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {stage.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--pd-mint)] shrink-0" />
                        ) : stage.status === 'active' ? (
                          <Loader2 className="w-4 h-4 text-[var(--pd-ai)] animate-spin shrink-0" />
                        ) : stage.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
                        )}
                        <div className={cn("flex-1 text-sm", stage.status === 'active' ? "text-[var(--pd-text-primary)] font-medium" : "text-[var(--pd-text-muted)]")}>
                          {stage.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(analysisStatus?.status === 'completed' || analysisStatus?.status === 'stale') && (
                  <div className="pt-4 border-t border-[var(--pd-border)] flex justify-end">
                    <button
                      onClick={() => setActiveSection('diagnosis')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)]"
                    >
                      View Diagnosis Results &rarr;
                    </button>
                  </div>
                )}
                {(!analysisStatus || (analysisStatus.status !== 'running' && analysisStatus.status !== 'completed' && analysisStatus.status !== 'stale')) && (
                  <div className="pt-4 border-t border-[var(--pd-border)] text-sm text-[var(--pd-text-muted)]">
                    Ready to run analysis. Use the Re-analyze button in the top right.
                  </div>
                )}
              </div>
            </div>
          )}
  
          '''
    code = code[:start_idx] + new_analyze + code[end_idx:]

with open('frontend/src/pages/ReviewDeskPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
