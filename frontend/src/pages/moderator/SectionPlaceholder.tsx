type SectionPlaceholderProps = {
  title: string;
  subtitle?: string;
};

const SectionPlaceholder = ({ title, subtitle = "This moderator section is a placeholder." }: SectionPlaceholderProps) => {
  return (
    <main className="relative z-10 px-4 py-4 md:ml-72 md:px-8 md:py-6">
      <section className="animate-[fadeIn_420ms_ease-out] rounded-2xl border border-white/15 bg-black/20 p-6 md:p-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-wide text-white md:text-3xl">{title}</h1>
        <p className="text-sm text-zinc-400 md:text-base">{subtitle}</p>
      </section>
    </main>
  );
};

export default SectionPlaceholder;
