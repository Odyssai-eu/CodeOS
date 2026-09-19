// coeos-code — configuration embarquée CoeOS-only + méthodologie OdyssAI.
// Injectée dans le sidecar via OPENCODE_CONFIG_CONTENT (précédence maximale,
// aucun fichier utilisateur requis). Pipeline config v1 UNIQUEMENT — le format
// v2 `providers` est hors schéma et fait rejeter tout le config (vérifié).
// Ids modèles = ids exacts OdyssAI-x (auto-swap OFF: ils doivent être chargés).
// Voir Odyssai-eu/coeos-code#2 (provider lock) et #6 (méthodo/agents).

import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { CodeosAssets } from "./coeos-assets"
import type { ResolvedEngine } from "./coeos-pairing"
import { getStore } from "./store"
import { MODEL_CATALOG_KEY, PLAN_MODEL_KEY, ROLE_ASSIGNMENT_KEY } from "./store-keys"

// Pas d'endpoint en dur (règle dev OdyssAI) — l'engine est résolu au démarrage
// par coeos-pairing.ts (découverte LAN / provisionné / env) et injecté ici.

// Global rules — wired into the harness, not a user prompt.
export const CODEOS_RULES = `coeos-code rules (non-negotiable):
1. EVIDENCE FIRST: a probability is not a certainty. Before acting on a "probably",
   verify it (source code, a reproducible test, established docs). If verification
   is impossible, say "unverified hypothesis" instead of asserting.
2. NO WORKAROUNDS, EVER: a workaround hides the problem; a minimal fix repairs the
   root cause touching as little as possible. The rule isn't "big fix", it's "real fix".
3. DEAD HORSE: if you're stacking a patch on a patch to keep an approach alive, the
   approach is dead. Stop, roll back, take another direction.
4. RE-DECIDE AT EVERY STEP: the previous decision never runs on autopilot. At each
   step, re-examine the alternatives.
5. ESTIMATE in Fibonacci complexity points (1,2,3,5,8,13,21), NEVER in time units.
6. No emojis in code or commit messages.
7. Be technical and direct, no flattery. Answer in the user's own language.

On a LAYERED task (multi-step, unknowns, debugging where the first theory may be
wrong), apply the Fable method — 5 gates in order, each passes before the next
(\`/fable\` to run it in full):
G1 Scope — state what "done" means + the check that proves it, before touching anything.
G2 Evidence — open the real file/API/data, never design from memory; one thin
   end-to-end pass before generalizing.
G3 Adversarial — attack your own answer (what input makes it wrong? test it), then
   steelman what survives. Two failed fixes = the diagnosis is wrong.
G4 Verify — at the layer of the CLAIM ("it ran" != verified): re-open, re-run,
   sample the tails (first, last, weirdest). Good news is suspect.
G5 Report calibrated — answer first; separate verified from assumed; cite evidence.
Trivial (one-file edit, simple lookup) → skip the gates, just do the work.`

