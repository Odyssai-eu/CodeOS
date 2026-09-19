export const SETTINGS_STORE = "opencode.settings"
export const DEFAULT_SERVER_URL_KEY = "defaultServerUrl"
export const WSL_SERVERS_KEY = "wslServers"
export const PINCH_ZOOM_ENABLED_KEY = "pinchZoomEnabled"
export const WINDOW_IDS_KEY = "windowIds"
// coeos-code — pairing engine (découverte LAN / provisionné, zéro hardcode)
export const ENGINE_URL_KEY = "coeos.engineUrl"
export const ENGINE_TOKEN_KEY = "coeos.engineToken"
export const ENGINE_CLIENT_ID_KEY = "coeos.clientId"
// coeos-code — dernier mapping agent->modele reussi depuis la console superagent
// (:4800/api/state), pour repli si la console est injoignable au boot.
export const ROLE_ASSIGNMENT_KEY = "coeos.roleAssignment"
// coeos-code — mode YOLO : accepte toutes les permissions sans demander (full-full,
// choix informé de l'utilisatrice, Settings > General). Lu au spawn du serveur
// pour poser OPENCODE_YOLO ; s'applique au prochain lancement (restart-to-apply).
export const YOLO_KEY = "coeos.yolo"
// coeos-code — modèle choisi pour les modes Plan et Build (Settings > Models).
// Id nu (ex. "or:glm-5.2"), lu par buildCoeosConfig pour piloter agent.plan/build.
// Vide/absent = défaut CoeOS. Rien ajouté à CoeOS : l'affectation vit ici.
export const PLAN_MODEL_KEY = "coeos.planModel"
export const BUILD_MODEL_KEY = "coeos.buildModel"
// CodeOS — modèle du juge (agent bench-judge, Settings > Models). Contrairement
// aux autres agents (coeos/CoeOS), le juge tourne sur un modèle CHOISI, distinct
// du routeur — défaut GLM 5.2. Id nu ; vide = défaut.
export const JUDGE_MODEL_KEY = "coeos.judgeModel"
// Défaut du modèle juge (id nu) quand rien n'est choisi : GLM 5.2 (id sur .39).
// Si non servable sur l'endpoint courant, le juge retombe sur son modèle statique.
export const JUDGE_MODEL_DEFAULT = "or:glm-5.2"
// coeos-code — dernier catalogue /v1/models connu (ids nus). Repli si le fetch au
// boot flanche (LAN à froid) : le provider ne retombe plus sur les 2 curatés.
// Même philosophie que ROLE_ASSIGNMENT_KEY (persist + revalidation).
export const MODEL_CATALOG_KEY = "coeos.modelCatalog"
