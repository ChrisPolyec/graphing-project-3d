# Guía de Integración y Tips (Módulo GPS - Equipo 4)

Este documento contiene recomendaciones y advertencias para los **Equipos 1 y 5** sobre cómo utilizar las funciones matemáticas y de red desarrolladas por el **Equipo 4**.

---

## Para el Equipo 1 (Interfaz Principal)

### 1. Manejo de Estados Asíncronos (Loading)
La función `fetchElevation(lat, lng)` se conecta a internet y retorna una Promesa. Asegúrense de manejar los estados de la interfaz correctamente:
- Antes de llamar a la función, desactiven el botón de búsqueda y muestren un estado de "Cargando...".
- Utilicen `async/await` para esperar el resultado.
- Reactiven el botón cuando la promesa se resuelva.

```typescript
import { fetchElevation } from '../src/gps/gps-api';

// Ejemplo de uso:
async function onSearchClick(lat: number, lng: number) {
    uiManager.showLoading();
    
    // La función tiene su propio timeout de seguridad de 5 segundos.
    const altitud = await fetchElevation(lat, lng); 
    
    uiManager.hideLoading();
    // Pasar lat, lng y altitud al Equipo 5...
}
```

### 2. Tolerancia a Fallos
Si el internet está apagado o la API falla, nuestra función capturará el error internamente y retornará `0`. 
- **No es necesario** que ustedes pongan un `try/catch` para fallos de red (ya lo hicimos nosotros).
- Solo tengan en cuenta que recibir un `0` es posible y válido, no rompan la aplicación si esto pasa.

---

## Para el Equipo 5 (Gráficos 3D GPS)

### 1. Sistema de Coordenadas
La función `latLngAltToXYZ(lat, lng, alt, earthRadius)` retorna un punto `(X, Y, Z)`. 
- **Eje Y hacia Arriba**: Hemos estructurado la matemática asumiendo el estándar de **Three.js** donde el **Eje Y** apunta hacia el polo norte. 
- Si por alguna razón rotan la cámara o agrupan la Tierra en otro eje, los marcadores saldrán descuadrados. Asegúrense de mantener la Tierra sin rotaciones extrañas en su eje principal, o apliquen la rotación al contenedor de los marcadores también.

### 2. Escala y Radio de la Tierra
La función tiene un parámetro opcional `earthRadius` que por defecto es **6,371,000 metros**.
- **Sincronización de Geometría**: Cuando creen su `THREE.SphereGeometry` para dibujar la Tierra, el radio de esa esfera **debe ser exactamente el mismo** que le pasen a nuestra función.
- Si deciden achicar el modelo a una escala menor (por ejemplo, `earthRadius = 100` para que quepa en pantalla), deben pasarnos ese número explícitamente:

```typescript
import { latLngAltToXYZ } from '../src/gps/gps-math';

// El tamaño visual de su globo en Three.js
const escalaGlobo = 100; 

// Obtener punto para poner el PIN
const punto3D = latLngAltToXYZ(lat, lng, altitud, escalaGlobo);

marker.position.set(punto3D.x, punto3D.y, punto3D.z);
```

### 3. Animación de Cámara
Tienen las coordenadas exactas de la superficie del planeta. Para hacer la animación de "Vuelo/Zoom", no pongan la cámara exactamente en `(X, Y, Z)` porque quedará dentro de la geometría del marcador o pegada al suelo. 
- **Tip**: Multipliquen el vector de posición resultante por un pequeño factor de escala (ej. `1.2`) para que la cámara mire el objetivo pero desde una distancia prudente en la órbita.
