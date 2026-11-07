# PlanMap - Dark Pro & Cyber Neon

Transformación integral de **PlanMap** hacia una estética **Dark Pro** de alto rendimiento con fondo ultra oscuro (`#0A0C0B`), tarjetas en grafito profundo (`#161A18`), bordes sutiles con translucidez (`rgba(255,255,255,0.08)`) y acentos de alto impacto en **Verde Neón profesional (#CCFF00)**. Se introduce una pantalla de bienvenida cinematográfica con llamada a la acción hacia el mapa en vivo.

---

## Decisiones Críticas y Confirmaciones del Usuario

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario en Fase 1**:
> - **Estilo Dark Pro & Neón**: Se adapta toda la aplicación a la paleta oscura con acentos verde neón (`#CCFF00`), incluyendo mapa con filtro oscuro de alto contraste y tarjetas glassmorphic.
> - **Pantalla de Bienvenida al Inicio**: La aplicación recibe al usuario con la nueva **Vista 0: Bienvenida**, con tarjeta cinematográfica y botón neón vibrante (*"Explorar Mapa en Vivo →"*).
> - **Flujo Completo sin Cortes**: Se completan e integran todas las vistas (Bienvenida, Mapa Vivo, Crear Plan, Sala de Invitación y Recuerdo Colectivo) sin interrupciones de código.

---

## 1. Visión General y Concepto Central

- **Qué hace**: PlanMap Dark Pro ofrece una experiencia táctil nocturna y moderna para planificar salidas y encuentros en persona. Comienza con una pantalla de bienvenida que introduce el concepto, da paso a un mapa en vivo en modo oscuro inmersivo, permite armar planes en segundos con vibes visuales y remata con recuerdos colectivos descargables.
- **Audiencia objetivo**: Grupos de amigos, universitarios y personas activas que aprecian el diseño de aplicaciones oscuras premium (estilo Linear, Arc, Spotify o Nike Run).
- **Valor diferencial**: Estética visualmente impactante, contraste WCAG garantizado, feedback táctil inmediato y cero distracciones.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujo de Vistas
1. **Vista 0: Bienvenida (`view-welcome`)**:
   - Tarjeta hero visual (`welcome-hero-card`) con fotografía cinematográfica urbana y degradado inferior.
   - Titular: *"Conecta en el mundo real. Vive experiencias compartidas."*
   - Subtítulo explicativo en gris atenuado (`#8A9590`).
   - Botón Neón de alto impacto: `Explorar Mapa en Vivo →` (`btn-neon` con `#CCFF00` y tipografía 800).

2. **Vista 1: Mapa Vivo Dark Pro (`view-map`)**:
   - Mapa a pantalla completa con Leaflet filtrado en escala oscura de alto contraste (`invert(100%) hue-rotate(180deg)`).
   - Encabezado flotante: Píldora de marca `PlanMap ✨` con fondo traslúcido y botón circular de recuerdos `🖼️`.
   - Píldora inferior flotante: `¿Cuál es el plan hoy? →` con animación táctil para abrir la creación del plan.

3. **Vista 2: Crear Plan (`view-create`)**:
   - Vista sólida en `#0A0C0B` con `← Cancelar` y contador `Paso 1 de 2` en verde neón.
   - Campo para el título del plan con foco neón.
   - Cuadrícula de 4 Vibes:
     - ☕ **Chill**
     - 👟 **Energía**
     - 🌳 **Aire libre**
     - 🌙 **Nocturno**
   - Estado seleccionado: Borde verde neón brillante (`#CCFF00`) y fondo tenue `#CCFF0012`.
   - Botón: `Armar enlace de invitación` (`btn-neon`).

4. **Vista 3: Sala de Invitación (`view-invite`)**:
   - Encabezado con `✕ Cerrar` y distintivo neón `Plan Activo`.
   - Titular: `¡Plan listo para rodar! 🔥`.
   - Tarjeta con borde punteado verde neón para copiar el enlace de WhatsApp (`planmap.app/join/x9f2`).
   - Lista visual de amigos en camino con avatares circulares oscuros.
   - Botón: `Volver al Mapa Vivo`.

5. **Vista 4: Recuerdo Colectivo / Postal (`view-memory`)**:
   - Encabezado con `← Volver al Mapa` y título `Recuerdo Colectivo`.
   - Postal oscura con degradado grafito (`#161A18` a `#0A0C0B`), matasellos neón y foto de portada.
   - Cita compartida y firmas manuscritas del grupo.
   - Botones para `Guardar Postal` (descarga PNG con Canvas) y `Compartir`.

### Paleta Dark Pro
- `--bg-dark`: `#0A0C0B`
- `--card-dark`: `#161A18`
- `--card-border`: `rgba(255, 255, 255, 0.08)`
- `--text-white`: `#FFFFFF`
- `--text-gray`: `#8A9590`
- `--accent-neon`: `#CCFF00` (Verde neón vibrante)
- `--accent-neon-hover`: `#B5E600`
- Fondo general de la pantalla externa: `#030404`

---

## 3. Decisiones de Producto y Arquitectura

1. **Gestión de Transición y Mapa Leaflet**:
   - El mapa se inicializa y preserva en el DOM sin recargas destructivas; al cambiar desde o hacia `view-welcome`, `view-create`, `view-invite` o `view-memory`, se ejecuta `map.invalidateSize()`.
2. **Cumplimiento de Ergonomía Táctil**:
   - Touch targets de mínimo 44px para todos los botones e iconos.
   - Píldora de acción principal ubicada en la zona natural de alcance del pulgar (40% inferior de la pantalla).
3. **Persistencia y Exportación**:
   - Exportador Canvas actualizado para generar postales en estética Dark Pro con tipografía caligráfica y resolución nítida.

---

## 4. Diagrama de Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                 PlanMap (App Dark Frame)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌─────────────────┐
│ view-welcome │       │   view-map   │       │   Solid Views   │
│ • Hero Card  │       │ • Leaflet    │       │ ├── view-create │
│ • Neon CTA   │       │   (Dark)     │       │ ├── view-invite │
└──────────────┘       │ • Top Pill   │       │ └── view-memory │
                       │ • Action CTA │       └─────────────────┘
                       └──────────────┘
```

---

## Verificación y Validación Prevista
- Actualización de `src/index.css` con las variables `--bg-dark`, `--card-dark`, `--accent-neon`, etc.
- Implementación de `src/App.tsx` integrando las 5 vistas (`welcome`, `map`, `create`, `invite`, `memory`).
- Actualización de `src/utils/postcardCanvas.ts` para soporte de exportación Dark Pro.
- Verificación con `compile_applet` y `lint_applet`.
