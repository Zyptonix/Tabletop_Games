import { ALL_UNO_CARD_ASSET_KEYS, cardThemeOptions } from "@/lib/cards";

export default function DevCardsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">Developer Gallery</p>
          <h1 className="text-3xl font-black">UNO Card Assets</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-white/60">
            Generated PNGs live in public/assets/uno/cards. Tune crop coordinates in scripts/generate-uno-card-assets.py.
          </p>
        </div>

        {cardThemeOptions.map((theme) => (
          <section key={theme.id} className="space-y-3">
            <h2 className="text-xl font-black">{theme.label}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {ALL_UNO_CARD_ASSET_KEYS.map((key) => (
                <figure key={`${theme.id}-${key}`} className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <div className="grid h-36 place-items-center">
                    <img
                      src={`/assets/uno/cards/${theme.id}/${key}.png`}
                      alt={key}
                      className="max-h-36 object-contain drop-shadow-[0_16px_18px_rgb(0_0_0_/_0.35)]"
                    />
                  </div>
                  <figcaption className="mt-2 truncate text-center text-[0.68rem] font-bold text-white/65">{key}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
