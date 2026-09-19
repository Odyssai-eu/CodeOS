# Task File : le fichier task.md est la source de vérité, pas l'état serveur

La checklist d'un plan vit dans `.opencode/plans/<slug>/task.md` (markdown
annoté : rôle, statut, dépendances, points par item). L'Orchestrator le lit
avant CHAQUE dispatch et l'écrit après chaque transition ; Mission Control le
watch ; Sophie peut l'éditer à la main mi-run (re-prioriser, rayer une tâche)
et l'Orchestrator obéit. Philosophie Eve « filesystem as authoring interface ».
Décision au grill 2026-07-16.

**Alternative rejetée** : état serveur source de vérité avec task.md en
projection lecture seule — plus sûr contre les écritures concurrentes, mais
tue l'édition à la main mi-run et meurt avec la session.

**Conséquence à gérer** : écritures concurrentes orchestrateur/humain. Un seul
écrivain machine (l'Orchestrator, jamais les subagents), relecture avant
chaque écriture, écriture atomique (rename).