export const COEOS_DEFAULT_CONFIG = {
  // Mode par défaut = Ody. Sans ça, opencode retombe sur "build" (agent.ts:322),
  // désormais MASQUÉ -> l'app démarrerait sur un mode caché. Ody est l'assistant
  // général de bench.
  default_agent: "ody",
  // Défaut = cerveau des agents sans model explicite. SURCHARGÉ DYNAMIQUEMENT par
  // buildCoeosConfig (1er modèle cloud or:… réellement servi). Cette valeur n'est que
  // le dernier recours si le moteur est injoignable au boot ; choisir un modèle cloud
  // (le pool local mono-modèle se ferait swapper par le chargement du modèle sous test).
  model: "coeos/or:glm-5.3-flash",
  // Le VRAI lock CoeOS-only : provider.ts:1359-1364 (isProviderAllowed) exclut
  // tout providerID absent de ce Set. Vérifié 2026-07-15 (P0b) : un
  // opencode.json projet qui tente enabled_providers:["anthropic"] ne casse
  // rien — OPENCODE_CONFIG_CONTENT charge APRÈS le fichier projet (même merge
  // last-write-wins, config.ts:350-352), donc regagne toujours ["coeos"].
  enabled_providers: ["coeos", "minimax"],
  // `experimental.policies` ci-dessous est un champ MORT : grep exhaustif de
  // packages/opencode/src (2026-07-15) — jamais lu nulle part. Gardé pour une
  // éventuelle implémentation upstream future (déclaration inoffensive), mais
  // NE PAS s'y fier comme mécanisme de lock actuel — c'est enabled_providers
  // ci-dessus qui protège, pas ceci.
  experimental: {
    policies: [
      { effect: "deny", action: "provider.use", resource: "*" },
      { effect: "allow", action: "provider.use", resource: "coeos" },
    ],
  },
  // Garde-fous : ask obligatoire sur les gestes destructifs/irréversibles,
  // le reste inchangé (bash allow par défaut).
  permission: {
    bash: {
      "git push --force*": "ask",
      "git push -f*": "ask",
      "rm -rf /*": "deny",
      "rm -rf ~*": "deny",
      "rm -rf *": "ask",
      "git reset --hard*": "ask",
      "git clean -fd*": "ask",
      "launchctl bootout*": "ask",
      "*": "allow",
    },
  },
  provider: {
    coeos: {
      npm: "@ai-sdk/openai-compatible",
      // Nom du fournisseur = en-tête de groupe du picker. Distinct des modèles
      // (sinon "CoeOS" fournisseur + "CoeOS" modèle = doublon visuel).
      // Provider UNIQUE de coeos-code (Sophie 2026-08-03) : expose tout le catalogue
      // publié par l'engine OdyssAI-x. Le provider `ody` de la config user
      // (doublon même-engine) a été retiré dans le même geste.
      name: "OdyssAI-x",
      // baseURL injecté par buildCoeosConfig (engine résolu). Placeholder si non résolu.
      options: { baseURL: "http://127.0.0.1:1/v1", apiKey: "dummy" },
      models: {
        // Odybench (2026-08-28) : CoeOS + le pin grill retirés du picker (plus
        // 100% LIVE (Sophie 2026-08-29) : AUCUN modèle en dur. Le picker = EXACTEMENT
        // /v1/models du moteur (rempli par coeosModelsWithCatalog). Sophie ajoute et
        // retire des modèles en continu -> un pin figé (ex. or:glm-5.2) apparaissait
        // comme un fantôme alors que le moteur ne le sert plus. Map vide = zéro pin.
      },
    },
  },
  // Odybench (Sophie 2026-08-28) : RAG Qdrant RETIRÉ. Un harnais de bench n'a pas
  // besoin du corpus de connaissance (alpha_centauri + obsidian-context, .44:8086)
  // — c'était aussi la seule mémoire COMMUNE avec Nemo. buildCoeosConfig n'ajoute
  // plus que graphify + odybench + docling.
  mcp: {},
  // INVARIANT (2026-07-15, sceptique panel ; AMENDÉ 2026-07-16, ADR 0002) :
  // AUCUN SUBAGENT ci-dessous ne doit JAMAIS recevoir la permission `task`.
  // Un subagent qui peut spawn task peut se re-fan-out (reviewer -> reviewer
  // -> ...) ; c'est bloqué par le défaut d'opencode (task refusé par défaut
  // aux subagents, packages/opencode/src/tool/task.ts childToolDenies), PAS
  // par une garde explicite ici. L'amendement : l'agent PRIMARY `coeos`
  // (l'Orchestrator du mode CoeOS) détient `task` — un seul niveau de spawn,
  // pas de récursion (un subagent qu'il lance ne peut pas re-spawner).
  // L'executor n'est joignable QUE par lui (garde runtime dans TaskTool).
  //
  // Le panel à 3 — trois mandats OPPOSÉS, indépendants. On n'agit qu'à convergence.
  agent: {
    // Odybench pilote des BENCHMARKS, pas du code. Les "modes" (dropdown) = les
    // agents primary. Le CERVEAU des agents = "General model" (Settings > Models) ;
    // buildCoeosConfig ecrase leur `model`. Le modele SOUS TEST est un PARAMETRE
    // (dit en session, ou defaut "Model to bench"), jamais le modele de l'agent.
    // Tous les outils de bench viennent du MCP `odybench` (odybench_*).
    // Built-ins opencode de coding masques (app de bench, pas de code) :
    build: { hidden: true },
    plan: { hidden: true },
    explore: { hidden: true },
    general: { hidden: true },
    ody: {
      mode: "primary",
      description:
        "Ody — assistant Odybench. Benche un modele a la volee (charge -> run -> classe -> adapte -> rapporte) et repond aux questions de bench. Dis-lui quel modele tester.",
      color: "#7ee787",
      permission: { edit: "deny", write: "deny", bash: "deny", webfetch: "deny" },
      tools: { "*": false, "odybench*": true },
      prompt: `Tu es Ody, l'assistant general d'Odybench (un harnais de benchmark de modeles).
Tu benches des modeles SOUS TEST via les outils odybench (run_test, ensure_loaded,
classify, sweep, bench_tests, engine_models, ag_run). Le modele a tester est celui
que l'utilisatrice te DIT (ex. "benche or:glm-5.3-flash sur Bench C") ou le defaut ;
ce n'est PAS ton propre modele.

Regles :
- Verifie qu'un modele est charge (ensure_loaded) avant de le bencher ; le pool tient
  un modele a la fois, donc benche modele par modele.
- Un modele cloud se benche par son id "or:..." (OdyssAI-x le publie), meme endpoint.
- Statuts de run_test : ok / empty / truncated / loop / failed / fatal. Adapte 1x :
  truncated -> +max_tokens ; empty -> thinking off ; loop -> temperature basse.
- Tu ne notes PAS la qualite (c'est @bench-judge) ; tu produis des reponses propres
  et tu rapportes l'etat reel via sweep (jamais ta narration).`,
    },
    campagne: {
      mode: "primary",
      description:
        "Campagne — orchestre un benchmark complet : pour chaque modele sous test, le charge, execute tous les tests des benchs demandes (adaptation 1x), puis rapport mecanique via sweep.",
      color: "#79c0ff",
      permission: { edit: "deny", write: "deny", bash: "deny", webfetch: "deny" },
      tools: { "*": false, "odybench*": true },
      prompt: `Tu es l'agent CAMPAGNE d'Odybench. Tu orchestres l'execution d'un benchmark sur un
ou plusieurs modeles SOUS TEST, sur un ou plusieurs benchs. Tu ne juges pas la
qualite (c'est @bench-judge).

Contrainte moteur : le pool tient UN modele a la fois (charger = swap). Donc modele
par modele : charge UN modele, fais TOUS ses tests, puis passe au suivant.

Pour chaque modele :
1. ensure_loaded. Si loaded=false -> note "non charge", saute ce modele.
2. Pour chaque bench : bench_tests pour la liste, puis pour chaque test run_test.
   ok -> suivant ; truncated -> 1x +max_tokens ; empty -> 1x thinking off ;
   loop -> 1x temperature 0.2 + repetition_penalty 1.05 ; failed/fatal -> pas de retry.
   UNE seule adaptation par test.
3. sweep <bench> <model> = le statut REEL de tous les tests.

Rapport final EXCLUSIVEMENT depuis les sweeps (jamais ta memoire) : par modele x bench,
<ok>/<n> ok, puis la liste "a retraiter" (tests non-ok apres adaptation).`,
    },
    "agentic-bench": {
      mode: "primary",
      description:
        "Agentic Bench — pilote Bench AG (bench agentique a boucle executee, scoring MECANIQUE par assertions, aucun juge LLM). Le modele doit supporter les tool calls.",
      color: "#d2a8ff",
      permission: { edit: "deny", write: "deny", bash: "deny", webfetch: "deny" },
      tools: { "*": false, "odybench*": true },
      prompt: `Tu es l'agent AGENTIC BENCH d'Odybench. Tu pilotes Bench AG : un bench a boucle
EXECUTEE (le harnais joue l'environnement, le modele appelle des tools, le succes se
juge par assertions MECANIQUES sur l'etat final — aucun juge LLM).

Pour chaque modele : ensure_loaded (le modele doit supporter les tools -> engine_models
montre tools=y ; sinon le gate ternaire refusera proprement), puis ag_run. C'est LONG
(jusqu'a 90 instances x reps). Rapporte le resultat depuis la sortie de ag_run (ok,
nombre de taches scorees). Le scoring est mecanique, tu ne notes rien.`,
    },
    "test-unique": {
      mode: "subagent",
      description:
        "Execute UN test d'un modele sous test : charge, run, classe, adapte + relance 1x si vide/tronque/en boucle. Ne juge pas la qualite.",
      color: "#ffa657",
      permission: { edit: "deny", write: "deny", bash: "deny", webfetch: "deny" },
      tools: { "*": false, "odybench*": true },
      prompt: `Tu es l'agent TEST UNIQUE d'Odybench. Tu executes UN test d'UN modele sous test et
tu garantis une reponse propre. Tu ne reformules JAMAIS le prompt du test (seuls des
reglages de protocole : thinking / max_tokens / sampling).

1. ensure_loaded. Si loaded=false -> "modele non charge", stop.
2. run_test. Statut : ok -> fini ; truncated -> 1x +max_tokens ; empty -> 1x thinking
   off ; loop -> 1x temperature 0.2 + repetition_penalty 1.05 ; failed/fatal -> pas de
   retry. UNE seule relance. Rapporte le statut final + la recette utilisee.`,
    },
    "bench-judge": {
      mode: "subagent",
      description:
        "Juge de reference : note des reponses de moteur au protocole TMB (notes-only, aucun total). Modele choisi dans l'editeur d'agent (defaut = modele de session).",
      // Pas de model ici : choisi dans l'editeur d'agent (sinon le config ecraserait
      // l'edition, agent.ts:281). Herite du defaut top-level tant que rien n'est choisi.
      permission: { edit: "allow", bash: "allow" },
      color: "#a371f7",
      prompt: `Tu es le BENCH-JUDGE d'Odybench : le juge de reference du protocole TMB.
On te donne la/les REPONSE(S) d'un moteur a evaluer + la GRILLE (les criteres) du test.

Protocole VERROUILLE (decision Sophie, gelee) — NOTES-ONLY :
1. Tu NOTES critere par critere. Pour CHAQUE critere : points obtenus / max pondere.
   Contrainte dure : points <= max.
2. Tu ne calcules JAMAIS de total, moyenne ou score global — le harnais somme en Python.
3. Tu ne rediges JAMAIS de verdict en prose ("expert", "bon", "a revoir") — un juge qui
   redige est inconstant.
4. Tu juges les FAITS : une violation factuelle est FLAGGEE court, pas argumentee.

Sortie : un JSON par (bench, moteur, test), schema strict :
{"bench": "Bench A", "engine": "<moteur>", "test": "a04", "judge": "bench-judge",
 "criteria": [{"id": "C1", "points": 18, "max": 18}, {"id": "C2", "points": 9, "max": 12}],
 "flags": ["violation factuelle courte si pertinent"]}
- id = l'identifiant du critere TEL QU'ECRIT dans la grille. AUCUN total. flags = [] si rien.

Tu tournes sur un modele CHOISI dans l'editeur d'agent, deliberement DIFFERENT
du modele evalue. Si la grille ou la reponse manque, demande-la ; n'invente jamais un
critere absent de la grille.`,
    },
  },
  command: {
    panel: {
      description:
        "Panel à 3 sur une décision conséquente : direct / alternative / sceptique, on n'agit qu'à convergence",
      template: `Décision à trancher : $ARGUMENTS

Déroule le protocole du panel à 3 de coeos-code :
1. Lance les TROIS subagents en parallèle sur cette décision : @direct, @alternative,
   @sceptique. Chacun reçoit la décision + le contexte pertinent du dépôt.
2. Synthétise leurs trois retours SANS les lisser : options, faits cités, tests
   proposés, signaux d'erreur.
3. VERDICT :
   - Convergence des trois sur des faits vérifiés → énonce l'option retenue, le plus
     petit test qui tranche, et le signe qui dirait qu'on s'est trompé. Puis agis.
   - Pas de consensus → NE TRANCHE PAS. Présente les positions et l'enjeu à
     l'utilisatrice ; c'est elle qui décide.`,
    },
    gate: {
      description:
        "Le gate avant action conséquente : faits / but+critère / ≥2 options / signe d'erreur / plus petit test",
      template: `Action envisagée : $ARGUMENTS

Remplis le gate coeos-code AVANT tout geste. Réponds point par point, ancré sur le dépôt
(cite fichiers:lignes), pas de généralités :
1. FAITS VÉRIFIÉS : qu'est-ce qui est établi (et comment) ? Ce qui n'est pas vérifié
   est marqué "hypothèse".
2. BUT + CRITÈRE DE RÉUSSITE : qu'est-ce qui doit être vrai à la fin, mesurable ?
3. OPTIONS (≥2) : au moins deux chemins réels, avec leur coût.
4. CHOIX + SIGNE D'ERREUR : l'option retenue, et le signal concret qui dirait
   qu'on se trompe (le "cheval mort").
5. PLUS PETIT TEST : le test minimal qui tranche avant d'engager le reste.
Si un point ne peut pas être rempli, dis-le : le gate n'est PAS passé.`,
    },
    goal: {
      description:
        "Mode objectif : itère jusqu'au but atteint (critère mesurable), ne s'arrête qu'au done ou blocage réel",
      template: `OBJECTIF : $ARGUMENTS

Passe en mode GOAL de coeos-code. Protocole strict :
1. CRITÈRE DE DONE : reformule l'objectif en critère MESURABLE et vérifiable
   (build vert, test qui passe, endpoint qui répond, fichier produit...). Si
   l'objectif est trop flou pour un critère, pose UNE question, puis verrouille.
2. BOUCLE : travaille par itérations. À CHAQUE itération : (a) l'action, (b) la
   VÉRIFICATION factuelle du résultat (exécute, ne suppose pas), (c) l'écart restant
   vs le critère de done.
3. PAS D'ARRÊT PRÉMATURÉ : tu ne t'arrêtes que dans DEUX cas — le critère de done
   est ATTEINT ET VÉRIFIÉ, ou un blocage réel exige une décision de l'utilisatrice
   (dépendance externe, choix d'architecture, permission). Un demi-résultat déclaré
   "fait" est un échec.
4. CHEVAL MORT : si tu empiles 2 rustines sur la même approche, stop — change
   d'approche et dis-le.
5. À la fin : bilan une ligne — critère de done, preuve, itérations utilisées.`,
    },
    "grill-me": {
      description:
        "Interview impitoyable du plan (une question à la fois) puis review adversariale cross-modèle par @grill-reviewer (MiniMax)",
      template: `SUJET À GRILLER : $ARGUMENTS

Déroule le protocole GRILL de coeos-code en deux actes.

ACTE 1 — L'INTERVIEW (toi ↔ l'utilisatrice) :
- Interroge-la SANS COMPLAISANCE sur son plan/design : UNE question à la fois,
  la plus discriminante d'abord. Pour chaque question, propose ta réponse
  recommandée (elle peut juste valider). Si le dépôt peut répondre à ta place,
  va lire le code au lieu de demander.
- Continue jusqu'à ce que CHAQUE branche de l'arbre de décision soit résolue :
  périmètre, cas limites, données, erreurs, migrations, sécurité, done criteria.
- Puis rédige le PLAN verrouillé : contexte, décisions actées (avec leurs raisons),
  étapes ordonnées, critères de done, hors-scope.

ACTE 2 — LA REVIEW CROSS-MODÈLE (adversariale) :
- Soumets le plan complet au subagent @grill-reviewer (autre modèle, mandat de
  destruction). Il rend VERDICT: APPROVED ou VERDICT: REVISE + points bloquants.
- REVISE → corrige le plan sur les points fondés (conteste les points non fondés,
  faits à l'appui), re-soumets. Maximum 3 rounds.
- APPROVED (ou cap atteint) → présente le plan final à l'utilisatrice avec le
  verdict et les points de désaccord résiduels. AUCUN code avant son feu vert.`,
    },
    review: {
      description: "Review adversariale du travail de la session courante par @reviewer",
      template: `Passe en revue le travail de cette session.
1. Rassemble le diff complet de la session (fichiers modifiés/créés — utilise
   git diff si le dépôt est propre au départ, sinon la liste des changements).
2. Envoie ce diff + le contexte au subagent @reviewer.
3. Restitue ses trouvailles SANS les adoucir, par gravité, avec fichier:ligne.
4. Pour chaque bloquant/majeur fondé : propose le fix minimal et applique-le si
   l'utilisatrice a déjà donné son feu vert sur ce périmètre ; sinon demande.
Cible optionnelle si précisée : $ARGUMENTS`,
    },
    debug: {
      description: "Débogage evidence-first par @debugger : reproduire, isoler, prouver, fixer",
      template: `Symptôme à déboguer : $ARGUMENTS

Délègue au subagent @debugger avec le protocole evidence-first (reproduire →
isoler → prouver la racine avec fichiers:lignes → fix minimal → re-vérifier).
Restitue : la preuve de la racine, le fix, la vérification. Si la reproduction
est impossible, dis-le et liste ce qui manque — n'invente JAMAIS un diagnostic.`,
    },
    judge: {
      description: "Note des réponses de moteur au protocole TMB (notes-only) via @bench-judge",
      template: `À évaluer au protocole TMB : $ARGUMENTS

Délègue au subagent @bench-judge. Fournis-lui la/les réponse(s) du moteur + la
grille des critères. Il rend des NOTES-ONLY : points/max par critère (points <=
max), AUCUN total, AUCUN verdict en prose, flags factuels courts. Un JSON par
(bench, moteur, test). S'il manque la grille ou la réponse, il la demande — il
n'invente pas de critère.`,
    },
    verify: {
      description: "Vérification factuelle : build, typecheck, tests — rapport brut, aucun geste",
      template: `Vérifie l'état réel du projet, dans cet ordre et SANS rien corriger :
1. Détecte l'outillage (package.json scripts, Makefile, pyproject, cargo...).
2. Exécute ce qui existe parmi : typecheck, lint, build, tests.
3. RAPPORT FACTUEL : commande exacte → exit code → dernières lignes utiles.
   Aucun geste correctif, aucun "ça devrait passer" — que du constaté.
4. Termine par le verdict binaire : VERT (tout passe) ou ROUGE (liste des échecs).
Périmètre optionnel : $ARGUMENTS`,
    },
    onboard: {
      description: "Génère AGENTS.md du projet : structure, conventions, commandes, pièges",
      template: `Génère (ou mets à jour) le fichier AGENTS.md à la racine de CE projet.
Explore d'abord VRAIMENT le dépôt (arborescence, package/build files, README,
configs, 2-3 fichiers de code représentatifs). Si les outils rag_search ou
graphify_explain sont disponibles, interroge-les sur ce projet.
Contenu (dense, factuel, PAS de blabla) :
# <nom du projet>
## Ce que c'est — 2 phrases max
## Structure — les dossiers qui comptent et leur rôle
## Commandes — build/test/run VÉRIFIÉES (exécute-les pour confirmer)
## Conventions — style, nommage, patterns observés dans le code réel
## Pièges — gotchas découverts (configs dupliquées, ordres d'init, etc.)
Écris le fichier. Il est lu automatiquement par coeos-code à chaque session.`,
    },
    fable: {
      description:
        "Méthode Fable : dérouler les 5 gates (scope/évidence/adversarial/vérif/report) sur une tâche à couches",
      template: `Applique la MÉTHODE FABLE à : $ARGUMENTS

Discipline pour toute tâche où la première idée peut être fausse (multi-étapes,
inconnues, débogage, recherche à vérifier). Ce n'est PAS un workflow qui produit
des fichiers — c'est la façon d'exécuter la tâche. Trivial (1 fichier, lookup) →
saute les gates, fais le travail. Sinon, 5 gates DANS L'ORDRE, chacun passe avant
le suivant ; si ça bloque ou qu'un résultat surprend, nomme le gate courant et re-run.

GATE 1 — SCOPE AVANT DE TRAVAILLER
- "Fini" en 1-2 phrases : quel artefact existe à la fin, ce qui doit être vrai de
  lui, et COMMENT tu le vérifieras. Pas de test écrivable = tâche pas comprise.
- Lire les règles debout d'abord (RULES, mémoire projet) — ne pas réinventer.
- Séparer connu / supposé. Nommer les 1-3 inconnues load-bearing (si fausses, la
  forme de la solution change).
- Ambiguïté qui change ce que tu construirais → 1 question sur le plus gros trou.
  Sinon défaut raisonnable annoncé en 1 ligne, et on avance.

GATE 2 — ÉVIDENCE AVANT RAISONNEMENT
- Jamais concevoir de mémoire de ce qu'un fichier/API/dataset "ressemble
  probablement". L'ouvrir. La mémoire d'entraînement = générateur d'hypothèses.
- Attaquer les inconnues load-bearing d'abord, avec la sonde la moins chère.
- Passe fine bout-en-bout (un item dans tout le pipeline, vérifié) avant de scaler.
- Plan vivant si ≥3 étapes, tranché par dépendance (sortie N → entrée N+1). Hypothèse,
  pas contrat.

GATE 3 — RAISONNER ADVERSARIALEMENT
- Avant de committer une réponse, changer de rôle et essayer de la TUER : quel
  input/état/lecture la rend fausse ? Tester le cas, ne pas l'imaginer.
- Puis steelman ce qui survit. Steelman aussi l'existant avant de le changer
  (nommer la raison plausible de sa forme actuelle).
- En review : ne rien trouver est un résultat valide ; ne jamais fabriquer un défaut.
- Re-décider après CHAQUE résultat : confirme le plan ou le change ? Le piège =
  l'élan (dérouler l'étape 4 d'un plan que l'étape 2 a déjà invalidé).
- 2 tentatives ratées du même fix = le diagnostic est faux. Trouver l'hypothèse
  sous les deux, la tester directement.

GATE 4 — VÉRIFIER AVANT DE DÉCLARER FINI
- "Ça a tourné" n'est pas une vérif. Vérifier au NIVEAU DE LA CLAIM : output
  correct → regarder l'output ; page rend → regarder la page. Exit 0 ne prouve que
  la couche du dessous.
- Preuve que tu n'as pas générée : rouvrir le fichier écrit, ré-exécuter, diff
  avant/après, compter ce que tu as dit compter.
- Échantillonner les bords : 1er, dernier, plus bizarre — pas juste le milieu.
- Bonne nouvelle = suspecte : un sweep tout-propre est cassé jusqu'à ce que tu
  expliques pourquoi le résultat est réel.
- Re-check contre la demande d'origine ET les règles chargées au Gate 1.

GATE 5 — REPORTER CALIBRÉ
- Réponse d'abord, support ensuite.
- Séparer vérifié / supposé à voix haute ("confirmé X en lançant Y ; je suppose Z,
  pas pu vérifier").
- Citer les preuves avec précision : chemins, lignes, la commande, le nombre vu.
- Rapporter l'observé, pas l'intention. Tests ratés → le dire avec la sortie.
- Ne jamais adoucir un vrai problème ; le signaler une fois, concret, puis
  respecter la décision de l'utilisatrice.

Outils que la méthode va chercher : \`/gate\` (G1), \`/panel\` (G3), \`/verify\` (G4),
\`/debug\` (débogage sous G2-G4). Ne pas forcer les 5 gates sur du trivial.`,
    },
    "session-doc": {
      description: "Doc de fin de session : Done / Difficulties / To-do, points Fibonacci",
      template: `Rédige le document de session pour le travail effectué dans cette
conversation, format OdyssAI :
## Done — N points
- [pts] réalisations, avec fichiers/commits
## Difficulties
- les murs rencontrés, les fausses pistes, les leçons
## To do — N points
1. [pts] prochaines étapes ordonnées
## Metrics
- totaux, commits, décisions
Points en Fibonacci (1,2,3,5,8,13,21), jamais d'estimation en temps. Français,
technique, direct. Cite les quotes importantes de l'utilisatrice verbatim.`,
    },
  },
}

