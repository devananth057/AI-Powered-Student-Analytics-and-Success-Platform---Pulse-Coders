export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-title">{title}</span>

        <div className={`stat-icon ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <h2 className="stat-value">{value}</h2>
      <p className="stat-description">{description}</p>
    </article>
  );
}