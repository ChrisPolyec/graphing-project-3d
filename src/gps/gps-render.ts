// Importación de módulos necesarios de Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Definición de tipos para coordenadas 3D y datos de ubicación
type Point3D = { x: number; y: number; z: number };
type LocationData = { lat: number; lng: number; alt: number; name?: string };

/**
 * Clase principal que gestiona la visualización 3D de coordenadas GPS
 * Crea un planeta Tierra con marcadores animados y controles interactivos
 */
class GPSVisualizer {
  // Propiedades privadas de la clase
  private scene = new THREE.Scene(); // Escena 3D principal
  private camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // Cámara con perspectiva
  private renderer = new THREE.WebGLRenderer({ antialias: true }); // Renderizador WebGL con antialiasing
  private labelRenderer = new CSS2DRenderer(); // Renderizador para etiquetas HTML en 3D
  private controls: OrbitControls; // Controles de órbita para interactuar con la escena
  private earthGroup = new THREE.Group(); // Grupo que contiene la Tierra y todos sus elementos
  private marker: THREE.Group | null = null; // Marcador actual (puede ser nulo)
  private isAnimating = false; // Estado de animación de cámara
  private animProgress = 0; // Progreso de la animación (0-1)
  private camStart = new THREE.Vector3(0, 0, 15); // Posición inicial de cámara
  private camEnd = new THREE.Vector3(0, 0, 0); // Posición final de cámara
  private target = new THREE.Vector3(0, 0, 0); // Punto objetivo de la cámara

  /**
   * Constructor - Inicializa todos los componentes de la visualización
   */
  constructor() {
    // Configurar fondo de la escena (color oscuro espacial)
    this.scene.background = new THREE.Color(0x0a0a1a);
    // Posicionar cámara inicial
    this.camera.position.set(0, 0, 15);

    // Configurar renderizador WebGL
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // Configurar renderizador de etiquetas CSS2D
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none';
    document.body.appendChild(this.labelRenderer.domElement);

    // Configurar controles de órbita para interacción del usuario
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Activar inercia
    this.controls.dampingFactor = 0.05; // Factor de amortiguamiento
    this.controls.target.set(0, 0, 0); // Punto central de la escena

    // Agregar la Tierra al grupo y configurar iluminación
    this.scene.add(this.earthGroup);
    this.setupLights();
    
    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', () => this.onResize());
  }

  /**
   * Configura la iluminación de la escena
   * - Luz ambiental para iluminación base
   * - Luz direccional principal
   * - Luz direccional secundaria
   * - Luz puntual para efectos
   */
  private setupLights() {
    // Luz ambiental suave
    this.scene.add(new THREE.AmbientLight(0x404060));
    
    // Luz direccional principal
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 10, 7);
    this.scene.add(light);
    
    // Luz direccional secundaria
    this.scene.add(new THREE.DirectionalLight(0x4488ff, 0.5).position.set(-5, 0, -5));
    
