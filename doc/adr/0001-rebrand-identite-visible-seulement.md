# Rebrand coeos-code : identité visible seulement, internals opencode conservés

coeos-code est un fork de sst/opencode qui continue de tirer l'upstream (remote
`upstream`, merges réguliers). 2 498 fichiers mentionnent « opencode » ; un
rename profond (env vars, dossiers `.opencode/`, noms de packages, protocole)
rendrait chaque merge upstream conflictuel. Décision (grill 2026-07-16) : le
rebrand couvre UNIQUEMENT l'identité visible — nom d'app, icônes, About,
titres de fenêtre, strings UI, README, dmg. Les identifiants internes
(`OPENCODE_*`, `.opencode/`, packages `@opencode-ai/*`) restent inchangés.

**Considered options** : rename total (coupe l'upstream définitivement) ;
identité + alias config utilisateur (`.codeos/`, `CODEOS_*` — friction moyenne).
Rejetés tant que les merges upstream restent souhaités.

**Conséquence non évidente** : un futur lecteur verra une app « coeos-code » dont
les chemins de config s'appellent `.opencode/` — c'est délibéré, ne pas
« corriger ».
