<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CloudResource;

class AnalyticsController extends Controller
{
    public function overview()
    {
        $resources = CloudResource::all();

        $runningResources = $resources->where('status', 'running')->values();
        $monthlyCost = round(
            $runningResources->sum(fn (CloudResource $resource) => $this->monthlyCost($resource)),
            2
        );

        $opportunities = $runningResources
            ->map(function (CloudResource $resource) {
                return $this->buildOpportunity($resource);
            })
            ->filter()
            ->values();

        $projectedMonthlySavings = round($opportunities->sum('monthly_savings'), 2);
        $dailySavings = round($projectedMonthlySavings / 30, 2);

        $savingsProjection = collect(range(1, 7))
            ->map(function (int $day) use ($dailySavings) {
                return [
                    'label' => now()->addDays($day - 1)->format('D'),
                    'value' => round($dailySavings * $day, 2),
                ];
            })
            ->values();

        $distributionSource = $runningResources
            ->groupBy(fn (CloudResource $resource) => $resource->provider ?: 'Unknown')
            ->map(function ($providerResources, $provider) use ($monthlyCost) {
                $providerMonthlyCost = round(
                    $providerResources->sum(fn (CloudResource $resource) => $this->monthlyCost($resource)),
                    2
                );

                return [
                    'name' => $provider,
                    'value' => $monthlyCost > 0 ? round(($providerMonthlyCost / $monthlyCost) * 100, 1) : 0,
                    'monthly_cost' => $providerMonthlyCost,
                ];
            })
            ->sortByDesc('monthly_cost')
            ->values();

        return response()->json([
            'summary' => [
                'projected_monthly_cost' => $monthlyCost,
                'projected_monthly_savings' => $projectedMonthlySavings,
                'optimization_candidates' => $opportunities->count(),
                'running_resources' => $runningResources->count(),
                'average_cpu_usage' => round($runningResources->avg('cpu_usage_percent') ?? 0, 1),
                'generated_at' => now()->toIso8601String(),
            ],
            'savings_projection' => $savingsProjection,
            'cloud_distribution' => $distributionSource,
            'top_opportunities' => $opportunities
                ->sortByDesc('monthly_savings')
                ->take(5)
                ->values(),
        ]);
    }

    private function buildOpportunity(CloudResource $resource): ?array
    {
        $environment = str_contains(strtolower($resource->name), 'prod') ? 'production' : 'non-production';
        $monthlyCost = $this->monthlyCost($resource);

        if ($environment !== 'production' && $resource->idle_hours >= 4) {
            return [
                'resource_id' => $resource->id,
                'name' => $resource->name,
                'provider' => $resource->provider,
                'action' => 'shutdown',
                'monthly_savings' => round($monthlyCost, 2),
                'reason' => 'Non-production resource idle for at least 4 hours.',
            ];
        }

        if ($resource->cpu_usage_percent < 5) {
            $savingsRate = $environment === 'production' ? 0.35 : 0.5;

            return [
                'resource_id' => $resource->id,
                'name' => $resource->name,
                'provider' => $resource->provider,
                'action' => 'resize',
                'monthly_savings' => round($monthlyCost * $savingsRate, 2),
                'reason' => 'Very low CPU usage indicates oversizing.',
            ];
        }

        return null;
    }

    private function monthlyCost(CloudResource $resource): float
    {
        return (float) $resource->cost_per_hour * 24 * 30;
    }
}
