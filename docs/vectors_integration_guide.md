# Guía de Integración y Tips (Módulo Vectores - Equipo 2)

Este documento contiene recomendaciones para los **Equipos 1 y 3** sobre cómo utilizar
las funciones matemáticas de física de proyectiles desarrolladas por el **Equipo 2**.

---

## Para el Equipo 1 (Interfaz Principal)

### 1. Validación de inputs
`calculateProjectile` no valida que `magnitude` sea positivo ni que los ángulos
estén en un rango "razonable" — según el README esa validación de inputs
(campos vacíos, letras donde van números, etc.) es responsabilidad del Equipo 1.
Una magnitud negativa no rompe nada matemáticamente (solo invierte el sentido del
vector), pero conviene decidir si eso es un comportamiento deseado antes de
exponerlo en la UI.

### 2. Ángulos en grados, no en radianes
Todos los inputs del módulo (`elevationAngle`, `azimuthAngle`) se esperan **en
grados**. La conversión a radianes se hace internamente.

```typescript
import { calculateProjectile } from '../vectors/vector-math';

const resultado = calculateProjectile({
  magnitude: 25,
  elevationAngle: 45, // grados
  azimuthAngle: 0,     // grados
});
```

---

## Para el Equipo 3 (Gráficos 3D de Vectores)

### 1. Punto de entrada recomendado
Usen `calculateProjectile(inputs)` como función principal: les da en un solo
objeto todo lo necesario para dibujar (`vx`, `vy`, `vz`, `flightTime`,
`maxHeight`, `maxRange`, `trajectoryPoints`).

### 2. Los puntos ya vienen escalados
`trajectoryPoints` ya está multiplicado por `SCENE_SCALE_VECTORS`, no hace falta
que lo vuelvan a escalar. Si necesitan el alcance o la altura en unidades de
escena (por ejemplo, para la auto-escala de cámara), recuerden que `maxHeight` y
`maxRange` **sí están en metros reales, sin escalar** — multiplíquenlos por
`SCENE_SCALE_VECTORS` si los usan para calcular distancias de cámara.

### 3. Caso `vy <= 0`
Si el ángulo de elevación es 0 o negativo, `flightTime`, `maxHeight` y
`maxRange` vienen en `0` y `trajectoryPoints` es un array de puntos todos en el
origen `(0,0,0)`. No es un error, es el resultado esperado de un disparo que no
sube. Prevean ese caso para no intentar dibujar una curva vacía como si fuera un
bug.

### 4. Cantidad de puntos de la curva
Por defecto la trayectoria tiene 61 puntos (60 segmentos). Si necesitan más o
menos resolución para la curva, pueden pasar un tercer parámetro:

```typescript
import { generateTrajectory } from '../vectors/vector-math';

const puntos = generateTrajectory(componentes, tiempoDeVuelo, 120); // más resolución
```