// Routage par compétence (Sophie 2026-07-15) : chaque agent coeos-code pointe le
// modèle que la console superagent (:4800) affecte à SON rôle — la MÊME
// donnée (score-table + paires de compétences) que le superagent headless,
// PAS un pipeline importé (jamais de grill×2 : cf. panel sceptique du
// 2026-07-15, "grill-reviewer→pipeline appelable comme modèle" est le mode
// d'échec identifié). Un agent coeos-code = un modèle-feuille, jamais un pipeline.
//
// Clé agent (COEOS_DEFAULT_CONFIG.agent) -> son entrée dans le manifeste
// coeos-roles.json / la sortie de compose (coeos-agents.json). grill-reviewer
// est délibérément ABSENT : cross-modèle par design, jamais composé.
const ROLE_MANIFEST_KEY: Record<string, string> = {
  reviewer: "codeos-reviewer",
  debugger: "codeos-debugger",
  explore: "codeos-explore",
  direct: "codeos-panel-direct",
  alternative: "codeos-panel-alternative",
  sceptique: "codeos-panel-sceptique",
  // Mode CoeOS (v2, WU3) — entrées agents + clés ajoutées dans le MÊME commit
  // que les rôles du manifeste CoeOS (b8e7705) : applyRoleAssignment droppe
  // silencieusement un rôle résolu sans entrée agent (`if (!current) continue`).
  coeos: "codeos-orchestrator",
  executor: "codeos-executor",
  // Hôte du grill MCP (2026-07-23) : même affectation que l'orchestrateur
  // (plan_judgment+reasoning) — il ne fait que dispatcher et synthétiser.
  // Ainsi RIEN dans la chaîne grill_review ne dépend du modèle virtuel CoeOS
  // (grill-reviewer = MiniMax pinné, sceptique = codeos-panel-sceptique).
  "grill-host": "codeos-orchestrator",
  // Modes visibles (plan/build) : PAS routés par la console (2026-08-03).
  // L'affectation de leur modèle vit côté coeos-code (Settings > Models, picker
  // sur /v1/models), injectée dans buildCoeosConfig — rien n'est ajouté à CoeOS.
}

