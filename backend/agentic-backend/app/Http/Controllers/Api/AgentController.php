<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CloudResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AgentController extends Controller
{
    public function analyzeAndAct(Request $request)
    {
        try {
            // 1. Récupérer uniquement les ressources actives
            $resources = CloudResource::where('status', 'running')->get();

            // Si aucune ressource ne tourne, on retourne un tableau vide
            if ($resources->isEmpty()) {
                return response()->json([
                    'status' => 'success',
                    'agent_decisions' => [],
                    'message' => 'Aucune ressource active à analyser.'
                ]);
            }

            // 2. Préparer les données pour l'IA
            // On sélectionne uniquement les colonnes pertinentes pour économiser des tokens (et de l'argent)
            $contextData = $resources->map(function ($resource) {
                // AJOUT CRUCIAL : On aide l'IA en déduisant l'environnement à partir du nom
                $env = str_contains(strtolower($resource->name), 'prod') ? 'Production' : 'Development';
                
                return [
                    'id' => $resource->id,
                    'name' => $resource->name,
                    'environment' => $env, // <--- LIGNE AJOUTÉE ICI
                    'cpu_usage_percent' => $resource->cpu_usage_percent,
                    'idle_hours' => $resource->idle_hours,
                    'cost_per_hour' => $resource->cost_per_hour,
                    'status' => $resource->status
                ];
            });
            
            $context = json_encode($contextData);

            // 3. Le Prompt Système blindé
            $systemPrompt = <<<EOT
Tu es un Agent FinOps Autonome Senior. Ta mission est d'optimiser l'infrastructure cloud d'une entreprise.
Tu n'es pas un simple script, tu es doté de raisonnement. Tu dois analyser les métriques, évaluer les risques, et proposer des actions.

RÈGLES D'ENTREPRISE (POLITIQUES FINOPS) À RESPECTER :
- Règle A : Les serveurs taggués "Prod" ou ayant un trafic continu ne doivent JAMAIS être éteints, au pire redimensionnés ("resize").
- Règle B : Les serveurs de "Dev" ou "Test" inactifs plus de 4 heures doivent être éteints ("shutdown").
- Règle C : Tout CPU < 5% est considéré comme une anomalie de gaspillage.

INSTRUCTIONS DE SORTIE :
Tu NE DOIS GÉNÉRER AUCUN TEXTE en dehors du JSON. 
Ta réponse doit être un tableau JSON strict où chaque objet correspond à une recommandation d'optimisation. Utilise ce format exact :

[
  {
    "resource_id": 1,
    "action": "shutdown",
    "confidence_score": 98,
    "risk_level": "low",
    "policy_violated": "Règle B",
    "reasoning": "Le serveur est inactif depuis 12h, ce qui enfreint la politique de développement. Arrêt sécurisé.",
    "estimated_savings_monthly": 45.50
  }
]
EOT;
            $userPrompt = "Voici les données de l'infrastructure actuelle : " . $context;

         
            $apiUrl = env('AI_API_URL', 'https://api.openai.com/v1/chat/completions');
            $apiKey = env('AI_API_KEY');

            $response = Http::withoutVerifying() // <--- HACK SSL Windows: désactive la vérification du certificat
                ->withToken($apiKey)
                ->timeout(30) // Évite de bloquer le serveur si l'IA rame
                ->post($apiUrl, [
                    'model' => env('AI_MODEL', 'gpt-3.5-turbo'), // Changez si vous utilisez un autre modèle
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                    'temperature' => 0.0, // Température à zéro = logique stricte, aucune hallucination
                ]);

            // Gestion des erreurs de l'API
            if ($response->failed()) {
                $errorBody = $response->body();
                Log::error("Erreur API IA (Groq) - Status: " . $response->status() . " - Body: " . $errorBody);
                return response()->json(['error' => 'Échec Groq: ' . $response->status() . ' - ' . $errorBody], 500);
            }

            // 5. Extraction et nettoyage de la réponse JSON
            $aiResponseText = $response->json('choices.0.message.content');
            
            // Hackathon trick : On supprime les balises markdown que l'IA ajoute parfois
            $aiResponseText = preg_replace('/```json|```/', '', $aiResponseText);
            
            $agentDecisions = json_decode(trim($aiResponseText), true);

            // Vérification finale de sécurité
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("Format JSON invalide retourné par l'IA : " . $aiResponseText);
                return response()->json(['error' => 'L\'IA a retourné un format inexploitable.'], 500);
            }
            // Envoyer à n8n pour WhatsApp (Copie ce bloc du Command vers ton Controller)
            $n8nWebhookUrl = 'https://greencloud.app.n8n.cloud/webhook-test/finops-alert'; 

            if ($n8nWebhookUrl && !empty($agentDecisions)) {
                // Calculer les économies réelles pour le message WhatsApp
                $totalSavings = collect($agentDecisions)->sum('estimated_savings_monthly');
                
                Http::withoutVerifying()->post($n8nWebhookUrl, [
                    'event' => 'frontend_audit_trigger',
                    'total_savings_monthly' => $totalSavings,
                    'actions_details' => "L'audit a été lancé manuellement depuis le Dashboard. " . count($agentDecisions) . " optimisations détectées.",
                    'timestamp' => now()->toDateTimeString()
                ]);
            }

            return response()->json([
                'status' => 'success',
                'agent_decisions' => $agentDecisions
            ]);

        } catch (\Exception $e) {
            Log::error("Exception AgentController : " . $e->getMessage());

            return response()->json(['error' => 'Une erreur interne est survenue dans le backend.'], 500);

        }
    }
    public function executeAction(Request $request)
{
    // L'agent ou le frontend envoie la décision ici pour exécution
    $validated = $request->validate([
        'resource_id' => 'required|integer|exists:cloud_resources,id',
        'action' => 'required|string|in:shutdown,resize',
    ]);

    $resource = CloudResource::find($validated['resource_id']);

    if ($validated['action'] === 'shutdown') {
        $resource->update(['status' => 'stopped']);
        $message = "Agent autonome : Le serveur '{$resource->name}' a été éteint avec succès.";
    } else {
        // Simulation d'un redimensionnement
        $resource->update(['cost_per_hour' => $resource->cost_per_hour / 2]);
        $message = "Agent autonome : Le serveur '{$resource->name}' a été redimensionné (coût divisé par 2).";
    }

    // Ici, en réalité, vous appelleriez l'API AWS ou un script bash
    return response()->json([
        'status' => 'success',
        'message' => $message,
        'new_state' => $resource
    ]);
}
}