    // Luz puntual para efectos
    this.scene.add(new THREE.PointLight(0x00d4ff, 0.3, 20).position.set(0, 5, 5));
  }

  /**
   * Convierte grados a radianes
   * @param deg - Ángulo en grados
   * @returns Ángulo en radianes
   */
  private degToRad = (deg: number) => deg * (Math.PI / 180);

  /**
   * Convierte coordenadas geográficas (lat, lng, alt) a coordenadas 3D
   * @param lat - Latitud en grados
   * @param lng - Longitud en grados
   * @param alt - Altitud en metros
   * @returns Coordenadas 3D (x, y, z)
   */
  private latLngAltToXYZ = (lat: number, lng: number, alt: number) => {
    // Convertir a radianes y escalar radio (6371km + altitud)
    const [phi, theta, r] = [this.degToRad(lat), this.degToRad(lng), (6371000 + alt) / 1000000];
    // Fórmula de conversión esférica a cartesiana
    return { 
      x: r * Math.cos(phi) * Math.cos(theta), 
      y: r * Math.sin(phi), 
      z: -r * Math.cos(phi) * Math.sin(theta) 
    };
  };

  /**
   * Crea la Tierra con textura, atmósfera y estrellas
   */
  createEarth() {
    // Limpiar grupo de la Tierra
    this.earthGroup.children.length = 0;
    const radius = 6.371; // Radio de la Tierra en unidades escaladas

    // Cargar textura de la Tierra desde internet
    const texture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');

    // Crear esfera de la Tierra con textura
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 64),
      new THREE.MeshPhongMaterial({ 
        map: texture, 
        specular: new THREE.Color('grey'), 
        shininess: 5, 
        emissive: new THREE.Color(0x000022), 
        emissiveIntensity: 0.1 
      })
    );
    this.earthGroup.add(earth);

    // Malla de alambre simplificada (wireframe)
    const wireframe = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.001, 24, 16),
      new THREE.MeshBasicMaterial({ 
        color: 0x4488ff, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.15 
      })
    );
    this.earthGroup.add(wireframe);

    // Atmósfera exterior (efecto de brillo)
    this.earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.02, 64, 64),
      new THREE.MeshPhongMaterial({ 
        color: 0x4488ff, 
        transparent: true, 
        opacity: 0.08, 
        side: THREE.BackSide 
      })
    ));

    // Sistema de estrellas de fondo
    const stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(Array.from({ length: 3000 }, () => (100 + Math.random() * 100) * (Math.random() * 2 - 1))),
        3
      )),
      new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 0.2, 
        transparent: true, 
        opacity: 0.8, 
        sizeAttenuation: true 
      })
    );
    this.scene.add(stars);
  }

  /**
   * Crea un marcador en la ubicación especificada
   * @param location - Datos de ubicación (lat, lng, alt, nombre)
   */
  createMarker(location: LocationData) {
    // Eliminar marcador anterior si existe
    this.marker?.parent?.remove(this.marker);
    
    // Calcular posición 3D
    const pos = this.latLngAltToXYZ(location.lat, location.lng, location.alt);
    const group = new THREE.Group().position.set(pos.x, pos.y, pos.z);

    // Esfera principal del marcador (efecto brillante)
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 32, 32),
      new THREE.MeshPhongMaterial({ 
        color: 0x00ff88, 
        emissive: 0x00ff88, 
        emissiveIntensity: 0.5, 
        specular: 0xffffff, 
        shininess: 100 
      })
    ));

    // Efecto de brillo (glow) alrededor del marcador
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 32, 32),
      new THREE.MeshBasicMaterial({ 
        color: 0x00ff88, 
        transparent: true, 
        opacity: 0.2, 
        wireframe: true 
      })
    ));

    // Anillo pulsante que rodea el marcador
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.6, 32),
      new THREE.MeshBasicMaterial({ 
        color: 0x00ff88, 
        transparent: true, 
        opacity: 0.3, 
        side: THREE.DoubleSide 
      })
    );
    ring.lookAt(0, 0, 0); // Apuntar siempre al centro de la Tierra
    group.add(ring);

    // Etiqueta HTML con información de la ubicación
    const label = new CSS2DObject(
      Object.assign(document.createElement('div'), {
        textContent: location.name || `📍 ${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`,
        style: { 
          color: 'white', 
          font: 'bold 14px Arial', 
          background: 'rgba(0,0,0,0.7)', 
          padding: '8px 16px', 
          borderRadius: '20px', 
          border: '2px solid #00ff88', 
          backdropFilter: 'blur(10px)' 
        }
      })
    );
    label.position.set(0, 0.6, 0); // Posición encima del marcador
    group.add(label);

    // Agregar al grupo de la Tierra
    this.earthGroup.add(group);
    this.marker = group;
    
    // Iniciar animación de cámara hacia el marcador
    this.startCameraAnimation(new THREE.Vector3(pos.x, pos.y, pos.z));
  }

  /**
   * Inicia la animación de la cámara hacia una ubicación objetivo
   * @param target - Punto objetivo en coordenadas 3D
   */
  private startCameraAnimation(target: THREE.Vector3) {
    const dist = target.length(); // Distancia desde el centro
    this.camStart.copy(this.camera.position); // Posición actual de cámara
    // Calcular posición final: detrás del objetivo y ligeramente desplazada
    this.camEnd.copy(target.clone().add(target.clone().normalize().multiplyScalar(dist * 1.5)).add(new THREE.Vector3(1, 0.5, 0)));
    this.target.copy(target);
    this.isAnimating = true; // Activar animación
    this.animProgress = 0; // Reiniciar progreso
  }

  /**
   * Actualiza la animación de la cámara con interpolación suave (easing)
   * Función de easing cúbica para movimiento natural
   */
  private updateCameraAnimation() {
    if (!this.isAnimating) return;
    
    // Avanzar progreso de animación
    this.animProgress = Math.min(this.animProgress + 0.008, 1);
    
    // Función de easing cúbica para suavizar el movimiento
    const ease = this.animProgress < 0.5 
      ? 4 * this.animProgress ** 3 
      : 1 - (-2 * this.animProgress + 2) ** 3 / 2;
    
    // Interpolar posición de cámara
    this.camera.position.lerpVectors(this.camStart, this.camEnd, ease);
    this.camera.lookAt(this.target);
    this.controls.target.copy(this.target);
    
    // Finalizar animación cuando se completa
    if (this.animProgress >= 1) this.isAnimating = false;
  }

  /**
   * Anima el marcador con efectos visuales:
   * - Pulsación de intensidad de brillo
   * - Escalado del anillo
   * - Cambio de opacidad
   */
  private animateMarker() {
    if (!this.marker) return;
    
    const time = Date.now() * 0.001; // Tiempo en segundos
    
    this.marker.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        // Animación de brillo para la esfera principal
        if (child.geometry.type === 'SphereGeometry' && child.material instanceof THREE.MeshPhongMaterial) {
          child.material.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.2;
        }
        // Animación de escala y opacidad para el anillo
        if (child.geometry.type === 'RingGeometry') {
          const s = 1 + Math.sin(time * 1.5) * 0.2;
          child.scale.set(s, s, s);
          if (child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = 0.2 + Math.sin(time * 1.5) * 0.15;
          }
        }
      }
    });
  }

  /**
   * Maneja el redimensionamiento de la ventana
   * Actualiza las proporciones de cámara y tamaños de renderizadores
   */
  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Bucle principal de animación
   * Actualiza todos los elementos en cada frame
   */
  animate() {
    requestAnimationFrame(() => this.animate()); // Solicitar siguiente frame
    this.updateCameraAnimation(); // Actualizar animación de cámara
    this.animateMarker(); // Animar marcador
    this.controls.update(); // Actualizar controles
    this.renderer.render(this.scene, this.camera); // Renderizar escena WebGL
    this.labelRenderer.render(this.scene, this.camera); // Renderizar etiquetas CSS2D
  }

  /**
   * Inicializa la visualización con una ubicación opcional
   * @param location - Datos de ubicación inicial (opcional)
   */
  init(location?: LocationData) {
    this.createEarth(); // Crear la Tierra
    this.animate(); // Iniciar bucle de animación
    if (location) this.createMarker(location); // Crear marcador si se proporciona
  }
}

// ============================================
// EJEMPLO DE USO
// ============================================
// Crear una instancia del visualizador GPS
const gps = new GPSVisualizer();

// Inicializar con las coordenadas de Madrid, España
gps.init({ 
  lat: 40.4168,    // Latitud: 40.4168° Norte
  lng: -3.7038,    // Longitud: 3.7038° Oeste
  alt: 667,        // Altitud: 667 metros sobre el nivel del mar
  name: '📍 Madrid, España' // Nombre de la ubicación
});