const ROLE_FETCH_TIMEOUT_MS = 1500 // budget TOTAL (state + models), jamais par-fetch

function consoleUrl(engine: ResolvedEngine, path: string): string {
  const u = new URL(engine.baseUrl)
  u.port = "4800"
  u.pathname = path
  return u.toString()
}

// odyssai/or:nemotron-3-super -> or:nemotron-3-super (namespace OMP retiré ;
// l'id nu est ce que /v1/models et le provider coeos attendent).
function bareModelId(prefixed: string): string {
  const i = prefixed.indexOf("/")
  return i === -1 ? prefixed : prefixed.slice(i + 1)
}

/** Sortie de la résolution des rôles : le modèle par agent (patché dans le
 * config) + le hint d'axe par agent (options du plugin codeos-axis, émis en
 * x-coeos-axis à chaque requête — uniquement pour les rôles routés par le
 * modèle virtuel CoeOS). */
export type RoleAssignment = {
  models: Record<string, string>
  axes: Record<string, string>
}

/** Interroge la console de l'hôte apparié, valide chaque pick contre les
 * modèles réellement servables, retourne {models: {agentKey: "coeos/<id nu>"},
 * axes: {agentKey: "<axe>"}} (axes seulement quand le pick est le routeur).
 * Timeout/erreur/console injoignable/reponse vide -> null (JAMAIS de crash,
 * jamais de blocage du lancement au-delà du budget — même contrat que
 * resolveEngine dans coeos-pairing.ts). */
