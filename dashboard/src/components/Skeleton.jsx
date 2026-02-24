import './Skeleton.css';

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-short" />
      <div className="skeleton-line skeleton-large" />
      <div className="skeleton-line skeleton-medium" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skeleton-chart">
      <div className="skeleton-line skeleton-short" />
      <div className="skeleton-bars">
        {[70, 50, 35, 20, 15].map((h, i) => (
          <div key={i} className="skeleton-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="skeleton-table">
      <div className="skeleton-line skeleton-short" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-line skeleton-cell" />
          <div className="skeleton-line skeleton-cell-sm" />
          <div className="skeleton-line skeleton-cell-lg" />
          <div className="skeleton-line skeleton-cell-sm" />
          <div className="skeleton-line skeleton-cell-sm" />
        </div>
      ))}
    </div>
  );
}
