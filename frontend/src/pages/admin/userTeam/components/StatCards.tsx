type StatPair = { label: string; value: number };

type StatCardsProps = {
  cards: StatPair[][];
};

export default function StatCards({ cards }: StatCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((pairs, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-5 py-4"
        >
          <div className="space-y-3">
            {pairs.map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
