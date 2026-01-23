# 🏥 Sistema Bienestar APS - Control de Cupones de Gas

Sistema web profesional con autenticación Firebase para gestionar cupones de gas Abastible y Lipigas. Diseñado específicamente para Bienestar APS con colores armónicos de salud y máxima seguridad.

## 🎨 **Características del Nuevo Diseño**

### **Paleta de Salud Armónica:**
- 🟢 **Verde Salud** (#10b981) - Color principal profesional
- 🔵 **Azul Confianza** (#3b82f6) - Transmite seguridad
- 🔵 **Cyan Suave** (#06b6d4) - Acentos elegantes
- ⚪ **Grises Suaves** - Neutros armónicos
- ✨ **Efectos de brillo** en botones y hover

### **Tipografía Profesional:**
- **Inter** - Texto principal (alta legibilidad)
- **Nunito** - Títulos y encabezados (amigable)
- Pesos variables para jerarquía visual perfecta

## 🔐 **Sistema de Autenticación Firebase**

### **Credenciales de Administrador:**
- **Email:** `Bienestar.aps@cmpuentealto.cl`
- **Contraseña:** `20BAPS25`

### **Funcionalidades de Seguridad:**
- ✅ **Login seguro** con Firebase Authentication
- ✅ **Cambio de contraseña** desde el panel admin
- ✅ **Manejo de sesiones** automático
- ✅ **Protección de rutas** administrativas
- ✅ **Validación de errores** específicos
- ✅ **Re-autenticación** para cambios sensibles

### **Estados de Autenticación:**
- 🔒 **No autenticado**: Solo consulta de cupones
- 🔓 **Autenticado**: Acceso completo al panel admin
- 📊 **Panel Administrativo**: Subir/eliminar archivos Excel

## 🚀 **Instalación y Configuración**

### **1. Configuración Firebase (YA INCLUIDA)**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA-bEoWVhR9osz4dxHKylIr7D5e883RRkQ",
  authDomain: "bienestaraps-gas.firebaseapp.com",
  projectId: "bienestaraps-gas",
  storageBucket: "bienestaraps-gas.firebasestorage.app",
  messagingSenderId: "485053786858",
  appId: "1:485053786858:web:f916fa9d03c8ca9cdc4593",
  measurementId: "G-77C4Z6XRSV"
};
```

### **2. Despliegue en GitHub Pages**
```bash
# 1. Crear repositorio
git init
git add bienestar-gas-system.html
git commit -m "Sistema Bienestar APS con Firebase Auth"

# 2. Conectar a GitHub
git remote add origin https://github.com/tu-usuario/bienestar-gas.git
git push -u origin main

# 3. Activar GitHub Pages
# Settings → Pages → Deploy from branch "main"
```

### **3. Configuración del Usuario Administrativo**
**IMPORTANTE:** Antes de usar el sistema, debe crear el usuario administrador en Firebase:

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar proyecto `bienestaraps-gas`
3. Authentication → Users → Add user
4. **Email:** `Bienestar.aps@cmpuentealto.cl`
5. **Password:** `20BAPS25`

## 📋 **Guía de Uso Completa**

### **Para Afiliados (Sin autenticación):**
1. **Ingresar RUT** con formato: `12345678-9`
2. **Validación automática** del dígito verificador
3. **Ver resultados** con cupones usados y disponibles
4. **Información detallada** por tipo de gas y cilindro

### **Para Administradores:**
1. **Hacer clic** en "🔐 Acceso Administrativo"
2. **Iniciar sesión** con credenciales institucionales
3. **Panel completo** con opciones de gestión:
   - 📤 **Subir archivos Excel** nuevos
   - 🗑️ **Eliminar archivos** antiguos
   - 🔑 **Cambiar contraseña** de seguridad
   - 🚪 **Cerrar sesión** segura

### **Cambio de Contraseña:**
1. Desde el panel admin → **"🔑 Cambiar Contraseña"**
2. Ingresar **contraseña actual**: `20BAPS25`
3. Definir **nueva contraseña** (mínimo 6 caracteres)
4. Confirmar cambio → **¡Listo!**

## 📊 **Formato de Archivos Excel**

### **Estructura Requerida (3 hojas):**

#### **Hoja "BASE DE DATOS":**
```
| Nº | RUT | NOMBRES | APELLIDOS | ESTABLECIMIENTO |
|----|-----|---------|-----------|-----------------|
| 1  | 12345678-9 | JUAN | PÉREZ | CONS. EJEMPLO |
```

#### **Hoja "GENERAL":**
```
| FECHA | RUT AFILIADO | NOMBRES | APELLIDOS | CONCEPTO | 05 KILOS | 11 KILOS | 15 KILOS | 45 KILOS |
|-------|--------------|---------|-----------|----------|----------|----------|----------|----------|
| 2026-01-15 | 12345678-9 | JUAN | PÉREZ | LIPIGAS | 1 | 0 | 1 | 0 |
```

#### **Hoja "CUPONES DISPONIBLES":**
Hoja de configuración (opcional, para resúmenes)

## 🛡️ **Seguridad y Privacidad**

### **Medidas de Protección:**
- 🔒 **Firebase Authentication** para acceso administrativo
- 🔐 **Encriptación** de credenciales en tránsito
- 💾 **Almacenamiento local** (sin envío a servidores)
- 🚫 **Sin logs** de RUT o datos personales
- ⚡ **Sesiones temporales** con logout automático

### **Buenas Prácticas:**
- ✅ Cambiar contraseña periódicamente
- ✅ Cerrar sesión después de usar el panel admin
- ✅ No compartir credenciales de acceso
- ✅ Verificar archivos Excel antes de subir

## 🎯 **Límites y Configuración**

### **Límites Mensuales por Defecto:**
- **5kg**: 4 cupones/mes
- **11kg**: 3 cupones/mes  
- **15kg**: 2 cupones/mes
- **45kg**: 1 cupón/mes

### **Configuraciones Avanzadas:**
```javascript
// Modificar límites en el código
const monthlyLimits = {
    lipigas: { '5': 4, '11': 3, '15': 2, '45': 1 },
    abastible: { '5': 4, '11': 3, '15': 2, '45': 1 }
};
```

## 🔧 **Personalización de Colores**

### **Variables CSS de Salud:**
```css
:root {
    --health-primary: #10b981;   /* Verde salud */
    --health-secondary: #3b82f6; /* Azul confianza */
    --health-accent: #06b6d4;    /* Cyan suave */
    --health-success: #22c55e;   /* Verde éxito */
    --health-warning: #f59e0b;   /* Amarillo cálido */
    --health-error: #ef4444;     /* Rojo suave */
}
```

## 📱 **Compatibilidad y Rendimiento**

### **Navegadores Soportados:**
- ✅ **Chrome 80+** (recomendado)
- ✅ **Firefox 75+**
- ✅ **Safari 13+**
- ✅ **Edge 80+**
- ✅ **Móviles iOS/Android**

### **Rendimiento:**
- ⚡ **Carga rápida** (<3 segundos)
- 📱 **Responsive** completo
- 🔄 **Offline** para consultas (datos cargados)
- 💾 **Almacenamiento eficiente**

## 🆘 **Resolución de Problemas**

### **Problemas de Autenticación:**
```
❌ "Credenciales incorrectas"
→ Verificar email y contraseña exactos

❌ "Demasiados intentos"
→ Esperar 15 minutos y reintentar

❌ "Error de conexión"
→ Verificar conexión a internet
```

### **Problemas con Excel:**
```
❌ "Error al procesar archivo"
→ Verificar 3 hojas: BASE DE DATOS, GENERAL, CUPONES DISPONIBLES

❌ "RUT no encontrado"
→ Verificar que el archivo tenga datos actualizados
→ Revisar formato de RUT en Excel
```

### **Problemas de Interfaz:**
```
❌ Diseño no se ve correctamente
→ Recargar página (Ctrl+F5)
→ Actualizar navegador

❌ Firebase no carga
→ Verificar conexión a internet
→ Revisar consola de desarrollador (F12)
```

## 📞 **Soporte Técnico**

### **Contacto Bienestar APS:**
- 📧 **Email:** Bienestar.aps@cmpuentealto.cl
- 🏥 **Institución:** Centro Médico Puente Alto
- ⏰ **Horario:** Lunes a Viernes, 8:00 - 17:00

### **Documentación Técnica:**
- 🔥 [Firebase Documentation](https://firebase.google.com/docs)
- 📚 [Excel Processing Guide](ejemplo-formato-excel.md)
- 🎨 [Customization Guide](personalizacion.md)

## 📈 **Actualizaciones y Versiones**

### **v2.0 - Bienestar APS Edition**
- ✅ **Firebase Authentication** integrado
- ✅ **Diseño de salud** armónico
- ✅ **Cambio de contraseña** seguro
- ✅ **Validaciones mejoradas**
- ✅ **UX optimizada** para móviles

### **Próximas Actualizaciones:**
- 📊 **Dashboard** con estadísticas
- 📧 **Notificaciones** por email
- 📱 **App móvil** nativa
- 🔄 **Sincronización** en tiempo real

## 📄 **Licencia y Términos**

Este sistema es de **uso exclusivo** para Bienestar APS - Centro Médico Puente Alto. 

**Términos de Uso:**
- ✅ Uso interno de la institución
- ✅ Modificación con autorización
- ❌ Redistribución sin permiso
- ❌ Uso comercial externo

---

**🏥 Desarrollado para Bienestar APS con ❤️ por el equipo de tecnología**

**Sistema de Cupones de Gas v2.0 - Enero 2026**