export async function fetchRoleAssignment(engine: ResolvedEngine): Promise<RoleAssignment | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ROLE_FETCH_TIMEOUT_MS)
  try {
    const stateRes = await fetch(consoleUrl(engine, "/api/state"), { signal: ctrl.signal })
    if (!stateRes.ok) return null
    const state = (await stateRes.json()) as {
      assignment?: Record<string, { model?: string; axis?: string }>
      router?: string
    }
    const assignment = state.assignment
    if (!assignment) return null

    const modelsRes = await fetch(`${engine.baseUrl}/v1/models`, { signal: ctrl.signal })
    const modelsData = modelsRes.ok ? ((await modelsRes.json()) as { data?: Array<{ id?: string }> }) : { data: [] }
    const servable = new Set((modelsData.data ?? []).map((m) => m.id).filter((id): id is string => !!id))

    const resolved: RoleAssignment = { models: {}, axes: {} }
    for (const [agentKey, manifestKey] of Object.entries(ROLE_MANIFEST_KEY)) {
      const pick = assignment[manifestKey]?.model
      if (!pick) continue
      const bare = bareModelId(pick)
      if (!servable.has(bare)) continue // affecté mais pas (ou plus) servi -> on ignore, pas de crash
      resolved.models[agentKey] = `coeos/${bare}`
      const axis = assignment[manifestKey]?.axis
      // le hint n'a de sens que sur le routeur (id publié par /api/state)
      if (axis && state.router && bare === state.router) resolved.axes[agentKey] = axis
    }
    return Object.keys(resolved.models).length ? resolved : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function loadPersistedRoleAssignment(): RoleAssignment | null {
  const v = getStore().get(ROLE_ASSIGNMENT_KEY) as Record<string, unknown> | undefined
  if (!v || !Object.keys(v).length) return null
  // migration : l'ancien format persisté était un plat {agentKey: "coeos/<id>"}
  if (typeof Object.values(v)[0] === "string") {
    return { models: v as Record<string, string>, axes: {} }
  }
  const composite = v as unknown as RoleAssignment
  return composite.models && Object.keys(composite.models).length ? composite : null
}

/** Chaîne de repli : console fraîche -> dernier mapping persisté REVALIDÉ
 * contre /v1/models -> défauts de COEOS_DEFAULT_CONFIG.agent (inchangés,
 * aucune régression). Un succès console est persisté pour servir de repli la
 * prochaine fois qu'elle est injoignable. La revalidation (v2 WU3, round 1
 * finding 12) : un mapping persisté peut pointer des modèles déchargés depuis
 * — console down n'implique pas engine down (ports distincts), donc on
 * filtre les picks morts au lieu de les servir en aveugle ; engine muet ->
 * mapping persisté tel quel (le provider coeos gérera l'erreur à l'usage). */
async function resolveRoleAssignment(engine: ResolvedEngine | null | undefined): Promise<RoleAssignment | null> {
  if (!engine) return null
  const fresh = await fetchRoleAssignment(engine)
  if (fresh) {
    getStore().set(ROLE_ASSIGNMENT_KEY, fresh)
    return fresh
  }
  const persisted = loadPersistedRoleAssignment()
  if (!persisted) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ROLE_FETCH_TIMEOUT_MS)
    const res = await fetch(`${engine.baseUrl}/v1/models`, { signal: ctrl.signal }).finally(() =>
      clearTimeout(timer),
    )
    if (!res.ok) return persisted
    const data = (await res.json()) as { data?: Array<{ id?: string }> }
    const servable = new Set((data.data ?? []).map((m) => m.id).filter((id): id is string => !!id))
    const models = Object.fromEntries(
      Object.entries(persisted.models).filter(([, id]) => servable.has(bareModelId(id))),
    )
    if (!Object.keys(models).length) return null
    return { models, axes: persisted.axes }
  } catch {
    return persisted
  }
}

