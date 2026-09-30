import re

def fix_render_evidence(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        code = f.read()

    new_render = '''  const renderEvidence = () => {
    if (loading) return <div className="p-4 text-center text-sm text-[var(--pd-text-muted)]">Loading evidence...</div>;
    if (!detail?.hydrated_evidence || detail.hydrated_evidence.length === 0) {
      return (
        <div className="p-8 bg-[var(--pd-surface)] rounded-xl text-center border border-[var(--pd-border)]">
          <FileSearch className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-[var(--pd-text-muted)]">No source evidence is linked yet.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto pr-2 text-left">
        {detail.hydrated_evidence.map((ev: any, i: number) => (
          <div key={i} className="p-4 bg-[var(--pd-surface)] rounded-xl border border-[var(--pd-border)] text-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {(ev.evidence_type || ev.role || "").replace(/_/g, " ")}
              </span>
              <span className="text-xs font-medium text-[var(--pd-text-muted)] capitalize">
                {(ev.target_type || "").replace(/_/g, " ")}
              </span>
            </div>
            {ev.title && <p className="text-sm font-semibold mb-2">{ev.title}</p>}
            {ev.snippet ? (
              <pre className="p-3 bg-white rounded-lg text-xs font-mono text-gray-800 overflow-x-auto border border-gray-100 whitespace-pre-wrap">
                {ev.snippet}
              </pre>
            ) : null}
            <div className="text-sm text-[var(--pd-text-body)] space-y-2 mt-2 bg-white p-3 rounded-lg border border-gray-100">
              {ev.file_path && <p><strong className="text-gray-900">Path:</strong> {ev.file_path}</p>}
              {ev.section_title && <p><strong className="text-gray-900">Section:</strong> {ev.section_title}</p>}
              {ev.page_number && <p><strong className="text-gray-900">Page:</strong> {ev.page_number}</p>}
              {ev.content_status === "security_omitted" && (
                <p className="text-amber-700 bg-amber-50 p-2 rounded flex items-center gap-2 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Content intentionally omitted for security reasons.
                </p>
              )}
              {ev.line_start && ev.line_end && (
                <p><strong className="text-gray-900">Lines:</strong> {ev.line_start} - {ev.line_end}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };'''

    code = re.sub(r'const renderEvidence = \(\) => \{[\s\S]*?^\s*};\n', new_render + '\n', code, flags=re.MULTILINE)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(code)

fix_render_evidence('frontend/src/components/desk/VerifiedStrengthsShowcase.tsx')
