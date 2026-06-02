<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CloudResource;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RunAgenticAudit extends Command
{
    // La commande que tu taperas dans le terminal
    protected $signature = 'agent:run';
    protected $description = 'Scan l\'infrastructure, applique les décisions IA et alerte via n8n';

    public function handle()
    {
        $this->info("🤖 [AgenticFlow] Début du scan de l'infrastructure...");

        $resources = CloudResource::where('status', 'running')->get();

        if ($resources->isEmpty()) {
            $this->warn("Aucune ressource active trouvée.");
            return;
        }

        // 1. Préparation des données
        $contextData = $resources->map(function ($resource) {
            $env = str_contains(strtolower($resource->name), 'prod') ? 'Production' : 'Development';
            return [
                'id' => $resource->id,
                'name' => $resource->name,
                'environment' => $env,
                'cpu_usage_percent' => $resource->cpu_usage_percent,
                'idle_hours' => $resource->idle_hours,
                'cost_per_hour' => $resource->cost_per_hour,
            ];
        });

        // Prompt système (Le même que tu as déjà validé)
        $systemPrompt = <<<EOT
Tu es un Agent FinOps Autonome Senior. Ta mission est d'optimiser l'infrastructure cloud d'une entreprise.
RÈGLES D'ENTREPRISE À RESPECTER :
- Règle A : Les serveurs "Prod" ne doivent JAMAIS être éteints, au pire redimensionnés ("resize").
- Règle B : Les serveurs de "Dev" ou "Test" inactifs plus de 4 heures doivent être éteints ("shutdown").
- Règle C : Tout CPU < 5% est considéré comme une anomalie.

INSTRUCTIONS :
Ne retourne QUE du JSON strict dans ce format :
[{"resource_id": 1, "action": "shutdown", "confidence_score": 98, "reasoning": "Explication", "estimated_savings_monthly": 45.50}]
EOT;

        $this->info("🧠 [AgenticFlow] Analyse LLM en cours (Llama 3.3)...");

        // 2. Appel à l'IA
        $response = Http::withoutVerifying()
            ->withToken(env('AI_API_KEY'))
            ->timeout(30)
            ->post(env('AI_API_URL'), [
                'model' => env('AI_MODEL', 'llama-3.3-70b-versatile'),
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => json_encode($contextData)],
                ],
                'temperature' => 0.0,
            ]);

        if ($response->failed()) {
            $this->error("Échec de communication avec l'IA.");
            return;
        }

        $aiResponseText = preg_replace('/```json|```/', '', $response->json('choices.0.message.content'));
        $decisions = json_decode(trim($aiResponseText), true);

        if (empty($decisions)) {
            $this->info("✅ [AgenticFlow] Infrastructure optimisée, aucune action requise.");
            return;
        }

        // 3. Exécution Autonome & Préparation de l'alerte n8n
        $totalSavings = 0;
        $actionsTaken = [];

        foreach ($decisions as $decision) {
            $resource = CloudResource::find($decision['resource_id']);
            
            if ($resource) {
                if ($decision['action'] === 'shutdown') {
                    $resource->update(['status' => 'stopped']);
                    $actionText = "🔴 Arrêt du serveur";
                } else {
                    $resource->update(['cost_per_hour' => $resource->cost_per_hour / 2]);
                    $actionText = "🟡 Redimensionnement";
                }

                $this->line("⚡ Exécution : {$actionText} - {$resource->name} (+${decision['estimated_savings_monthly']}/mois)");
                
                $totalSavings += $decision['estimated_savings_monthly'];
                $actionsTaken[] = "[{$resource->name}] : {$actionText} (Raison : {$decision['reasoning']})";
            }
        }

        // 4. Le Webhook vers n8n (La touche magique)
        $this->info("📱 Envoi du rapport au CTO via n8n (WhatsApp)...");
        
        $n8nWebhookUrl = env('N8N_WEBHOOK_URL', 'http://ton-serveur-n8n/webhook/finops-alert');
        
        // On envoie un payload propre à n8n
        Http::withoutVerifying()->post($n8nWebhookUrl, [
            'event' => 'finops_audit_completed',
            'total_savings_monthly' => $totalSavings,
            'actions_details' => implode("\n", $actionsTaken),
            'timestamp' => now()->toDateTimeString()
        ]);

        $this->info("🏁 Audit terminé avec succès !");
    }
}