export function applyRoleAssignment(agent: typeof COEOS_DEFAULT_CONFIG.agent, resolved: RoleAssignment | null) {
  if (!resolved) return agent
  // Les entrées d'agent ne sont pas uniformes (les built-ins masqués ne portent
  // que `hidden`, sans `model`) : TS unifie mal une assignation indexée générique
  // sur ce type hétérogène. On mute via un type large (`model` optionnel), puis on
  // reaffirme la forme d'origine au retour — correct à l'exécution, le souci n'était
  // que l'inférence statique de l'assignation intermédiaire.
  const patched: Record<string, { model?: string; [key: string]: unknown }> = { ...agent }
  for (const [agentKey, modelId] of Object.entries(resolved.models)) {
    const current = patched[agentKey]
    if (!current) continue // agent inconnu du config de base -> ignore, jamais d'ajout silencieux
    patched[agentKey] = { ...current, model: modelId }
  }
  return patched as typeof agent
}

/** Ids nus réellement servis par l'engine (/v1/models). Budget borné (partagé
 * avec la résolution des rôles), jamais bloquant au-delà ; toute erreur -> []
 * (le provider garde alors ses seuls modèles curatés). Double emploi : (1)
 * alimenter le picker Settings > Models via provider.coeos.models ; (2) valider
 * le choix plan/build AVANT de l'appliquer — un pick sur un modèle déchargé
 * serait rejeté « Model not found » (même piège que MI:Minimax3, 2026-08-02). */
// Budget PROPRE au catalogue (≠ résolution des rôles) : c'est une lecture au
// boot, awaitée avant le démarrage du serveur, et un LAN froid dépasse souvent
// 1.5s — d'où le collapse « 2 modèles » du 2026-08-03. 5s au pire, une seule
// fois ; le repli persistant (MODEL_CATALOG_KEY) couvre les flakes suivants.
const MODEL_FETCH_TIMEOUT_MS = 5000

/** Un modèle servi par l'engine, avec sa métadonnée utile : fenêtre de contexte
 * et support des tools (exposés par /v1/models dans x_odyssai). SANS ça,
 * opencode met limit.context=0 (provider.ts:1469) et n'élague JAMAIS -> overflow
 * "maximum context length" (bug 2026-08-07). */
export type ServableModel = { id: string; context?: number; output?: number; tools?: boolean }

/** GET JSON via curl (process enfant), PAS via le fetch de Node/Electron.
 * Découvert 2026-08-07 : sur un Mac multi-homé (deux interfaces actives sur le
 * MÊME sous-réseau — en0 + en11 chez Sophie), la pile réseau de Node/Electron
 * tombe en EHOSTUNREACH vers l'engine LAN (.39) — même bindée explicitement sur
 * une interface qui marche — alors que curl (et le sidecar bun) routent
 * correctement. curl est toujours présent sur macOS ; coeos-code est macOS-only.
 * Utilisé aussi bien côté Electron-main (buildCoeosConfig) que côté bun
 * (codeos-server.sh) : curl marche dans les deux. */
function curlJson(url: string, budgetMs: number, apiKey?: string): Promise<unknown | null> {
  return new Promise((resolve) => {
    const args = ["-sS", "-m", String(Math.max(1, Math.ceil(budgetMs / 1000))), "-H", "Accept: application/json"]
    if (apiKey && apiKey !== "dummy") args.push("-H", `Authorization: Bearer ${apiKey}`)
    args.push(url)
    execFile("/usr/bin/curl", args, { timeout: budgetMs + 1000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve(null)
      try {
        resolve(JSON.parse(stdout))
      } catch {
        resolve(null)
      }
    })
  })
}

export async function fetchServableModels(
  engine: ResolvedEngine | null | undefined,
  budgetMs = MODEL_FETCH_TIMEOUT_MS,
): Promise<ServableModel[]> {
  if (!engine) return []
  const data = (await curlJson(`${engine.baseUrl}/v1/models`, budgetMs, engine.apiKey)) as {
    data?: Array<{
      id?: string
      x_odyssai?: { context_length?: number; max_output_tokens?: number; supports_tools?: boolean }
    }>
  } | null
  if (!data) return []
  try {
    return (data.data ?? [])
      .filter((m): m is { id: string; x_odyssai?: NonNullable<(typeof m)["x_odyssai"]> } => !!m.id)
      .map((m) => {
        const xo = m.x_odyssai ?? {}
        return {
          id: m.id,
          context: typeof xo.context_length === "number" && xo.context_length > 0 ? xo.context_length : undefined,
          output: typeof xo.max_output_tokens === "number" && xo.max_output_tokens > 0 ? xo.max_output_tokens : undefined,
          tools: typeof xo.supports_tools === "boolean" ? xo.supports_tools : undefined,
        }
      })
  } catch {
    return []
  }
}

// Fenêtre par défaut quand l'engine n'en déclare pas (routeur CoeOS : ctx=None).
// 128k = plancher défendable qui fait élaguer opencode avant les backends
// courants ; pour du très long contexte, adresser un modèle précis (Kimi K3=1M).
const DEFAULT_CONTEXT_TOKENS = 128_000
const MAX_OUTPUT_TOKENS = 32_000

function limitFor(m: ServableModel): { context: number; output: number } {
  const context = m.context && m.context > 0 ? m.context : DEFAULT_CONTEXT_TOKENS
  const output =
    m.output && m.output > 0
      ? Math.min(MAX_OUTPUT_TOKENS, m.output)
      : Math.min(MAX_OUTPUT_TOKENS, Math.max(4_096, Math.floor(context / 4)))
  return { context, output }
}

