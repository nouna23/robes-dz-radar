import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CLAIM_FIELD_LABEL, CLAIM_TYPE_LABEL, LLM_PROVIDER_LABEL, SENTIMENT_LABEL } from "@/lib/ui/labels";

const CLAIM_STYLE: Record<string, string> = {
  EXPLICIT: "bg-emerald-100 text-emerald-800",
  INFERRED: "bg-amber-100 text-amber-800",
  HYPOTHESIS: "bg-neutral-200 text-neutral-700",
};

interface Claim {
  field: string;
  value: string;
  claimType: string;
}

export const dynamic = "force-dynamic";

export default async function SignalDetailPage(props: PageProps<"/signals/[id]">) {
  const { id } = await props.params;

  const signal = await prisma.signal.findUnique({
    where: { id },
    include: { source: true, problem: true },
  });

  if (!signal) notFound();

  const claims = Array.isArray(signal.claims) ? (signal.claims as unknown as Claim[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500">
          {signal.source.platform} · {signal.source.sourceName}
        </p>
        <h1 className="text-xl font-semibold">Signal</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="whitespace-pre-wrap text-sm text-neutral-800">{signal.rawText}</p>
        <a href={signal.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs underline">
          Voir la source originale
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Problème détecté" value={signal.isProblem ? "Oui" : "Non (bruit)"} />
        <Field label="Cible" value={signal.targetAudience ?? "—"} />
        <Field label="Sentiment" value={signal.sentiment ? SENTIMENT_LABEL[signal.sentiment] ?? signal.sentiment : "—"} />
        <Field label="Intensité" value={signal.intensity != null ? `${signal.intensity}/5` : "—"} />
        <Field label="Temps perdu mentionné" value={signal.timeLostMentioned ? "Oui" : "Non"} />
        <Field label="Argent perdu mentionné" value={signal.moneyLostMentioned ? "Oui" : "Non"} />
        <Field label="Recherche active de solution" value={signal.activeSearchIndicator ? "Oui" : "Non"} />
        <Field label="Volonté de payer" value={signal.willingnessToPay ? "Oui" : "Non"} />
        <Field label="Pertinence IA" value={signal.aiRelevance == null ? "?" : signal.aiRelevance ? "Oui" : "Non"} />
        <Field
          label="Fournisseur LLM"
          value={signal.llmProvider ? LLM_PROVIDER_LABEL[signal.llmProvider] ?? signal.llmProvider : "—"}
        />
      </div>

      {signal.existingToolsMentioned.length > 0 && (
        <Field label="Outils existants cités" value={signal.existingToolsMentioned.join(", ")} />
      )}

      {signal.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {signal.categories.map((c) => (
            <span key={c} className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
              {c}
            </span>
          ))}
        </div>
      )}

      {signal.problem && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm">
          Regroupé sous le problème : <span className="font-medium">{signal.problem.title}</span>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-medium">Preuves (explicite / déduit / hypothèse)</h2>
        <ul className="space-y-2">
          {claims.map((claim, i) => (
            <li key={i} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${CLAIM_STYLE[claim.claimType] ?? "bg-neutral-100"}`}>
                  {CLAIM_TYPE_LABEL[claim.claimType] ?? claim.claimType}
                </span>
                <span className="text-xs text-neutral-500">{CLAIM_FIELD_LABEL[claim.field] ?? claim.field}</span>
              </div>
              <p className="text-neutral-800">{claim.value}</p>
            </li>
          ))}
          {claims.length === 0 && <li className="text-sm text-neutral-500">Aucune preuve détaillée enregistrée.</li>}
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
