# 🔥 Sistema de Cupones de Gas

Sistema web para gestionar cupones de gas Abastible y Lipigas. Permite a los afiliados consultar sus cupones disponibles y usados, y a los administradores cargar archivos Excel con la información actualizada.

## 🌟 Características

- **Consulta por RUT**: Los afiliados pueden buscar sus cupones disponibles ingresando su RUT
- **Validación de RUT chileno**: Validación automática del formato y dígito verificador
- **Soporte para ambas marcas**: Abastible y Lipigas
- **Diferentes tamaños de cilindro**: 5kg, 11kg, 15kg y 45kg
- **Panel administrativo**: Para subir archivos Excel actualizados
- **Almacenamiento local**: Los datos se guardan en el navegador
- **Interfaz responsiva**: Funciona en desktop y móvil
- **Diseño moderno**: Interfaz atractiva y fácil de usar

## 🚀 Instalación en GitHub Pages

1. **Crear repositorio en GitHub**:
   - Crea un nuevo repositorio público en GitHub
   - Nombra el repositorio (ej: `sistema-cupones-gas`)

2. **Subir archivos**:
   ```bash
   git clone https://github.com/tu-usuario/sistema-cupones-gas.git
   cd sistema-cupones-gas
   ```

3. **Copiar todos los archivos del sistema**:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `excel-processor.js`
   - `README.md`

4. **Publicar en GitHub Pages**:
   ```bash
   git add .
   git commit -m "Sistema de cupones de gas inicial"
   git push origin main
   ```

5. **Activar GitHub Pages**:
   - Ve a Settings > Pages en tu repositorio
   - Selecciona "Deploy from a branch"
   - Selecciona "main" branch
   - La página estará disponible en: `https://tu-usuario.github.io/sistema-cupones-gas`

## 📋 Formato del Archivo Excel

El sistema espera un archivo Excel (.xlsx) con **3 hojas específicas**:

### Hoja 1: "BASE DE DATOS"
Contiene la información de los afiliados:
```
| Nº | RUT | NOMBRE | ESTABLECIMIENTO | ... |
|----|-----|--------|-----------------|-----|
| 1  | 12345678-9 | JUAN PÉREZ | CONS. EJEMPLO | ... |
```

### Hoja 2: "GENERAL" 
Contiene las transacciones de cupones:
```
| FECHA | RUT | RUT AFILIADO | NOMBRES | APELLIDOS | CONCEPTO | 05 KILOS | 11 KILOS | 15 KILOS | 45 KILOS | ... |
|-------|-----|--------------|---------|-----------|----------|----------|----------|----------|----------|-----|
| 2026-01-01 | 12345678-9 | 12345678-9 | JUAN | PÉREZ | LIPIGAS | 1 | 0 | 1 | 0 | ... |
```

### Hoja 3: "CUPONES DISPONIBLES"
Hoja de configuración y resumen (opcional).

## 📖 Instrucciones de Uso

### Para Afiliados:

1. **Abrir la página web** del sistema
2. **Ingresar su RUT** en el campo correspondiente
   - Formato: `12345678-9` (con guión)
   - Si el RUT es menor a 10 millones, anteponer un cero
   - Usar K mayúscula si corresponde
3. **Hacer clic en "Buscar Cupones"**
4. **Ver los resultados**:
   - Información personal
   - Cupones usados en el mes actual
   - Cupones disponibles por tipo y tamaño
5. **¡IMPORTANTE!** Eliminar el RUT del campo al terminar para proteger la privacidad

### Para Administradores:

1. **Hacer clic en "Acceso Administrativo"**
2. **Subir archivo Excel**:
   - Seleccionar archivo .xlsx con el formato correcto
   - Hacer clic en "Subir Archivo"
   - Esperar confirmación de carga exitosa
3. **Gestionar archivos**:
   - Ver archivos cargados actualmente
   - Eliminar archivos antiguos si es necesario

## ⚙️ Configuración del Sistema

### Límites Mensuales por Defecto:
- **5kg**: 4 cupones por mes
- **11kg**: 3 cupones por mes  
- **15kg**: 2 cupones por mes
- **45kg**: 1 cupón por mes

### Validaciones Implementadas:
- ✅ Formato de RUT chileno
- ✅ Dígito verificador correcto
- ✅ Archivo Excel válido
- ✅ Estructura de datos esperada

## 🔧 Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con CSS Grid y Flexbox
- **JavaScript ES6+**: Lógica de la aplicación
- **SheetJS**: Procesamiento de archivos Excel
- **LocalStorage**: Almacenamiento de datos en el navegador
- **GitHub Pages**: Hosting gratuito

## 🎨 Personalización

### Cambiar Colores:
Edita las variables CSS en `styles.css`:
```css
:root {
    --primary-blue: #1e40af;    /* Color principal Lipigas */
    --primary-orange: #ea580c;  /* Color principal Abastible */
    --accent-gas: #0ea5e9;      /* Acento gas */
    --accent-energy: #f97316;   /* Acento energía */
}
```

### Modificar Límites:
Edita la función en `script.js`:
```javascript
const monthlyLimits = {
    lipigas: { '5': 4, '11': 3, '15': 2, '45': 1 },
    abastible: { '5': 4, '11': 3, '15': 2, '45': 1 }
};
```

## 🛠️ Desarrollo Local

Para probar localmente:

1. **Clonar el repositorio**
2. **Abrir `index.html`** directamente en el navegador
   - O usar un servidor local: `python -m http.server 8000`
3. **Probar todas las funcionalidades**

## 📱 Compatibilidad

- ✅ Chrome (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Móviles (iOS/Android)

## 🔒 Seguridad y Privacidad

- Los datos se almacenan localmente en el navegador
- No hay transmisión de datos a servidores externos
- El RUT se debe eliminar manualmente por privacidad
- Los archivos Excel se procesan completamente en el cliente

## 🐛 Resolución de Problemas

### "RUT no encontrado"
- Verificar formato del RUT (con guión)
- Asegurar que el archivo Excel esté cargado
- Verificar que el RUT existe en la base de datos

### "Error al procesar archivo Excel"
- Verificar que el archivo tenga las 3 hojas requeridas
- Confirmar que los nombres de las hojas sean exactos
- Revisar que las columnas tengan los nombres esperados

### La página no carga
- Verificar conexión a internet (para la librería Excel)
- Actualizar la página (Ctrl+F5)
- Comprobar que JavaScript esté habilitado

## 📞 Soporte

Para reportar problemas o sugerir mejoras:
1. Abrir un issue en GitHub
2. Incluir detalles del problema
3. Adjuntar capturas de pantalla si es necesario

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Eres libre de usarlo, modificarlo y distribuirlo.

---

**Desarrollado con ❤️ para optimizar la gestión de cupones de gas**
