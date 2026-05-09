export function StatusBadge({ status }) {
  const map = {
    open: 'badge-open',
    reopened: 'badge-reopened',
    'in-progress': 'badge-in-progress',
    resolved: 'badge-resolved',
    closed: 'badge-closed',
  };
  const label = {
    open: 'Open',
    reopened: 'Reopened',
    'in-progress': 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return (
    <span className={`badge ${map[status] || 'badge-open'}`}>
      <span className="badge-dot" />
      {label[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const map = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Urgent: 'badge-urgent', 'Very High': 'badge-urgent' };
  return <span className={`badge ${map[priority] || 'badge-low'}`}>{priority}</span>;
}

export function RemoteBadge({ remote }) {
  if (!remote || remote === 'In Person') return <span className="tag no-remote-tag">In Person</span>;
  if (remote === 'Over Phone') return <span className="tag no-remote-tag">Phone</span>;
  return <span className="tag remote-tag">{remote}</span>;
}
