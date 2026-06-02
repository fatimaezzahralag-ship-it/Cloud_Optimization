<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AgentController;
use App\Models\CloudResource;
use Illuminate\Support\Facades\Route;

Route::get('/resources', function () {
    return CloudResource::all();
});

Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
Route::post('/agent/analyze', [AgentController::class, 'analyzeAndAct']);
Route::post('/agent/execute', [AgentController::class, 'executeAction']);
