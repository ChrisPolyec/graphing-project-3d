import * as THREE from 'three';
import type { VectorMathResults, VectorRenderModule } from '../interfaces.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base color for the initial-velocity arrow shaft and cone. */
const ARROW_COLOR = 0x00e5ff;

/** Color of the trajectory line (projectile path). */
const TRAJECTORY_COLOR = 0xff6d00;

/**
 * Fractional padding added around the bounding sphere when repositioning
 * the camera.  A value of 0.25 means the sphere occupies ~75 % of the
 * frustum height, leaving comfortable breathing room on all sides.
 */
const CAMERA_PADDING_FACTOR = 0.25;

/**
 * Minimum distance the camera is allowed to be from the scene centre,
 * even for very small trajectories (prevents extreme near-clipping).
 */
const CAMERA_MIN_DISTANCE = 5;

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

/** Disposable Three.js resource (geometry or material). */
interface Disposable {
    dispose(): void;
}

// ---------------------------------------------------------------------------
// VectorRender
// ---------------------------------------------------------------------------

/**
 * **Module 3 - 3D Vector Graphics**
 *
 * Responsible exclusively for *rendering* pre-computed projectile data in a
 * Three.js scene.  It owns three visual elements:
 *
 * 1. An {@link THREE.ArrowHelper} that represents the initial velocity vector.
 * 2. A {@link THREE.Line} that traces the full 3-D projectile trajectory.
 * 3. Automatic camera framing (auto-framing) that repositions the
 *    {@link THREE.PerspectiveCamera} so the entire trajectory always fits
 *    within the viewport, regardless of scale.
 *
 * **No physics calculations are performed here** (SRP).
 * All GPU resources are disposed of before each new render and on
 * {@link deactivate} to prevent memory leaks.
 */
export class VectorRender implements VectorRenderModule {
    // -----------------------------------------------------------------------
    // Private fields
    // -----------------------------------------------------------------------

    /** The host scene provided by the base team. */
    private readonly scene: THREE.Scene;

    /** The perspective camera provided by the base team. */
    private readonly camera: THREE.PerspectiveCamera;

    /**
     * Container group for every object this module adds to the scene.
     * Keeping them in a single group makes bulk show/hide and disposal trivial.
     */
    private readonly group: THREE.Group;

    /**
     * Tracks every geometry and material allocated by this module so they can
     * be deterministically released from GPU memory via {@link disposeAll}.
     */
    private readonly disposables: Disposable[] = [];

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param scene  - The Three.js scene managed by the base team.
     * @param camera - The perspective camera managed by the base team.
     */
    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.scene = scene;
        this.camera = camera;

