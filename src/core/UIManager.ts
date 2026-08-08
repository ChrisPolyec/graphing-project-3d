import type { AppMode, AppState, VectorInputs, GPSInputs } from '../interfaces';

export class UIManager {
    private state: AppState = {
        currentMode: 'VECTORS',
        loading: false,
        error: null
    };

    private btnModeVectors: HTMLButtonElement;
    private btnModeGps: HTMLButtonElement;
    private formVectors: HTMLFormElement;
    private formGps: HTMLFormElement;
    private loadingOverlay: HTMLElement;
    private notificationDiv: HTMLElement;
    private btnSubmitGps: HTMLButtonElement;

    private uiPanel: HTMLElement;
    private statusBar: HTMLElement;

    // Modal elements
    private btnInfo: HTMLButtonElement;
    private infoModal: HTMLElement;
    private btnCloseModal: HTMLButtonElement;
    private modalBody: HTMLElement;

    private btnCredits: HTMLButtonElement;
    private creditsModal: HTMLElement;
    private btnCloseCredits: HTMLButtonElement;

    public onVectorSubmit?: (inputs: VectorInputs) => void;
    public onGpsSubmit?: (inputs: GPSInputs) => void;
    public onModeChange?: (mode: AppMode) => void;
    public onHome?: () => void;

    constructor() {
        this.btnModeVectors = document.getElementById('btn-mode-vectors') as HTMLButtonElement;
        this.btnModeGps = document.getElementById('btn-mode-gps') as HTMLButtonElement;
        this.formVectors = document.getElementById('form-vectors') as HTMLFormElement;
        this.formGps = document.getElementById('form-gps') as HTMLFormElement;
        this.loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
        this.notificationDiv = document.getElementById('notification') as HTMLElement;
        this.btnSubmitGps = document.getElementById('btn-submit-gps') as HTMLButtonElement;

        // Init new elements
        this.uiPanel = document.getElementById('ui-panel') as HTMLElement;
        this.statusBar = document.getElementById('status-bar') as HTMLElement;

        this.btnInfo = document.getElementById('btn-info') as HTMLButtonElement;
        this.infoModal = document.getElementById('info-modal') as HTMLElement;
        this.btnCloseModal = document.getElementById('btn-close-modal') as HTMLButtonElement;
        this.modalBody = document.getElementById('modal-body') as HTMLElement;

        this.btnCredits = document.getElementById('btn-credits') as HTMLButtonElement;
        this.creditsModal = document.getElementById('credits-modal') as HTMLElement;
        this.btnCloseCredits = document.getElementById('btn-close-credits') as HTMLButtonElement;

        this.initEventListeners();
    }

