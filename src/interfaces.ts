export interface Point3D {
    x: number;
    y: number;
    z: number;
}

/** Application operating modes */
export type AppMode = 'VECTORS' | 'GPS';

/** Contract for the UI's global state */
export interface AppState {
    currentMode: AppMode;
    loading: boolean;
    error: string | null;
}

export interface RenderModule {
    /** Shows this module's 3D objects and adjusts the camera if needed */
    activate(): void;
    /** Hides/clears this module's 3D objects when leaving the mode */
    deactivate(): void;
}

// --- VECTOR MODULE ---
export interface VectorInputs {
    magnitude: number;
    elevationAngle: number;
    azimuthAngle: number;
}

export interface VectorMathResults {
    vx: number;
    vy: number;
    vz: number;
    flightTime: number;
    maxHeight: number;
    maxRange: number;
    trajectoryPoints: Point3D[];
}

export interface VectorRenderModule extends RenderModule {
    plotTrajectory(data: VectorMathResults): void;
}

// --- GPS MODULE ---
export interface GPSInputs {
    latitude: number;
    longitude: number;
}

export type ElevationResponse =
    | { success: true; altitude: number }
    | { success: false; errorMessage: string };

export interface GPSMathResults {
    cartesianCoordinate: Point3D;
    realAltitude: number;
    totalRadius: number;
    zenithAngle: number;
    azimuth: number;
}

export interface GPSRenderModule extends RenderModule {
    plotLocation(data: GPSMathResults): void;
}