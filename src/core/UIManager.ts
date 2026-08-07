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

    // New Home Screen elements
    private homeScreen: HTMLElement;
    private uiPanel: HTMLElement;
    private btnStartVectors: HTMLButtonElement;
    private btnStartGps: HTMLButtonElement;
    private btnBackHome: HTMLButtonElement;

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
        this.homeScreen = document.getElementById('home-screen') as HTMLElement;
        this.uiPanel = document.getElementById('ui-panel') as HTMLElement;
        this.btnStartVectors = document.getElementById('btn-start-vectors') as HTMLButtonElement;
        this.btnStartGps = document.getElementById('btn-start-gps') as HTMLButtonElement;
        this.btnBackHome = document.getElementById('btn-back-home') as HTMLButtonElement;

        this.initEventListeners();
    }

    private initEventListeners() {
        this.btnModeVectors.addEventListener('click', () => this.setMode('VECTORS'));
        this.btnModeGps.addEventListener('click', () => this.setMode('GPS'));

        // Home screen listeners
        this.btnStartVectors.addEventListener('click', () => this.startMode('VECTORS'));
        this.btnStartGps.addEventListener('click', () => this.startMode('GPS'));
        this.btnBackHome.addEventListener('click', () => this.goHome());

        this.formVectors.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVectorSubmit();
        });

        this.formGps.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGpsSubmit();
        });
    }

    private startMode(mode: AppMode) {
        this.homeScreen.classList.remove('visible');
        this.uiPanel.classList.remove('hidden');
        this.setMode(mode);
    }

    private goHome() {
        this.homeScreen.classList.add('visible');
        this.uiPanel.classList.add('hidden');
        if (this.onHome) {
            this.onHome();
        }
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
    }

    private handleVectorSubmit() {
        const magInput = document.getElementById('vec-magnitude') as HTMLInputElement;
        const eleInput = document.getElementById('vec-elevation') as HTMLInputElement;
        const aziInput = document.getElementById('vec-azimuth') as HTMLInputElement;

        const magnitude = parseFloat(magInput.value);
        const elevationAngle = parseFloat(eleInput.value);
        const azimuthAngle = parseFloat(aziInput.value);

        if (isNaN(magnitude) || isNaN(elevationAngle) || isNaN(azimuthAngle)) {
            this.showError('Por favor, ingresa números válidos para los vectores.');
            return;
        }

        if (magnitude <= 0) {
            this.showError('La magnitud (velocidad) debe ser mayor a 0.');
            return;
        }

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
            this.showError('Por favor, ingresa latitud y longitud válidas.');
            return;
        }

        if (latitude < -90 || latitude > 90) {
            this.showError('La latitud debe estar entre -90 y 90 grados.');
            return;
        }

        if (longitude < -180 || longitude > 180) {
            this.showError('La longitud debe estar entre -180 y 180 grados.');
            return;
        }

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
}
