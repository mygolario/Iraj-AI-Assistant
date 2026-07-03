export function AuroraBackground() {
  return (
    <>
      <div aria-hidden className="aurora-mesh">
        <div className="aurora-blob aurora-blob--indigo" />
        <div className="aurora-blob aurora-blob--violet" />
        <div className="aurora-blob aurora-blob--cyan" />
      </div>
      <div aria-hidden className="aurora-grid" />
    </>
  );
}
