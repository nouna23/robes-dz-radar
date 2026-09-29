import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PROBLEM_STATUS_LABEL } from "@/lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const problems = await prisma.problem.findMany({
    orderBy: [{ signals: { _count: "desc" } }, { lastSeenAt: "desc" }],
    include: { _count: { select: { signals: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Problèmes regroupés</h1>

      {problems.length === 0 && (
        <p className="text-sm text-neutral-600">
          Aucun problème regroupé pour l&apos;instant — le regroupement (clustering) tourne après la détection dans{" "}
          <code className="rounded bg-neutral-100 px-1">npm run pipeline</code>.
        </p>
      )}

      <ul className="space-y-3">
        {problems.map((problem) => (
          <li key={problem.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-neutral-100 px-2 py-0.5">{problem._count.signals} signal(aux)</span>
              {problem.category && <span className="rounded bg-neutral-100 px-2 py-0.5">{problem.category}</span>}
              <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-800">
                {PROBLEM_STATUS_LABEL[problem.status] ?? problem.status}
              </span>
            </div>
            <h2 className="font-medium">{problem.title}</h2>
            <p className="line-clamp-2 text-sm text-neutral-600">{problem.description}</p>
            <Link href={`/problems/${problem.id}`} className="mt-2 inline-block text-xs underline">
              Voir le détail
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
