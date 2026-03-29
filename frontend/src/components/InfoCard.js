function formatValue(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}

function formatSource(value) {
  const source = String(value || 'manual');
  if (source === 'workspace-sketcher') return 'Workspace Sketcher';
  if (source === 'chemical-name') return 'Chemical Name Lookup';
  if (source === 'image') return 'Image Recognition';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function formatRenderFormat(value) {
  const format = String(value || '').toUpperCase();
  return format || 'N/A';
}

function formatTimestamp(value) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
}

function InfoSection({ title, items }) {
  const visibleItems = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== '');
  if (visibleItems.length === 0) return null;

  return (
    <section className="infocard-section">
      <h4>{title}</h4>
      <div className="infocard-section-grid">
        {visibleItems.map((item) => (
          <div className="infocard-item" key={item.label}>
            <span className="infocard-label">{item.label}</span>
            <span className={`infocard-value${item.break ? ' break-all' : ''}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoCard({ moleculeInfo }) {
  const hasData = Boolean(
    moleculeInfo?.formula
    || moleculeInfo?.canonicalSmiles
    || moleculeInfo?.smiles
    || moleculeInfo?.inchikey
    || moleculeInfo?.inchi
    || moleculeInfo?.molecularWeight
  );

  const summaryItems = [
    { label: 'Source', value: formatSource(moleculeInfo?.source) },
    { label: 'Name', value: formatValue(moleculeInfo?.name) },
    { label: 'Formula', value: formatValue(moleculeInfo?.formula) },
    { label: 'Render Format', value: formatRenderFormat(moleculeInfo?.renderFormat) },
    { label: 'Updated', value: formatTimestamp(moleculeInfo?.updatedAt) }
  ];

  const structureItems = [
    { label: 'Canonical SMILES', value: formatValue(moleculeInfo?.canonicalSmiles), break: true },
    { label: 'Input SMILES', value: formatValue(moleculeInfo?.smiles), break: true },
    { label: 'InChI', value: formatValue(moleculeInfo?.inchi), break: true },
    { label: 'InChIKey', value: formatValue(moleculeInfo?.inchikey), break: true }
  ];

  const descriptorItems = [
    { label: 'Molecular Weight', value: formatValue(moleculeInfo?.molecularWeight) },
    { label: 'LogP', value: formatValue(moleculeInfo?.logP) },
    { label: 'TPSA', value: formatValue(moleculeInfo?.tpsa) },
    { label: 'H-Bond Donors', value: formatValue(moleculeInfo?.hBondDonors) },
    { label: 'H-Bond Acceptors', value: formatValue(moleculeInfo?.hBondAcceptors) }
  ];

  const workspaceItems = [
    { label: 'Atoms', value: formatValue(moleculeInfo?.atomCount) },
    { label: 'Conformers', value: formatValue(moleculeInfo?.conformers) },
    { label: 'Energy', value: formatValue(moleculeInfo?.energy) },
    { label: 'Fragments', value: formatValue(moleculeInfo?.fragmentCount) },
    { label: 'Disconnected', value: moleculeInfo?.disconnected ? 'Yes' : 'No' }
  ];

  return (
    <section className="workspace-infocard-panel">
      <div className="infocard-head">
        <h3>Molecular Information</h3>
        <p>Structured metadata for the current workspace molecule.</p>
      </div>
      {!hasData && <p className="workspace-info-notice">No molecule metadata is available yet. Generate a structure first.</p>}
      {hasData && (
        <div className="infocard-layout">
          <InfoSection title="Summary" items={summaryItems} />
          <InfoSection title="Structure" items={structureItems} />
          <InfoSection title="Descriptors" items={descriptorItems} />
          <InfoSection title="Workspace" items={workspaceItems} />
        </div>
      )}
    </section>
  );
}

export default InfoCard;