    private initEventListeners() {
        this.btnModeVectors.addEventListener('click', () => this.setMode('VECTORS'));
        this.btnModeGps.addEventListener('click', () => this.setMode('GPS'));

        this.formVectors.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVectorSubmit();
        });

        this.formGps.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGpsSubmit();
        });

        // Modal listeners
        this.btnInfo.addEventListener('click', () => this.showInfoModal());
        this.btnCloseModal.addEventListener('click', () => this.hideInfoModal());
        this.infoModal.addEventListener('click', (e) => {
            if (e.target === this.infoModal) {
                this.hideInfoModal();
            }
        });

        // Credits listeners
        this.btnCredits.addEventListener('click', () => this.showCreditsModal());
        this.btnCloseCredits.addEventListener('click', () => this.hideCreditsModal());
        this.creditsModal.addEventListener('click', (e) => {
            if (e.target === this.creditsModal) {
                this.hideCreditsModal();
            }
        });
    }

    private setMode(mode: AppMode) {
        // Force the mode to apply even if it's the current one in case we come from Home
        this.state.currentMode = mode;

        if (mode === 'VECTORS') {
            this.btnModeVectors.classList.add('active');
            this.btnModeGps.classList.remove('active');
            this.formVectors.classList.remove('hidden');
            this.formGps.classList.add('hidden');
        } else {
            this.btnModeGps.classList.add('active');
            this.btnModeVectors.classList.remove('active');
            this.formGps.classList.remove('hidden');
            this.formVectors.classList.add('hidden');
        }

        if (this.onModeChange) {
            this.onModeChange(mode);
        }

        // Hide status bar when switching modes
        this.hideStatusBar();
    }

    private handleVectorSubmit() {
        const magInput = document.getElementById('vec-magnitude') as HTMLInputElement;
        const eleInput = document.getElementById('vec-elevation') as HTMLInputElement;
        const aziInput = document.getElementById('vec-azimuth') as HTMLInputElement;

        const magnitude = parseFloat(magInput.value);
        const elevationAngle = parseFloat(eleInput.value);
        const azimuthAngle = parseFloat(aziInput.value);

        if (isNaN(magnitude) || isNaN(elevationAngle) || isNaN(azimuthAngle)) {
            // Browsers usually prevent submission with empty/invalid inputs due to "required" and type="number"
            return;
        }

        let hasError = false;

        if (magnitude <= 0) {
            this.highlightInputError('vec-magnitude', 'La magnitud debe ser mayor a 0.');
            hasError = true;
        }

        if (elevationAngle < 0 || elevationAngle > 90) {
            this.highlightInputError('vec-elevation', 'El ángulo debe estar entre 0 y 90 grados.');
            hasError = true;
        }

        if (hasError) return;

        if (this.onVectorSubmit) {
            this.onVectorSubmit({ magnitude, elevationAngle, azimuthAngle });
        }
    }

    private handleGpsSubmit() {
        const latInput = document.getElementById('gps-lat') as HTMLInputElement;
        const lngInput = document.getElementById('gps-lng') as HTMLInputElement;

        const latitude = parseFloat(latInput.value);
        const longitude = parseFloat(lngInput.value);

        if (isNaN(latitude) || isNaN(longitude)) {
            return;
        }

        let hasError = false;

        if (latitude < -90 || latitude > 90) {
            this.highlightInputError('gps-lat', 'La latitud debe estar entre -90 y 90 grados.');
            hasError = true;
        }

        if (longitude < -180 || longitude > 180) {
            this.highlightInputError('gps-lng', 'La longitud debe estar entre -180 y 180 grados.');
            hasError = true;
        }

        if (hasError) return;

        if (this.onGpsSubmit) {
            this.onGpsSubmit({ latitude, longitude });
        }
    }

    public showLoading() {
        this.state.loading = true;
        this.loadingOverlay.classList.add('visible');
        this.btnSubmitGps.disabled = true;
    }

    public hideLoading() {
        this.state.loading = false;
        this.loadingOverlay.classList.remove('visible');
        this.btnSubmitGps.disabled = false;
    }

    public showError(message: string) {
        this.notificationDiv.textContent = message;
        this.notificationDiv.classList.add('show');
        setTimeout(() => {
            this.notificationDiv.classList.remove('show');
        }, 4000);
    }

    public updateStatusBar(lat: number, lng: number) {
        const formattedLat = lat.toFixed(4);
        const formattedLng = lng.toFixed(4);
        this.statusBar.textContent = `Latitud: ${formattedLat}°, Longitud: ${formattedLng}°`;
        this.showStatusBar();
    }

    public showStatusBar() {
        if (this.state.currentMode === 'GPS') {
            this.statusBar.classList.remove('hidden');
        }
    }

    public hideStatusBar() {
        this.statusBar.classList.add('hidden');
    }

    public setGpsInputs(lat: number, lng: number) {
        const latInput = document.getElementById('gps-lat') as HTMLInputElement;
        const lngInput = document.getElementById('gps-lng') as HTMLInputElement;
        latInput.value = lat.toFixed(4);
        lngInput.value = lng.toFixed(4);
    }

    private highlightInputError(inputId: string, message: string) {
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (!input) return;
        
        input.classList.add('input-error');
        
        const small = input.nextElementSibling;
        if (small && small.tagName === 'SMALL') {
            if (!small.hasAttribute('data-original')) {
                small.setAttribute('data-original', small.textContent || '');
            }
            small.textContent = message;
            small.classList.add('error-text');
        }

        const onInput = () => {
            input.classList.remove('input-error');
            if (small && small.tagName === 'SMALL') {
                small.textContent = small.getAttribute('data-original') || '';
                small.classList.remove('error-text');
            }
            input.removeEventListener('input', onInput);
        };
        input.addEventListener('input', onInput);
    }

    private showInfoModal() {
        if (this.state.currentMode === 'VECTORS') {
            this.modalBody.innerHTML = `
                <p><strong>Modo Vectores 3D</strong></p>
                <p style="margin-top: 8px;">Este módulo te permite visualizar la trayectoria parabólica de un proyectil en un espacio tridimensional. Para usarlo, debes definir tres parámetros fundamentales:</p>
                <ul>
                    <li><strong>Magnitud (Velocidad Inicial):</strong> Es la fuerza o rapidez con la que se lanza el proyectil. Debe ser mayor a 0 (ej. 50 m/s). A mayor magnitud, más lejos llegará.</li>
                    <li><strong>Ángulo de Elevación:</strong> Determina la inclinación vertical del lanzamiento. Debe estar entre <strong>0° y 90°</strong>. (Ej. 45° suele dar el alcance máximo).</li>
                    <li><strong>Ángulo de Azimut:</strong> Controla la rotación horizontal (hacia dónde apunta en el mapa). 0° apunta al eje X.</li>
                </ul>
                <p style="color: #bbb;"><em>Una vez ingresados los datos, haz clic en "Graficar trayectoria 3D" y el motor matemático calculará la parábola perfecta para renderizarla.</em></p>
            `;
        } else {
            this.modalBody.innerHTML = `
                <p><strong>Modo GPS 3D</strong></p>
                <p style="margin-top: 8px;">Este módulo interactivo te permite explorar nuestro planeta y encontrar la altitud exacta de cualquier punto geográfico utilizando una API satelital.</p>
                <ul>
                    <li><strong>Exploración Libre:</strong> Utiliza el clic izquierdo para rotar la Tierra y la rueda del ratón para acercarte o alejarte.</li>
                    <li><strong>Rastreo en Vivo:</strong> Al pasar el cursor sobre la superficie del globo, la barra de estado inferior mostrará las coordenadas exactas de esa posición en tiempo real.</li>
                    <li><strong>Selección Rápida:</strong> Haz <strong>clic</strong> sobre cualquier país o región para autocompletar automáticamente el formulario de Latitud y Longitud.</li>
                </ul>
                <p style="color: #bbb;"><em>Al hacer clic en "Ubicar", el sistema obtendrá la altura real sobre el nivel del mar de esa zona, y colocará un marcador exacto.</em></p>
            `;
        }
        this.infoModal.classList.remove('hidden');
    }

    private hideInfoModal() {
        this.infoModal.classList.add('hidden');
    }

    private showCreditsModal() {
        this.creditsModal.classList.remove('hidden');
    }

    private hideCreditsModal() {
        this.creditsModal.classList.add('hidden');
    }
}
