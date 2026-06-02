<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('cloud_resources', function (Blueprint $table) {
        $table->id();
        $table->string('name'); // ex: "Serveur-Dev-Backend"
        $table->string('provider')->default('AWS');
        $table->string('status'); // "running", "stopped"
        $table->float('cpu_usage_percent'); // ex: 2.5 (inutilisé)
        $table->float('cost_per_hour');
        $table->integer('idle_hours')->default(0); // Temps passé sans activité
        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cloud_resources');
    }
};