// Noms d'affichage soignés pour les têtes d'affiche ; le reste tombe sur l'id
// nettoyé de son préfixe de namespace (voir prettyModelName).
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  CoeOS: "CoeOS",
  "MI:Minimax3": "MiniMax 3 (grill)",
  "MI:Minimax2.7": "MiniMax 2.7",
  "MI:MiniMax-M2.7-highspeed": "MiniMax 2.7 (highspeed)",
  "or:kimi-k3": "Kimi K3",
  "or:kimi-k2.6": "Kimi K2.6",
  "or03:kimi-k-2.7-code": "Kimi K2.7 Code",
  "or02:glm-5.2": "GLM 5.2",
  "or:glm-5.1": "GLM 5.1",
  "or14:qwen3.7-plus": "Qwen 3.7 Plus",
  "or:deepseek-v4-pro": "DeepSeek V4 Pro",
  "or07:deepseekv4-flash": "DeepSeek V4 Flash",
  "or12:mimo-v2.5-pro": "Mimo 2.5 Pro",
  "or:mimo-v2.5-pro": "Mimo 2.5 Pro",
  "or05:nemotron": "Nemotron 3 Super",
  "or:minimax-m2.7": "MiniMax 2.7",
  "or:opus-4.8": "Opus 4.8",
  "or:opus5": "Opus 5",
  "or:o3": "o3",
  "or:Fable5": "Fable 5",
}

/** id -> nom d'affichage. Mapping soigné pour les têtes d'affiche, sinon on
 * retire le préfixe de namespace (« or02: », « MI: », « tele-fast: ») pour
 * rendre l'id lisible et cherchable dans le picker (Issue 2, 2026-08-07). */
function prettyModelName(id: string): string {
  const nice = MODEL_DISPLAY_NAMES[id]
  if (nice) return nice
  // Retire le préfixe de namespace, séparé par ":" (ids LAN, ex. or02:glm-5.2)
  // OU "/" (ids cloud api.coeos.io, ex. moonshotai/kimi-k3) -> dernier segment.
  const seg = id.split(/[:/]/).filter(Boolean).pop()
  return seg || id
}

// Odybench (2026-08-28) : le routeur CoeOS n'est PAS un « modèle à bencher » — on le
// masque du picker même si l'engine le sert (Sophie : « enlever coeos »). On benche
// des modèles, pas le méta-routeur. Filtre appliqué au catalogue live.
function isBenchableModel(id: string): boolean {
  return !/^coeos(\b|[\s_-])/i.test(id)
}

/** Catalogue du provider unique OdyssAI-x, ENRICHI (2026-08-07) : nom soigné +
 * vraie fenêtre de contexte (limit) + capacité tools, depuis /v1/models. Le pin
 * du défaut froid (juge) reste toujours présent. Le routeur CoeOS est filtré
 * (isBenchableModel). Fonction PURE (sans electron) : partagée par buildCoeosConfig
 * (sidecar app) et scripts/codeos-server.sh (serveur LAN). */
export function coeosModelsWithCatalog(
  models: ServableModel[],
): Record<string, { name: string; limit: { context: number; output: number }; tool_call?: boolean }> {
  const out: Record<string, { name: string; limit: { context: number; output: number }; tool_call?: boolean }> = {}
  // Pin du défaut froid (juge/cerveau) toujours présent, même si le fetch échoue.
  for (const id of Object.keys(COEOS_DEFAULT_CONFIG.provider.coeos.models)) {
    if (!isBenchableModel(id)) continue
    out[id] = { name: prettyModelName(id), limit: limitFor({ id }) }
  }
  // Servable : écrase avec la vraie fenêtre + tools. tool_call n'est posé qu'en
  // false (défaut opencode = true, provider.ts:1212) pour ne pas couper les tools.
  for (const m of models) {
    if (!isBenchableModel(m.id)) continue
    out[m.id] = {
      name: prettyModelName(m.id),
      limit: limitFor(m),
      ...(m.tools === false ? { tool_call: false } : {}),
    }
  }
  return out
}

// Agents pilotes de bench : leur CERVEAU = "General model" (Settings). Le modèle
// SOUS TEST n'est PAS leur model — c'est un paramètre de leurs outils odybench.
const BENCH_DRIVERS = ["ody", "campagne", "agentic-bench", "test-unique"] as const

/** Odybench (2026-08-28) : le MODÈLE de chaque agent se choisit dans l'ÉDITEUR
 * d'agent (picker → markdown persisté). buildCoeosConfig ne fixe donc PLUS
 * `agent.model` — sinon la config ÉCRASERAIT l'édition (agent.ts:281 : le model du
 * config prime sur le markdown). Tous les agents héritent du défaut top-level
 * (`coeos/or:glm-5.2`) tant que l'utilisatrice n'a rien choisi.
 * Seul réglage restant ici : "Model to bench" (PLAN_MODEL_KEY) = le modèle SOUS TEST
 * par défaut, injecté dans le PROMPT des pilotes (ce n'est PAS le model de l'agent). */
function applyModelSelection(agent: typeof COEOS_DEFAULT_CONFIG.agent, servable: Set<string>) {
  const patched: Record<string, { model?: string; prompt?: string; [key: string]: unknown }> = { ...agent }
  const raw = getStore().get(PLAN_MODEL_KEY)
  const benchId = typeof raw === "string" && raw && servable.has(bareModelId(raw)) ? raw : ""
  if (benchId) {
    const note =
      `\n\nModele SOUS TEST par defaut (Settings > Model to bench) : ${benchId}. ` +
      `Benche-le si l'utilisatrice n'en precise pas d'autre en session.`
    for (const k of BENCH_DRIVERS) {
      const cur = patched[k]
      if (cur && typeof cur.prompt === "string") patched[k] = { ...cur, prompt: cur.prompt + note }
    }
  }
  return patched as typeof agent
}

// Provider Minimax DIRECT (Sophie 2026-08-28) : api.minimax.io, clé lue AU RUNTIME
// depuis ~/.odybench/minimax.key (0600, HORS repo — jamais en dur ni commité).
// Fichier absent -> provider omis (pas de crash). Indépendant du moteur OdyssAI-x :
// service cloud distinct, ne prend pas le slot du pool local nautilus.
// Repli SEULEMENT si le fetch live flanche (blip réseau) — jamais la source en usage
// normal (Sophie : « ca ne PEUT PAS etre hard codé »).
const MINIMAX_FALLBACK = ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2"]
async function buildMinimaxProvider(): Promise<Record<string, unknown>> {
  let apiKey = ""
  try {
    apiKey = readFileSync(join(homedir(), ".odybench", "minimax.key"), "utf8").trim()
  } catch {
    // clé absente -> pas de provider minimax (dégradé silencieux, comme l'engine)
  }
  if (!apiKey) return {}
  // LIVE : on scanne api.minimax.io/v1/models (comme /v1/models du moteur). Repli sur
  // MINIMAX_FALLBACK uniquement si le fetch échoue, pour ne pas vider le provider.
  let ids: string[] = MINIMAX_FALLBACK
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch("https://api.minimax.io/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t))
    if (res.ok) {
      const data = (await res.json()) as { data?: Array<{ id?: string; name?: string }>; models?: Array<{ id?: string; name?: string }> }
      const live = (data.data ?? data.models ?? [])
        .map((m) => m.id ?? m.name)
        .filter((x): x is string => typeof x === "string" && x.length > 0)
      if (live.length) ids = live
    }
  } catch {
    // repli MINIMAX_FALLBACK
  }
  return {
    minimax: {
      npm: "@ai-sdk/openai-compatible",
      name: "MiniMax (direct)",
      options: { baseURL: "https://api.minimax.io/v1", apiKey },
      models: Object.fromEntries(
        ids.map((id) => [id, { name: id.replace(/^MiniMax-/, "MiniMax "), limit: { context: 200000, output: 16384 } }]),
      ),
    },
  }
}

