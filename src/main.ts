import './style.css';
import { SceneManager } from './core/SceneManager';
import { UIManager } from './core/UIManager';
import { fetchElevation } from './gps/gps-api';
import { calculateProjectile } from './vectors/vector-math';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    
    // Initialize Core Modules (Team 1)
    const sceneManager = new SceneManager(canvas);
    const uiManager = new UIManager();

    console.log('[Team 1] Core App Initialized. Scene and UI are ready.', sceneManager);

    // --- Vector Mode Integration ---
    uiManager.onVectorSubmit = (inputs) => {
        try {
            console.log('[Team 1] Vector form submitted:', inputs);
            
            // Math call (Team 2)
            const results = calculateProjectile(inputs);
            console.log('[Team 1] Math results (Team 2):', results);
            
            // TODO: Pass results to Team 3's Render Module
            // e.g., vectorRenderModule.plotTrajectory(results);
            
        } catch (error) {
            console.error('[Team 1] Error in Vector calculation:', error);
            uiManager.showError('Error interno al calcular el vector.');
        }
    };

    // --- GPS Mode Integration ---
    uiManager.onGpsSubmit = async (inputs) => {
        try {
            console.log('[Team 1] GPS form submitted:', inputs);
            
            // Show loading state BEFORE network call (Team 1 Tip)
            uiManager.showLoading();
            
            // Network call (Team 4). Awaits resolution.
            // As per tip, it has its own fault tolerance and will return 0 if failed.
            const altitude = await fetchElevation(inputs.latitude, inputs.longitude);
            console.log('[Team 1] Altitude fetched (Team 4):', altitude);
            
            // Math call (Team 4) - To be implemented when linking with Team 5
            // const xyz = latLngAltToXYZ(inputs.latitude, inputs.longitude, altitude);
            
            // TODO: Pass results to Team 5's Render Module
            // e.g., gpsRenderModule.plotLocation(xyz);
            
        } catch (error) {
            console.error('[Team 1] Unhandled error in GPS flow:', error);
            uiManager.showError('Error inesperado en la consulta GPS.');
        } finally {
            // Hide loading state AFTER network call (Team 1 Tip)
            uiManager.hideLoading();
        }
    };

    // --- Mode Switching Logic ---
    uiManager.onModeChange = (mode) => {
        console.log(`[Team 1] Switched to mode: ${mode}`);
        // TODO: Call activate/deactivate on RenderModules
        // if (mode === 'VECTORS') {
        //     gpsRenderModule.deactivate();
        //     vectorRenderModule.activate();
        // } else {
        //     vectorRenderModule.deactivate();
        //     gpsRenderModule.activate();
        // }
    };
});