        this.group = new THREE.Group();
        this.group.name = 'VectorRenderGroup';
        // Group is added immediately; it starts empty and becomes visible on activate().
        this.scene.add(this.group);
    }

    // -----------------------------------------------------------------------
    // Public API  (VectorRenderModule contract)
    // -----------------------------------------------------------------------

    /**
     * Makes the module's group visible.
     * Called by the base team when the application enters VECTORS mode.
     */
    activate(): void {
        this.group.visible = true;
    }

    /**
     * Hides the group and releases all GPU resources owned by this module.
     * Must be called by the base team when leaving VECTORS mode so that
     * geometries and materials are evicted from the GPU memory budget.
     */
    deactivate(): void {
        this.group.visible = false;
        this.clearScene();
    }

    /**
     * Main entry point for this module.
     *
     * Given the pre-computed {@link VectorMathResults}, this method:
     * 1. Clears any previously rendered objects (disposing GPU resources).
     * 2. Draws the initial-velocity arrow.
     * 3. Draws the trajectory curve.
     * 4. Repositions the camera to frame the entire trajectory.
     *
     * @param data - Pure math results produced by Module 2 (VectorMath).
     */
    plotTrajectory(data: VectorMathResults): void {
        // Always clean up before drawing so we never accumulate stale objects.
        this.clearScene();

        if (data.trajectoryPoints.length < 2) {
            console.warn('[VectorRender] Not enough trajectory points to render (minimum 2).');
            return;
        }

        this.drawInitialArrow(data.vx, data.vy, data.vz);
        this.drawTrajectoryLine(data.trajectoryPoints);
        this.frameCamera(data.trajectoryPoints);
    }

    // -----------------------------------------------------------------------
    // Private - scene construction
    // -----------------------------------------------------------------------

    /**
     * Builds and adds a {@link THREE.ArrowHelper} that starts at the world
     * origin and points in the direction of the initial velocity vector
     * (vx, vy, vz).
     *
     * The arrow length is proportional to the velocity magnitude so it gives
     * an intuitive sense of speed relative to the trajectory scale.
     *
     * @param vx - X component of the initial velocity.
     * @param vy - Y component of the initial velocity.
     * @param vz - Z component of the initial velocity.
     */
    private drawInitialArrow(vx: number, vy: number, vz: number): void {
        const direction = new THREE.Vector3(vx, vy, vz);
        const magnitude = direction.length();

        // A zero-magnitude vector has no direction; skip to avoid NaN in lookAt.
        if (magnitude === 0) {
            console.warn('[VectorRender] Initial velocity is zero; arrow skipped.');
            return;
        }

        direction.normalize();

        // Use a fraction of the magnitude as arrow length so it reads correctly
        // at any scale without dominating the viewport.
        const arrowLength = Math.max(magnitude * 0.15, 1);
        const headLength  = arrowLength * 0.25;
        const headWidth   = headLength  * 0.5;

        const arrow = new THREE.ArrowHelper(
            direction,
            new THREE.Vector3(0, 0, 0), // origin
            arrowLength,
            ARROW_COLOR,
            headLength,
            headWidth,
        );
        arrow.name = 'InitialVelocityArrow';

        // ArrowHelper internally creates a line and a cone mesh.
        // Register their geometries and materials for later disposal.
        if (arrow.line.geometry) this.track(arrow.line.geometry);
        if (arrow.cone.geometry) this.track(arrow.cone.geometry);
        if (arrow.line.material instanceof THREE.Material) this.track(arrow.line.material);
        if (arrow.cone.material instanceof THREE.Material) this.track(arrow.cone.material);

        this.group.add(arrow);
    }

    /**
     * Builds a {@link THREE.Line} from the array of 3-D trajectory points and
     * adds it to the scene group.
     *
     * A {@link THREE.BufferGeometry} is used (rather than the legacy Geometry)
     * because it maps directly to the GPU buffer layout, minimising driver
     * overhead and upload time.
     *
     * @param points - Ordered array of world-space positions along the flight path.
     */
    private drawTrajectoryLine(points: VectorMathResults['trajectoryPoints']): void {
        const geometry = new THREE.BufferGeometry();
        this.track(geometry);

        // Flatten [{ x, y, z }, ...] -> Float32Array([x, y, z, x, y, z, ...])
        // as expected by BufferGeometry.setFromPoints / setAttribute.
        const threePoints = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        geometry.setFromPoints(threePoints);

        const material = new THREE.LineBasicMaterial({ color: TRAJECTORY_COLOR });
        this.track(material);

        const line = new THREE.Line(geometry, material);
        line.name = 'TrajectoryLine';
        this.group.add(line);
    }

    // -----------------------------------------------------------------------
    // Private - camera auto-framing
    // -----------------------------------------------------------------------

    /**
     * Repositions the camera so the complete trajectory fits within the
     * viewport at any scale.
     *
     * **Why the math works this way:**
     *
     * We use {@link THREE.Box3} to compute the axis-aligned bounding box of
     * the trajectory, then derive its bounding sphere.  The sphere radius `r`
     * is the smallest radius that contains every trajectory point regardless
     * of orientation.
     *
     * From the sphere centre (`target`) and using the camera's vertical field
     * of view (vFOV), we can solve for the minimum pull-back distance `d`
     * such that the sphere *just* fits vertically inside the frustum:
     *
     * ```
     *   tan(vFOV / 2) = r / d   =>   d = r / tan(vFOV / 2)
     * ```
     *
     * Multiplying by `(1 + CAMERA_PADDING_FACTOR)` pushes the camera slightly
     * further back so the trajectory never touches the viewport edges.
     *
     * We then place the camera along the diagonal direction (+X, +Y, +Z) from
     * the bounding-sphere centre so the trajectory is viewed from a natural
     * three-quarter perspective, and we point `lookAt` back at the centre to
     * keep it framed.
     *
     * @param points - The same trajectory points used to draw the line.
     */
    private frameCamera(points: VectorMathResults['trajectoryPoints']): void {
        // --- 1. Compute the bounding box of all trajectory points. ----------
        const box = new THREE.Box3();
        for (const p of points) {
            box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z));
        }

        // --- 2. Derive bounding sphere (centre + radius). -------------------
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);

        const { center, radius } = sphere;

        // Guard against a degenerate single-point trajectory.
        const effectiveRadius = Math.max(radius, CAMERA_MIN_DISTANCE * 0.5);

        // --- 3. Compute required pull-back distance. ------------------------
        //
        // The vertical half-angle of the frustum determines how much of the
        // scene fits vertically at a given depth.  Dividing the sphere radius
        // by tan(vFOV/2) gives the exact depth at which the sphere fills the
        // screen; adding the padding factor keeps it comfortably inset.
        const vFovRadians  = THREE.MathUtils.degToRad(this.camera.fov / 2);
        const pullBack     = (effectiveRadius / Math.tan(vFovRadians)) * (1 + CAMERA_PADDING_FACTOR);
        const clampedPullBack = Math.max(pullBack, CAMERA_MIN_DISTANCE);

        // --- 4. Position camera along the +X+Y+Z diagonal from centre. -----
        //
        // A diagonal view angle exposes all three axes simultaneously, which
        // is the most informative perspective for 3-D vector analysis.
        const offset = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(clampedPullBack);
        this.camera.position.copy(center).add(offset);

        // --- 5. Point camera at the trajectory's centre of mass. ------------
        this.camera.lookAt(center);

        // --- 6. Update near/far planes to prevent clipping. -----------------
        //
        // Three.js requires near > 0 and far > near.  We set near to 1 % of
        // the pull-back distance (safe minimum) and far to 4x the pull-back
        // to ensure even the farthest point stays visible.
        this.camera.near = Math.max(clampedPullBack * 0.01, 0.1);
        this.camera.far  = clampedPullBack * 4;
        this.camera.updateProjectionMatrix();
    }

    // -----------------------------------------------------------------------
    // Private - memory management
    // -----------------------------------------------------------------------

    /**
     * Registers a GPU resource for deferred disposal.
     * This is the single point of truth for tracking allocations, keeping
     * disposal logic centralised and preventing leaks even if future
     * developers add new resources.
     *
     * @param resource - Any Three.js object that exposes a `dispose()` method.
     */
    private track(resource: Disposable): void {
        this.disposables.push(resource);
    }

    /**
     * Removes all children from the group, calls `.dispose()` on every
     * tracked geometry and material, then empties the tracking array.
     *
     * This must be called *before* adding new objects (in {@link plotTrajectory})
     * and *on exit* (in {@link deactivate}) to guarantee zero GPU memory leaks.
     */
    private clearScene(): void {
        // Remove every child mesh / helper from the group.
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        // Release GPU buffers and textures.
        for (const resource of this.disposables) {
            resource.dispose();
        }

        // Reset the tracking list.
        this.disposables.length = 0;
    }
}
