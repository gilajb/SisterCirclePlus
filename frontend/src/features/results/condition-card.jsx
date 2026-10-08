const BAR_COLORS = ["bg-primary", "bg-gold", "bg-mauve", "bg-[#5b8db8]", "bg-[#7bb585]"];

export function ConditionCard({ condition, index }) {
  const confidence = Math.max(0, Math.min(100, Number(condition.confidence) || 0));

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-l-[3px] border-l-mauve bg-card p-5 md:border-l md:border-l-border md:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-[17px] font-bold md:text-xl">{condition.name}</h3>
        <span className="rounded-md bg-[#f0f0f0] px-2.5 py-[3px] text-[15px] font-bold whitespace-nowrap md:hidden">
          {confidence}%
        </span>
        <span className="hidden text-[13px] font-bold text-muted-foreground md:inline">
          Confidence
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div
          role="meter"
          aria-label={`Confidence for ${condition.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={confidence}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"
        >
          <div
            className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span
          className="hidden min-w-12 text-right font-heading text-[22px] font-extrabold md:inline"
          aria-hidden="true"
        >
          {confidence}%
        </span>
      </div>
      <p className="text-sm leading-[1.65] text-body">{condition.description}</p>
      {condition.tags?.length ? (
        <ul className="flex flex-wrap gap-2">
          {condition.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-pink-pale px-3 py-1 text-xs font-semibold text-primary"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
