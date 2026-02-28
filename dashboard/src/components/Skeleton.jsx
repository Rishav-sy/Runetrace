export function SkeletonCard() {
  return (
    <div className="skel-card">
      <div className="skel skel-line-sm" />
      <div className="skel skel-line-lg" />
      <div className="skel skel-line-md" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skel-chart">
      <div className="skel skel-line-sm" />
      <div className="skel-bars">
        {[65, 45, 30, 20, 12].map((h, i) => (
          <div key={i} className="skel" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="skel-chart" style={{ marginTop: 12 }}>
      <div className="skel skel-line-sm" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skel-row">
          <div className="skel skel-cell-sm" />
          <div className="skel skel-cell-sm" />
          <div className="skel skel-cell-lg" />
          <div className="skel skel-cell-sm" />
          <div className="skel skel-cell-sm" />
        </div>
      ))}
    </div>
  );
}
