# libreria - Entorno Virtual 360° con Login

Proyecto interactivo para la materia **Programación Gráfica y Multimedia II**.

## 🌟 Descripción

Este proyecto presenta una experiencia inmersiva panorámica en **360 grados** utilizando **Three.js**, combinada con una tarjeta central flotante de **Inicio de Sesión (Login)** con estilo **Glassmorphism** (efecto de vidrio translúcido).

### ✨ Características
- **Recorrido Panorámico 360°**: Proyección equirectangular sobre una esfera 3D con textura de alta definición.
- **Controles de Cámara**:
  - Arrastrar para rotar la vista libremente con amortiguación e inercia.
  - Zoom con la rueda del ratón o botones en pantalla.
  - Giro automático continuo (activable/desactivable).
  - Centrado de cámara hacia el templo sagrado.
  - Modo Pantalla Completa.
- **Interfaz de Login en el Centro**:
  - Estilo Glassmorphism con desenfoque de fondo y diseño moderno.
  - Pestañas de *Iniciar Sesión* y *Registrarse*.
  - Mostrar/Ocultar contraseña.
  - Botón para ocultar/minimizar la interfaz y explorar el entorno 360° sin distracciones.
  - Accesos directos de prueba (Demo Alumno / Docente).

## 🚀 Estructura del Proyecto

- `index.html`: Versión directa y standalone con Three.js que puedes abrir directamente en cualquier navegador o mediante Live Server.
- `panorama.jpg`: Fotografía panorámica equirectangular del templo.
- `my_libreria/`: Aplicación completa construida con **Angular 22** y **Three.js**.

## 💻 Ejecución

### Opción 1: Visor Directo (Standalone)
Abre `index.html` con la extensión **Live Server** de VS Code o ejecutando:
```bash
npx serve .
```

### Opción 2: Proyecto Angular
```bash
cd my_libreria
npm install
npm start
```
Luego visita `http://localhost:4200`.