// Config final assemblé au démarrage : base + plugin session-doc + MCP contexte
// (graphify local stdio, docling remote sur .44:8087). Les chemins d'assets sont
// matérialisés par ensureCodeosAssets() (voir coeos-assets.ts). ASYNC depuis
// 2026-07-15 (interroge la console superagent, budget 1.5s, jamais bloquant
// au-delà) — voir resolveRoleAssignment.
export async function buildCoeosConfig(assets: CodeosAssets, engine?: ResolvedEngine | null) {
  // engine résolu au démarrage (coeos-pairing.ts). Absent -> provider dégradé
  // (placeholder inatteignable + warn côté index.ts), jamais de crash ni de hardcode.
  // Catalogue live avec REPLI PERSISTANT (fix 2026-08-03). Le fetch au boot peut
  // flancher (LAN froid) -> avant, le provider retombait sur les 2 curatés
  // (bug « il y a juste minimax »). Désormais : succès -> peuple + persiste ;
  // échec -> ressert le dernier catalogue connu (MODEL_CATALOG_KEY). engine
  // absent -> [] (provider dégradé, curatés seuls). Même pattern que les rôles.
  let servable: ServableModel[] = []
  if (engine) {
    servable = await fetchServableModels(engine)
    if (servable.length) {
      getStore().set(MODEL_CATALOG_KEY, servable)
    } else {
      const cached = getStore().get(MODEL_CATALOG_KEY)
      if (Array.isArray(cached)) {
        // Repli tolérant : ancien cache (string[], 0.5.7) ET nouveau (ServableModel[]).
        servable = cached
          .map((x): ServableModel | null =>
            typeof x === "string" ? { id: x } : x && typeof x.id === "string" ? (x as ServableModel) : null,
          )
          .filter((x): x is ServableModel => !!x)
      }
    }
  }
  const servableIds = new Set(servable.map((m) => m.id))
  const provider = {
    ...(engine
      ? {
          ...COEOS_DEFAULT_CONFIG.provider,
          coeos: {
            ...COEOS_DEFAULT_CONFIG.provider.coeos,
            models: coeosModelsWithCatalog(servable),
            options: { baseURL: `${engine.baseUrl}/v1`, apiKey: engine.apiKey },
          },
        }
      : COEOS_DEFAULT_CONFIG.provider),
    // Minimax direct (indépendant du moteur : présent même si l'engine ne résout pas)
    ...(await buildMinimaxProvider()),
  }
  // Défaut LIVE (Sophie 2026-08-29) : aucun nom en dur. On prend un modèle CLOUD
  // (or:…) RÉELLEMENT servi (ne prend pas le slot du pool local) ; à défaut le 1er
  // servable benchable. Fetch KO -> dernier recours = défaut config. Un agent sans
  // model choisi dans l'éditeur hérite de ça.
  const defaultServed =
    servable.find((m) => m.id.startsWith("or:") && isBenchableModel(m.id)) ??
    servable.find((m) => isBenchableModel(m.id))
  const defaultModel = defaultServed ? `coeos/${defaultServed.id}` : COEOS_DEFAULT_CONFIG.model
  const resolvedRoles = await resolveRoleAssignment(engine)
  return {
    ...COEOS_DEFAULT_CONFIG,
    model: defaultModel,
    provider,
    agent: applyModelSelection(applyRoleAssignment(COEOS_DEFAULT_CONFIG.agent, resolvedRoles), servableIds),
    // Règles globales (fichier matérialisé — le schéma v1 ignore le texte inline)
    // + mémoire persistante par projet (écrite par le plugin session-doc,
    // chargée automatiquement quand elle existe — absente = silencieux).
    instructions: [assets.rulesPath, ".odybench/MEMORY.md"],
    // Le plugin génère docs+mémoire via l'engine RÉSOLU (pas de hardcode) ;
    // baseURL absent -> plugin inerte.
    plugin: [
      [
        assets.sessionDocPluginUrl,
        {
          minMessages: 6,
          minNewMessages: 4,
          baseURL: engine ? `${engine.baseUrl}/v1` : "",
          apiKey: engine?.apiKey ?? "dummy",
          // Mémoire projet DÉDIÉE Odybench (write=read=.odybench/), plus le .codeos
          // partagé avec l'ancien CoeOS. Doc-gen sur un modèle réel (pas le routeur).
          memoryFile: ".odybench/MEMORY.md",
          model: "or:glm-5.3-flash",
        },
      ],
      // La procédure en CODE, pas en prompt (2026-07-15) : triage + planchers
      // + review forcé. Inerte si engine absent (baseURL vide -> plugin
      // no-op), même contrat que le plugin session-doc ci-dessus.
      [
        assets.sequencerPluginUrl,
        {
          baseURL: engine ? `${engine.baseUrl}/v1` : "",
          apiKey: engine?.apiKey ?? "dummy",
        },
      ],
      // Hint d'axe CoeOS par agent (étape 6) : x-coeos-axis à chaque requête
      // des rôles routés par le modèle virtuel. Mapping vide -> inerte.
      [
        assets.axisPluginUrl,
        {
          axes: resolvedRoles?.axes ?? {},
        },
      ],
    ],
    mcp: {
      ...COEOS_DEFAULT_CONFIG.mcp, // vide désormais (RAG retiré) — spread neutre
      graphify: {
        type: "local",
        // chemin python absolu : pas de dépendance au PATH d'une app GUI
        command: ["/usr/bin/python3", assets.graphifyMcpPath],
        environment: {
          GRAPHIFY_GRAPH: join(homedir(), ".graphify", "stack", "graph.json"),
          GRAPHIFY_BIN: join(homedir(), ".local", "bin", "graphify"),
        },
        enabled: true,
        timeout: 120000, // le graph 18MB est rechargé à chaque appel
      },
      odybench: {
        type: "local",
        // Seam Odybench : primitives de bench (run_test, ensure_loaded, sweep,
        // ag_run…) exposees aux agents. MCP plutot qu'un tool custom : un tool
        // .ts/plugin exige zod resolu au chargement, indisponible pour un asset
        // materialise dans l'app packagee ; MCP = JSON-schema, chargement fiable.
        command: ["/usr/bin/python3", assets.odybenchMcpPath],
        environment: {
          ODYBENCH_API_URL: process.env.ODYBENCH_API_URL ?? "http://localhost:4710",
        },
        enabled: true,
        timeout: 1800000, // ag_run + campagnes peuvent etre longs
      },
      docling: {
        type: "remote",
        url: process.env.CODEOS_MCP_URL ?? "http://localhost:8087/mcp",
        enabled: true,
        timeout: 300000, // parse de PDF lourds
      },
    },
  }
}
