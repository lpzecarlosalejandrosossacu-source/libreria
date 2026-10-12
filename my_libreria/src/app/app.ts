import {
  Component,
  ElementRef,
  Inject,
  PLATFORM_ID,
  viewChild,
  signal,
  afterNextRender,
  OnDestroy
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  // Canvas container reference
  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('canvasContainer');

  // UI State Signals
  readonly isLoading = signal(true);
  readonly showLogin = signal(true);
  readonly isAutoRotating = signal(true);
  readonly isFullscreen = signal(false);
  readonly showPassword = signal(false);
  readonly activeTab = signal<'login' | 'register'>('login');
  readonly isLoggedIn = signal(false);
  readonly loginSuccessMessage = signal('');

  // Form Fields
  email = '';
  password = '';
  rememberMe = true;
  fullName = '';
  confirmPassword = '';

  // Three.js instances
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private sphereMesh?: THREE.Mesh;
  private animationFrameId?: number;

  // Camera navigation coordinates & damping
  private isUserInteracting = false;
  private onPointerDownPointerX = 0;
  private onPointerDownPointerY = 0;
  private onPointerDownLon = 0;
  private onPointerDownLat = 0;

  private lon = 0;
  private lat = 0;
  private targetLon = 0;
  private targetLat = 0;

  // Bound event handlers for clean removal
  private boundOnPointerDown = this.onPointerDown.bind(this);
  private boundOnPointerMove = this.onPointerMove.bind(this);
  private boundOnPointerUp = this.onPointerUp.bind(this);
  private boundOnWheel = this.onWheel.bind(this);
  private boundOnWindowResize = this.onWindowResize.bind(this);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    // Only execute WebGL in browser environment (SSR safe)
    afterNextRender(() => {
      this.initThree();
    });
  }

  private initThree(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const container = this.containerRef()?.nativeElement;
    if (!container) return;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 1, 1200);
    this.camera.position.set(0, 0, 0);

    // 3. Renderer with high-DPI support and antialiasing
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // 4. Geometry & Panorama Texture
    // 500 radius sphere; scale(-1, 1, 1) inverts normals so texture renders inside
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      'panorama.jpg',
      () => {
        this.isLoading.set(false);
      },
      undefined,
      (error) => {
        console.error('Error loading 360 panorama texture:', error);
        this.isLoading.set(false);
      }
    );

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const material = new THREE.MeshBasicMaterial({ map: texture });
    this.sphereMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphereMesh);

    // 5. Setup interaction listeners on the container & window
    window.addEventListener('resize', this.boundOnWindowResize);
    window.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
    window.addEventListener('wheel', this.boundOnWheel, { passive: false });

    // 6. Start animation loop
    this.animate();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Auto-rotate panorama slowly when user is not actively dragging
    if (this.isAutoRotating() && !this.isUserInteracting) {
      this.targetLon += 0.08;
    }

    // Smooth inertia / damping interpolation
    this.lon += (this.targetLon - this.lon) * 0.1;
    this.lat += (this.targetLat - this.lat) * 0.1;

    // Clamp latitude to avoid pole flipping
    this.lat = Math.max(-85, Math.min(85, this.lat));
    this.targetLat = Math.max(-85, Math.min(85, this.targetLat));

    const phi = THREE.MathUtils.degToRad(90 - this.lat);
    const theta = THREE.MathUtils.degToRad(this.lon);

    const targetX = 500 * Math.sin(phi) * Math.cos(theta);
    const targetY = 500 * Math.cos(phi);
    const targetZ = 500 * Math.sin(phi) * Math.sin(theta);

    if (this.camera) {
      this.camera.lookAt(targetX, targetY, targetZ);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private onPointerDown(event: PointerEvent): void {
    // If clicking directly on an interactive button or input inside card, don't drag camera
    const targetEl = event.target as HTMLElement;
    if (targetEl && (targetEl.closest('input') || targetEl.closest('button') || targetEl.closest('a'))) {
      return;
    }

    this.isUserInteracting = true;
    this.onPointerDownPointerX = event.clientX;
    this.onPointerDownPointerY = event.clientY;
    this.onPointerDownLon = this.targetLon;
    this.onPointerDownLat = this.targetLat;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isUserInteracting) return;

    const deltaX = event.clientX - this.onPointerDownPointerX;
    const deltaY = event.clientY - this.onPointerDownPointerY;

    // 0.15 factor for smooth sensitivity
    this.targetLon = this.onPointerDownLon - deltaX * 0.15;
    this.targetLat = this.onPointerDownLat + deltaY * 0.15;
  }

  private onPointerUp(): void {
    this.isUserInteracting = false;
  }

  private onWheel(event: WheelEvent): void {
    if (!this.camera) return;

    // Adjust camera field-of-view for optical zoom
    const zoomDelta = event.deltaY * 0.05;
    this.camera.fov = Math.max(30, Math.min(100, this.camera.fov + zoomDelta));
    this.camera.updateProjectionMatrix();
  }

  private onWindowResize(): void {
    if (!this.camera || !this.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Camera & Viewer Controls
  toggleAutoRotate(): void {
    this.isAutoRotating.update((v) => !v);
  }

  toggleLoginCard(): void {
    this.showLogin.update((v) => !v);
  }

  zoomIn(): void {
    if (!this.camera) return;
    this.camera.fov = Math.max(30, this.camera.fov - 8);
    this.camera.updateProjectionMatrix();
  }

  zoomOut(): void {
    if (!this.camera) return;
    this.camera.fov = Math.min(100, this.camera.fov + 8);
    this.camera.updateProjectionMatrix();
  }

  resetView(): void {
    this.targetLon = 0;
    this.targetLat = 0;
    if (this.camera) {
      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();
    }
  }

  toggleFullscreen(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
      this.isFullscreen.set(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      this.isFullscreen.set(false);
    }
  }

  // Form Interactions
  setTab(tab: 'login' | 'register'): void {
    this.activeTab.set(tab);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  handleLogin(event: Event): void {
    event.preventDefault();
    if (!this.email || !this.password) return;

    this.isLoggedIn.set(true);
    const username = this.email.split('@')[0] || 'Usuario';
    this.loginSuccessMessage.set(`¡Bienvenido al Recorrido 360°, ${username}!`);
  }

  handleLogout(): void {
    this.isLoggedIn.set(false);
    this.loginSuccessMessage.set('');
    this.password = '';
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.boundOnWindowResize);
    window.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    window.removeEventListener('wheel', this.boundOnWheel);

    if (this.sphereMesh) {
      this.sphereMesh.geometry.dispose();
      if (Array.isArray(this.sphereMesh.material)) {
        this.sphereMesh.material.forEach((m) => m.dispose());
      } else {
        this.sphereMesh.material.dispose();
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
