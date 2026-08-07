import type { VectorInputs, VectorMathResults, Point3D } from '../interfaces';
import { GRAVITY, SCENE_SCALE_VECTORS } from '../core/constants';

const DEFAULT_TRAJECTORY_STEPS = 60;

type VectorComponents = Pick<VectorMathResults, 'vx' | 'vy' | 'vz'>;
type FlightValues = Pick<VectorMathResults, 'flightTime' | 'maxHeight' | 'maxRange'>;

/**
 * Descompone un vector de disparo (magnitud + ángulos) en sus componentes cartesianas (vx, vy, vz).
 *
 * @param inputs Magnitud (velocidad inicial) y ángulos de elevación/azimuth en GRADOS.
 * @returns Componentes vx, vy, vz del vector de velocidad inicial.
 */
export function decomposeVector(inputs: VectorInputs): VectorComponents {
  const elevation = degreesToRadians(inputs.elevationAngle);
  const azimuth = degreesToRadians(inputs.azimuthAngle);

  const horizontalMagnitude = inputs.magnitude * Math.cos(elevation);

  return {
    vx: horizontalMagnitude * Math.cos(azimuth),
    vy: inputs.magnitude * Math.sin(elevation),
    vz: horizontalMagnitude * Math.sin(azimuth),
  };
}

/**
 * Calcula tiempo total de vuelo, altura máxima y alcance horizontal del proyectil.
 * Si vy <= 0 (el disparo no sube), no hay vuelo que calcular y se devuelve todo en 0.
 *
 * @param components Componentes vx, vy, vz del vector de velocidad inicial.
 * @returns Tiempo de vuelo (s), altura máxima (m) y alcance máximo (m).
 */
export function calculateFlightValues(components: VectorComponents): FlightValues {
  const { vx, vy, vz } = components;

  if (vy <= 0) {
    return { flightTime: 0, maxHeight: 0, maxRange: 0 };
  }

  const flightTime = (2 * vy) / GRAVITY;

  const maxHeight = (vy * vy) / (2 * GRAVITY);

  const maxRange = Math.sqrt((vx * flightTime) ** 2 + (vz * flightTime) ** 2);

  return { flightTime, maxHeight, maxRange };
}

/**
 * Genera los puntos de la curva de trayectoria, muestreando "steps" intervalos
 * entre t=0 y t=flightTime. Los puntos ya vienen escalados a la escena (SCENE_SCALE_VECTORS).
 *
 * @param components Componentes vx, vy, vz del vector de velocidad inicial.
 * @param flightTime Tiempo total de vuelo (normalmente el de calculateFlightValues).
 * @param steps Cantidad de segmentos de la curva (por defecto 60 → 61 puntos).
 * @returns Array de puntos {x, y, z} ya escalados a la escena 3D.
 */
export function generateTrajectory(components: VectorComponents, flightTime: number, steps: number = DEFAULT_TRAJECTORY_STEPS): Point3D[] {
  const { vx, vy, vz } = components;
  const points: Point3D[] = [];

  // Si steps es 0, negativo o inválido, la división de abajo daría NaN.
  // Usamos el valor por defecto en ese caso.
  const safeSteps = Number.isFinite(steps) && steps > 0 ? Math.floor(steps) : DEFAULT_TRAJECTORY_STEPS;

  for (let i = 0; i <= safeSteps; i++) {
    const t = (flightTime * i) / safeSteps;
    const realWorldPoint: Point3D = {
      x: vx * t,
      y: vy * t - 0.5 * GRAVITY * t * t,
      z: vz * t,
    };
    points.push(scaleToScene(realWorldPoint));
  }

  return points;
}

/**
 * Punto de entrada recomendado del módulo: recibe los inputs crudos del usuario
 * y devuelve componentes, valores de vuelo y trayectoria en un solo objeto.
 *
 * @param inputs Magnitud y ángulos ingresados por el usuario.
 * @returns Resultado completo listo para que el Equipo 3 lo renderice.
 */
export function calculateProjectile(inputs: VectorInputs): VectorMathResults {
  const components = decomposeVector(inputs);
  const flightValues = calculateFlightValues(components);
  const trajectoryPoints = generateTrajectory(components, flightValues.flightTime);

  return {
    ...components,
    ...flightValues,
    trajectoryPoints,
  };
}

/** Convierte grados a radianes. */
function degreesToRadians(degrees: number): number { return (degrees * Math.PI) / 180; }

/** Escala un punto del mundo real (metros) a unidades de la escena 3D. */
function scaleToScene(point: Point3D): Point3D {
  return {
    x: point.x * SCENE_SCALE_VECTORS,
    y: point.y * SCENE_SCALE_VECTORS,
    z: point.z * SCENE_SCALE_VECTORS,
  };
}