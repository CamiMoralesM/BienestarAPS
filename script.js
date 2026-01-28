
const SECURITY_CONFIG = {
    // ¡IMPORTANTE! Cambiar a true SOLO en desarrollo local
    ENABLE_DEBUG_LOGS: false,
    
    // Detectar si estamos en modo desarrollo
    IS_DEVELOPMENT: (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.search.includes('debug=true')
    ),
    
    // Detectar si estamos en GitHub Pages o Vercel (considerar como producción)
    IS_PRODUCTION: (
        window.location.hostname.includes('github.io') ||
        window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('netlify.app') ||
        window.location.hostname.includes('pages.dev')
    )
};

// Función para sanitizar URLs sensibles
function sanitizeURL(url) {
    if (!url || typeof url !== 'string') return '[URL]';
    
    return url
        .replace(/https:\/\/[^\/]+/g, 'https://[DOMAIN]')
        .replace(/personal\/[^\/]+/g, 'personal/[USER]')
        .replace(/\?e=[^&\s]+/g, '?e=[TOKEN]')
        .replace(/[A-Z0-9]{15,}/g, '[ID]')
        .replace(/share=[^&\s]+/g, 'share=[SHARE_ID]');
}

// Función para sanitizar datos sensibles
function sanitizeData(data) {
    if (typeof data === 'string') {
        return data
            .replace(/\b\d{7,8}-[0-9kK]\b/g, '****-*')  // Ocultar RUTs
            .replace(/https:\/\/[^\s]+sharepoint[^\s]+/gi, '[SHAREPOINT_URL]')  // URLs SharePoint
            .replace(/personal\/[^\/\s]+/g, 'personal/[USER]')
            .replace(/\?e=[^&\s]+/g, '?e=[TOKEN]')
            .replace(/[A-Z0-9]{20,}/gi, '[LONG_ID]');
    }
    
    if (typeof data === 'object' && data !== null) {
        return '[OBJECT_DATA]';
    }
    
    return data;
}

// Función de logging seguro mejorada
function secureLog(message, level = 'info', sensitiveData = null) {
    // Solo mostrar logs básicos en producción
    if (SECURITY_CONFIG.IS_PRODUCTION && !SECURITY_CONFIG.ENABLE_DEBUG_LOGS) {
        // Solo mostrar mensajes de estado importantes
        if (level === 'status') {
            console.log(`🏥 ${message}`);
        }
        return;
    }
    
    // En desarrollo local, mostrar más detalles si está habilitado
    if (!SECURITY_CONFIG.ENABLE_DEBUG_LOGS && level !== 'status') {
        return;
    }
    
    // Sanitizar el mensaje principal
    const cleanMessage = sanitizeData(String(message));
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🏥 [${timestamp}]`;
    
    // Mostrar según el nivel
    switch(level) {
        case 'error':
            console.error(prefix, cleanMessage);
            if (SECURITY_CONFIG.IS_DEVELOPMENT && sensitiveData) {
                console.error('📋 Detalles:', sanitizeData(sensitiveData));
            }
            break;
        case 'warn':
            console.warn(prefix, cleanMessage);
            break;
        case 'success':
            console.log(`%c${prefix} ${cleanMessage}`, 'color: #10B981; font-weight: bold');
            break;
        case 'status':
            console.log(`%c🏥 ${cleanMessage}`, 'color: #3B82F6; font-weight: bold');
            break;
        default:
            console.log(prefix, cleanMessage);
    }
}

// Función para mostrar estado de la aplicación (siempre visible pero sin datos sensibles)
function showAppStatus(message) {
    secureLog(message, 'status');
}

// Función específica para logging de URLs (siempre censuradas)
function logURL(description, url) {
    if (SECURITY_CONFIG.ENABLE_DEBUG_LOGS && SECURITY_CONFIG.IS_DEVELOPMENT) {
        secureLog(`${description}: ${sanitizeURL(url)}`);
    } else {
        secureLog(`${description}: [URL_OCULTA]`);
    }
}

class BienestarAPSSystem {
    constructor() {
        // ========================================
        // CONFIGURACIÓN DE SEGURIDAD
        // ========================================
        this.DEBUG_MODE = false; // ¡CAMBIAR A true SOLO PARA DESARROLLO!
        this.DEVELOPMENT = this.detectDevelopmentMode();
        
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        // SHAREPOINT - URL DE DESCARGA DIRECTA
        this.EXCEL_URL = 'https://cmesapa-my.sharepoint.com/:x:/g/personal/alejandro_ponce_cmpuentealto_cl/IQDMU9-cU2OESYO8ETvodgptAU2lRYCtsFgLjHcMfgBQd-I?e=z8r8sT&download=1';
        // URL alternativa si la principal no funciona
        this.BACKUP_URL = 'https://cmesapa-my.sharepoint.com/personal/alejandro_ponce_cmpuentealto_cl/_layouts/15/download.aspx?share=IQDMU9-cU2OESYO8ETvodgptAU2lRYCtsFgLjHcMfgBQd-I';
        
        // Cache para optimización
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
        
        this.init();
        
        // Mostrar estado de seguridad
        this.showSecurityStatus();
    }
    
    showSecurityStatus() {
        if (SECURITY_CONFIG.ENABLE_DEBUG_LOGS && SECURITY_CONFIG.IS_DEVELOPMENT) {
            showAppStatus('Modo desarrollo - Debug habilitado');
            secureLog('⚠️ MODO DEBUG: Información limitada visible en consola', 'warn');
        } else if (SECURITY_CONFIG.IS_PRODUCTION) {
            showAppStatus('Modo producción - Información protegida');
        } else {
            showAppStatus('Sistema iniciado - Logs mínimos');
        }
    }

    // ========================================
    // SISTEMA DE LOGGING SEGURO
    // ========================================
    
    detectDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('github.io') ||
               window.location.hostname.includes('vercel.app') ||
               window.location.search.includes('debug=true');
    }
    
    secureLog(message, level = 'info', sensitiveData = null) {
        // Solo mostrar logs en desarrollo o si DEBUG_MODE está activado
        if (!this.DEBUG_MODE && !this.DEVELOPMENT) {
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `🏥 BienestarAPS [${timestamp}]:`;
        
        // Limpiar información sensible
        const cleanMessage = this.sanitizeForLog(message);
        
        switch(level) {
            case 'error':
                console.error(prefix, cleanMessage);
                if (sensitiveData && (this.DEBUG_MODE || this.DEVELOPMENT)) {
                    console.error('📋 Detalles (solo desarrollo):', this.sanitizeForLog(sensitiveData));
                }
                break;
            case 'warn':
                console.warn(prefix, cleanMessage);
                break;
            case 'success':
                console.log(`%c${prefix} ${cleanMessage}`, 'color: #10B981; font-weight: bold');
                break;
            case 'info':
            default:
                console.log(prefix, cleanMessage);
        }
    }
    
    sanitizeForLog(data) {
        if (typeof data !== 'string') {
            data = String(data);
        }
        
        // En producción, ocultar completamente información sensible
        if (!this.DEBUG_MODE && !this.DEVELOPMENT) {
            return '[INFORMACIÓN PROTEGIDA POR SEGURIDAD]';
        }
        
        // En desarrollo, mostrar información parcialmente censurada
        return data
            // Ocultar RUTs completos
            .replace(/\b\d{7,8}-[0-9kK]\b/g, '****-*')
            // Ocultar usuarios en URLs
            .replace(/personal\/[^\/]+/g, 'personal/[USER]')
            // Ocultar tokens
            .replace(/\?e=[^&\s]+/g, '?e=[TOKEN]')
            .replace(/share=[^&\s]+/g, 'share=[SHARE-ID]')
            // Ocultar IDs largos
            .replace(/[A-Z0-9]{15,}/g, '[ID-HIDDEN]');
    }
    
    logOperation(operation, success = true, details = '') {
        const level = success ? 'success' : 'error';
        const icon = success ? '✅' : '❌';
        this.secureLog(`${icon} ${operation}`, level, details);
    }

    init() {
        this.bindEvents();
        this.setupFirebase();
        // Cargar datos inmediatamente
        this.loadExcelFromGoogleSheets();
    }

    async setupFirebase() {
        if (window.firebase) {
            this.auth = window.firebase.auth();
            this.storage = window.firebase.storage();
            
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    this.showAdminPanel();
                } else {
                    this.showLoginForm();
                }
                // Recargar datos cuando cambie auth
                this.loadExcelFromGoogleSheets();
            });
        }
    }

    // ========================================
    // GOOGLE SHEETS - ACTUALIZACIÓN AUTOMÁTICA
    // ========================================

    async loadExcelFromGoogleSheets() {
        try {
            secureLog('📊 Descargando datos desde SharePoint...');
            // No mostrar URL completa en logs
            showAppStatus('Conectando a SharePoint...');
            
            // Intentar caché reciente primero (5 minutos)
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook && this.isRecentCache(fileData.downloadDate, 5)) {
                    this.currentWorkbook = fileData.workbook;
                    secureLog('⚡ Usando datos en caché recientes');
                    return true;
                }
            }

            // Intentar descarga desde SharePoint
            secureLog('🌐 Iniciando descarga desde fuente de datos...');
            
            // Método 1: URL principal
            let success = await this.trySharePointDownload(this.EXCEL_URL, 'Método 1');
            if (success) return true;

            // Método 2: URL alternativa de SharePoint
            if (this.BACKUP_URL) {
                secureLog('🔄 Intentando método alternativo...');
                success = await this.trySharePointDownload(this.BACKUP_URL, 'Método 2');
                if (success) return true;
            }

            // Método 3: Intentar sin parámetro download
            const urlSinDownload = this.EXCEL_URL.replace('&download=1', '');
            secureLog('🔄 Intentando configuración alternativa...');
            success = await this.trySharePointDownload(urlSinDownload, 'Método 3');
            if (success) return true;
            
            // Usar caché antiguo como fallback
            secureLog('📋 Intentando usar datos guardados localmente...');
            const hasOldCache = this.loadFromOldCache();
            this.showDataStatus(false, 'Problemas conectando a fuente de datos');
            return hasOldCache;
            
        } catch (error) {
            secureLog('❌ Error general en descarga:', error.message, 'error');
            const hasOldCache = this.loadFromOldCache();
            this.showDataStatus(false, 'Error de conexión');
            return hasOldCache;
        }
    }

    async trySharePointDownload(url, methodName) {
        try {
            // No mostrar URL completa por seguridad
            secureLog(`🔗 ${methodName}: Conectando...`);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'User-Agent': navigator.userAgent
                }
            });

            secureLog(`📡 ${methodName} - Estado: ${response.status}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Archivo no encontrado (${response.status})`);
                } else if (response.status === 403) {
                    throw new Error(`Sin permisos de acceso (${response.status})`);
                } else if (response.status === 401) {
                    throw new Error(`Autenticación requerida (${response.status})`);
                } else {
                    throw new Error(`Error ${response.status} - ${response.statusText}`);
                }
            }

            const contentType = response.headers.get('content-type') || '';
            secureLog(`📄 ${methodName} - Tipo: ${contentType.split(';')[0]}`);

            // Verificar que sea realmente un archivo Excel
            if (contentType.includes('text/html') || contentType.includes('text/plain')) {
                throw new Error('Respuesta HTML en lugar de Excel - revisar permisos');
            }

            const arrayBuffer = await response.arrayBuffer();
            secureLog(`📏 ${methodName} - Descargado: ${Math.round(arrayBuffer.byteLength/1024)}KB`);
            
            if (arrayBuffer.byteLength < 1000) {
                throw new Error('Archivo muy pequeño - posible error');
            }
            
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            secureLog(`📋 ${methodName} - Hojas encontradas: ${workbook.SheetNames.length}`);
            
            if (workbook.SheetNames.length === 0) {
                throw new Error('Excel sin hojas - archivo corrupto');
            }
            
            this.currentWorkbook = workbook;
            
            // Guardar en caché con timestamp
            const fileData = {
                name: 'cupones-gas-sharepoint.xlsx',
                downloadDate: new Date().toISOString(),
                source: 'sharepoint',
                method: methodName,
                url: url,
                workbook: workbook
            };
            
            try {
                localStorage.setItem('gasSystemData', JSON.stringify(fileData));
                console.log(`💾 ${methodName} - Datos guardados en caché`);
            } catch (storageError) {
                console.warn('⚠️ No se pudo guardar en caché:', storageError.message);
            }
            
            console.log(`✅ ${methodName} - Descarga exitosa desde SharePoint`);
            this.showDataStatus(true, `Conectado vía ${methodName}`);
            return true;
            
        } catch (error) {
            console.error(`❌ ${methodName} falló:`, error.message);
            return false;
        }
    }

    isRecentCache(downloadDate, minutes = 5) {
        if (!downloadDate) return false;
        const cacheAge = Date.now() - new Date(downloadDate).getTime();
        const maxAge = minutes * 60 * 1000;
        return cacheAge < maxAge;
    }

    loadFromOldCache() {
        try {
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook) {
                    this.currentWorkbook = fileData.workbook;
                    console.log('📋 Usando datos guardados localmente');
                    return true;
                }
            }
            return false;
        } catch {
            return false;
        }
    }

    showDataStatus(success, errorMessage = '') {
        // Mostrar estado en la interfaz
        const statusElement = document.getElementById('dataStatus');
        if (statusElement) {
            if (success) {
                statusElement.innerHTML = '🟢 Datos actualizados desde SharePoint';
                statusElement.className = 'alert alert-success';
            } else {
                statusElement.innerHTML = `🔴 Problemas conectando a SharePoint: ${errorMessage}`;
                statusElement.className = 'alert alert-warning';
            }
            statusElement.style.display = 'block';
            
            // Ocultar después de 5 segundos
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    // ========================================
    // BÚSQUEDA DE CUPONES
    // ========================================
    
    async searchCoupons() {
        const rutInput = document.getElementById('rutInput');
        const rut = rutInput.value.trim();

        if (!rut) {
            this.showAlert('📝 Por favor ingrese un RUT', 'error');
            rutInput.focus();
            return;
        }

        if (!this.validateRUT(rut)) {
            this.showAlert('❌ RUT inválido. Formato: 12345678-9', 'error');
            rutInput.focus();
            return;
        }

        this.showLoading(true);

        try {
            // Intentar recargar datos recientes antes de buscar
            if (!this.currentWorkbook || this.shouldRefreshData()) {
                const loaded = await this.loadExcelFromGoogleSheets();
                if (!loaded) {
                    this.showAlert('📊 No se pueden cargar los datos actuales desde SharePoint. Contacte al administrador.', 'warning');
                    this.showLoading(false);
                    return;
                }
            }

            const normalizedRUT = this.normalizeRUT(rut);
            secureLog('🔍 Iniciando búsqueda de cupones...');
            
            const couponInfo = this.findCouponInfoInExcel(this.currentWorkbook, normalizedRUT);
            
            this.displaySimplifiedResults(couponInfo);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error al buscar cupones:', error);
            this.showAlert('❌ Error al procesar la búsqueda', 'error');
            this.showLoading(false);
        }
    }

    shouldRefreshData() {
        const cachedData = localStorage.getItem('gasSystemData');
        if (!cachedData) return true;
        
        try {
            const fileData = JSON.parse(cachedData);
            // Refrescar si los datos tienen más de 10 minutos
            return !this.isRecentCache(fileData.downloadDate, 10);
        } catch {
            return true;
        }
    }

    // ========================================
    // VALIDACIÓN RUT Y BÚSQUEDA EN EXCEL
    // ========================================

    validateRUT(rut) {
        const cleanRUT = rut.replace(/[.-]/g, '');
        if (cleanRUT.length < 8) return false;
        
        const rutNumber = cleanRUT.slice(0, -1);
        const dv = cleanRUT.slice(-1).toLowerCase();
        
        let sum = 0;
        let multiplier = 2;
        
        for (let i = rutNumber.length - 1; i >= 0; i--) {
            sum += parseInt(rutNumber[i]) * multiplier;
            multiplier = multiplier === 7 ? 2 : multiplier + 1;
        }
        
        const remainder = sum % 11;
        const calculatedDV = remainder === 0 ? '0' : remainder === 1 ? 'k' : (11 - remainder).toString();
        
        return dv === calculatedDV;
    }

    normalizeRUT(rut) {
        const cleanRUT = rut.replace(/[.-\s]/g, '');
        if (cleanRUT.length < 8) return rut;
        
        const rutNumber = cleanRUT.slice(0, -1);
        const dv = cleanRUT.slice(-1).toUpperCase();
        
        return rutNumber + '-' + dv;
    }

    formatRUT(e) {
        let value = e.target.value.replace(/[^0-9kK]/g, '');
        if (value.length > 1) {
            const rut = value.slice(0, -1);
            const dv = value.slice(-1);
            value = rut + '-' + dv;
        }
        e.target.value = value;
    }

    findCouponInfoInExcel(workbook, rut) {
        // PRIMERO: Buscar en hoja GENERAL (datos reales)
        const generalSheet = workbook.Sheets['GENERAL'];
        if (generalSheet) {
            const result = this.findInGeneralSheet(generalSheet, rut);
            if (result) {
                return result;
            }
        }

        // SEGUNDO: Si no encuentra en GENERAL, buscar en CUPONES DISPONIBLES
        const cuponesSheet = workbook.Sheets['CUPONES DISPONIBLES'];
        if (cuponesSheet) {
            const result = this.findInCuponesDisponibles(cuponesSheet, rut);
            if (result) {
                return result;
            }
        }

        // TERCERO: Si no encuentra en ninguna, buscar en BASE DE DATOS
        return this.findUserInBaseDatos(workbook, rut);
    }

    findInGeneralSheet(sheet, rut) {
        secureLog(`🔍 Buscando en hoja GENERAL...`);
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        let encontrado = false;

        let datosUsuario = {
            rut: rut,
            nombres: '',
            apellidos: '',
            establecimiento: '',
            lipigas: { '5': 0, '11': 0, '15': 0, '45': 0 },
            abastible: { '5': 0, '11': 0, '15': 0, '45': 0 },
            comprasGenerales: { 
                cine: 0,      // Columna R (índice 17)
                energy: 0,    // Columna S (índice 18)
                jumper: 0     // Columna W (índice 22)
            },
            usadoEnElMes: 0,
            disponible: 4
        };

        for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];

            if (row && row[4]) { // Columna E - RUT
                const rutEnFila = String(row[4]).trim();
                const rutNormalizado = this.normalizeRUT(rutEnFila);

                if (rutNormalizado === rut) {
                    encontrado = true;
                    secureLog(`✅ Datos encontrados en hoja principal`);

                    // Guardar datos solo la primera vez
                    if (!datosUsuario.nombres) {
                        datosUsuario.nombres = row[5] || '';
                        datosUsuario.apellidos = row[6] || '';
                        datosUsuario.establecimiento = row[7] || '';

                        // AF - USADO EN EL MES (columna 31, índice 31)
                        const usadoExcel = this.parseNumber(row[31]);
                        datosUsuario.usadoEnElMes = Number.isFinite(usadoExcel) ? usadoExcel : 0;

                        // AG - DISPONIBLE (columna 32, índice 32)
                        const disponibleExcel = this.parseNumber(row[32]);
                        datosUsuario.disponible = Number.isFinite(disponibleExcel) ? disponibleExcel : 4;
                        
                        secureLog(`📊 Datos de uso actualizados`);
                        secureLog(`📊 Cupones disponibles calculados`);
                    }

                    // Sumar cupones Lipigas (J, K, L, M - índices 9, 10, 11, 12)
                    datosUsuario.lipigas['5'] += this.parseNumber(row[9]) || 0;
                    datosUsuario.lipigas['11'] += this.parseNumber(row[10]) || 0;
                    datosUsuario.lipigas['15'] += this.parseNumber(row[11]) || 0;
                    datosUsuario.lipigas['45'] += this.parseNumber(row[12]) || 0;

                    // Sumar cupones Abastible (N, O, P, Q - índices 13, 14, 15, 16)
                    datosUsuario.abastible['5'] += this.parseNumber(row[13]) || 0;
                    datosUsuario.abastible['11'] += this.parseNumber(row[14]) || 0;
                    datosUsuario.abastible['15'] += this.parseNumber(row[15]) || 0;
                    datosUsuario.abastible['45'] += this.parseNumber(row[16]) || 0;

                    // Sumar compras generales
                    datosUsuario.comprasGenerales.cine += this.parseNumber(row[17]) || 0;    // Columna R
                    datosUsuario.comprasGenerales.energy += this.parseNumber(row[18]) || 0;  // Columna S  
                    datosUsuario.comprasGenerales.jumper += this.parseNumber(row[22]) || 0;  // Columna W
                }
            }
        }

        if (!encontrado) {
            secureLog('❌ Datos no encontrados en hoja principal');
            return null;
        }

        return {
            encontrado: true,
            rut: datosUsuario.rut,
            nombres: datosUsuario.nombres,
            apellidos: datosUsuario.apellidos,
            establecimiento: datosUsuario.establecimiento,
            lipigas: datosUsuario.lipigas,
            abastible: datosUsuario.abastible,
            comprasGenerales: datosUsuario.comprasGenerales,
            usadoEnElMes: datosUsuario.usadoEnElMes,
            disponible: datosUsuario.disponible
        };
    }

    findInCuponesDisponibles(sheet, rut) {
        secureLog('🔍 Buscando en hoja de cupones...');
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        let foundRow = null;
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[2] && this.normalizeRUT(row[2]) === rut) {
                foundRow = i;
                break;
            }
        }

        if (foundRow === null) {
            secureLog('❌ Datos no encontrados en hoja de cupones');
            return null;
        }

        const row = jsonData[foundRow];
        secureLog(`✅ Datos encontrados en hoja de cupones`);
        
        return {
            encontrado: true,
            rut: this.normalizeRUT(row[2]) || rut,
            nombres: row[3] || '',
            apellidos: row[4] || '',
            lipigas: {
                '5': this.parseNumber(row[5]) || 0,
                '11': this.parseNumber(row[6]) || 0,
                '15': this.parseNumber(row[7]) || 0,
                '45': this.parseNumber(row[8]) || 0
            },
            abastible: {
                '5': this.parseNumber(row[9]) || 0,
                '11': this.parseNumber(row[10]) || 0,
                '15': this.parseNumber(row[11]) || 0,
                '45': this.parseNumber(row[12]) || 0
            },
            comprasGenerales: { cine: 0, energy: 0, jumper: 0 }, // Vacías en esta hoja
            usadoEnElMes: this.parseNumber(row[13]) || 0,
            disponible: Math.max(0, 4 - (this.parseNumber(row[13]) || 0)) // Calculado: 4 - USADO
        };
    }

    findUserInBaseDatos(workbook, rut) {
        const sheet = workbook.Sheets['BASE DE DATOS'];
        if (!sheet) {
            return null;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[4] && this.normalizeRUT(row[4]) === rut) {
                return {
                    encontrado: true,
                    rut: this.normalizeRUT(row[4]),
                    nombres: row[5] || '',
                    apellidos: row[6] || '',
                    establecimiento: row[7] || '',
                    lipigas: { '5': 0, '11': 0, '15': 0, '45': 0 },
                    abastible: { '5': 0, '11': 0, '15': 0, '45': 0 },
                    comprasGenerales: { cine: 0, energy: 0, jumper: 0 }, // Vacías para usuarios nuevos
                    usadoEnElMes: 0,
                    disponible: 4 // Usuario nuevo, 4 disponibles
                };
            }
        }

        return null;
    }

    displaySimplifiedResults(couponInfo) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');

        if (!couponInfo || !couponInfo.encontrado) {
            resultsContent.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--health-error);">
                    <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">🔍 RUT no encontrado</h3>
                    <p style="color: var(--gray-600);">El RUT ingresado no se encuentra en la base de datos.</p>
                </div>
            `;
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // Totales usados
        const lipigasUsados =
            (couponInfo.lipigas?.['5'] ?? 0) +
            (couponInfo.lipigas?.['11'] ?? 0) +
            (couponInfo.lipigas?.['15'] ?? 0) +
            (couponInfo.lipigas?.['45'] ?? 0);

        const abastibleUsados =
            (couponInfo.abastible?.['5'] ?? 0) +
            (couponInfo.abastible?.['11'] ?? 0) +
            (couponInfo.abastible?.['15'] ?? 0) +
            (couponInfo.abastible?.['45'] ?? 0);

        const html = `
        <!-- Información del Usuario -->
        <div style="background: linear-gradient(135deg, var(--gray-25), var(--white)); padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--gray-200); box-shadow: var(--shadow-md); margin-bottom: 2rem;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--health-primary); margin-bottom: 1rem; font-family: var(--font-display); text-align: center;">
                ${couponInfo.nombres} ${couponInfo.apellidos}
            </div>
            <div style="text-align: center; color: var(--gray-600); font-size: 1rem;">
                <strong>RUT:</strong> ${couponInfo.rut}
                ${couponInfo.establecimiento ? `<br><strong>Centro:</strong> ${couponInfo.establecimiento}` : ''}
            </div>
        </div>

        <!-- Resumen General -->
        <div style="background: linear-gradient(135deg, var(--white), var(--gray-25)); padding: 2.5rem; border-radius: 1.5rem; border: 1px solid var(--gray-200); box-shadow: var(--shadow-lg); margin-bottom: 2rem;">
            <h3 style="text-align: center; margin-bottom: 2rem; color: var(--gray-800); font-size: 1.4rem; font-weight: 700;">📊 Resumen General</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem;">
                <div style="text-align: center; padding: 2rem; background: rgba(239, 68, 68, 0.05); border-radius: 1.5rem; border: 2px solid rgba(239, 68, 68, 0.1);">
                    <div style="font-size: 3rem; font-weight: 800; color: var(--health-error); margin-bottom: 0.5rem; font-family: var(--font-display);">
                        ${couponInfo.usadoEnElMes ?? 0}
                    </div>
                    <div style="color: var(--health-error); font-weight: 600; font-size: 1.2rem;">USADO EN EL MES</div>
                </div>
                <div style="text-align: center; padding: 2rem; background: rgba(34, 197, 94, 0.05); border-radius: 1.5rem; border: 2px solid rgba(34, 197, 94, 0.1);">
                    <div style="font-size: 3rem; font-weight: 800; color: var(--health-success); margin-bottom: 0.5rem; font-family: var(--font-display);">
                        ${couponInfo.disponible ?? 4}
                    </div>
                    <div style="color: var(--health-success); font-weight: 600; font-size: 1.2rem;">DISPONIBLE</div>
                </div>
            </div>
        </div>

        <!-- Detalle por Empresa -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">

            <!-- LIPIGAS -->
            <div style="background: linear-gradient(135deg, rgba(14,165,233,0.05), var(--white)); padding: 2rem; border-radius: 1.5rem; border: 2px solid rgba(14,165,233,0.2); box-shadow: var(--shadow-lg);">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h3 style="color: #0ea5e9; font-size: 1.5rem; font-weight: 800;">⛽ LIPIGAS</h3>
                    <div style="font-size: 2rem; font-weight: 700; color: #0ea5e9;">Total Usado: ${lipigasUsados}</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    ${['5','11','15','45'].map(kg => `
                        <div style="text-align: center; padding: 1.5rem; background: rgba(14,165,233,0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #0ea5e9; margin-bottom: 0.5rem;">
                                ${couponInfo.lipigas?.[kg] ?? 0}
                            </div>
                            <div style="color: #0369a1; font-weight: 600; font-size: 0.9rem;">
                                ${kg} KG
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- ABASTIBLE -->
            <div style="background: linear-gradient(135deg, rgba(249,115,22,0.05), var(--white)); padding: 2rem; border-radius: 1.5rem; border: 2px solid rgba(249,115,22,0.2); box-shadow: var(--shadow-lg);">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h3 style="color: #f97316; font-size: 1.5rem; font-weight: 800;">🔥 ABASTIBLE</h3>
                    <div style="font-size: 2rem; font-weight: 700; color: #f97316;">Total Usado: ${abastibleUsados}</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    ${['5','11','15','45'].map(kg => `
                        <div style="text-align: center; padding: 1.5rem; background: rgba(249,115,22,0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #f97316; margin-bottom: 0.5rem;">
                                ${couponInfo.abastible?.[kg] ?? 0}
                            </div>
                            <div style="color: #c2410c; font-weight: 600; font-size: 0.9rem;">
                                ${kg} KG
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- COMPRAS GENERALES -->
        ${(couponInfo.comprasGenerales?.cine > 0 || couponInfo.comprasGenerales?.energy > 0 || couponInfo.comprasGenerales?.jumper > 0) ? `
        <div class="compras-generales-container" style="grid-column: 1 / -1; margin-top: 3rem;">
            <div class="compras-generales-card" style="
                background: linear-gradient(135deg, rgba(139, 69, 19, 0.05), var(--white)); 
                padding: 2rem; 
                border-radius: 1.5rem; 
                border: 2px solid rgba(139, 69, 19, 0.2); 
                box-shadow: var(--shadow-lg);
                max-width: 800px;
                margin: 0 auto;
                width: 100%;
            ">
                <!-- Header -->
                <div class="compras-generales-header" style="text-align: center; margin-bottom: 2rem;">
                    <h3 style="color: #8b4513; font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">🛍️ COMPRAS GENERALES</h3>
                    <div class="total-compras" style="font-size: 2rem; font-weight: 700; color: #8b4513;">
                        Total: ${(couponInfo.comprasGenerales?.cine || 0) + (couponInfo.comprasGenerales?.energy || 0) + (couponInfo.comprasGenerales?.jumper || 0)}
                    </div>
                </div>

                <!-- Grid Responsive -->
                <div class="compras-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
                    gap: 1.5rem; 
                    max-width: 600px; 
                    margin: 0 auto;
                    justify-items: center;
                ">
                    <!-- CINE -->
                    <div class="compra-item cine-item" style="
                        text-align: center; 
                        padding: 1.8rem 1rem; 
                        background: rgba(139, 69, 19, 0.1); 
                        border-radius: 1rem; 
                        width: 100%;
                        max-width: 180px;
                        aspect-ratio: 1;
                        display: flex; 
                        flex-direction: column; 
                        justify-content: center; 
                        align-items: center;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                        cursor: default;
                    ">
                        <div class="compra-numero" style="font-size: 2.5rem; font-weight: 700; color: #8b4513; margin-bottom: 0.8rem; line-height: 1;">
                            ${couponInfo.comprasGenerales?.cine || 0}
                        </div>
                        <div class="compra-label" style="color: #654321; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.3rem; justify-content: center;">
                            <span style="font-size: 1.1rem;">🎬</span> CINE
                        </div>
                    </div>
                    
                    <!-- ENERGY -->
                    <div class="compra-item energy-item" style="
                        text-align: center; 
                        padding: 1.8rem 1rem; 
                        background: rgba(139, 69, 19, 0.1); 
                        border-radius: 1rem; 
                        width: 100%;
                        max-width: 180px;
                        aspect-ratio: 1;
                        display: flex; 
                        flex-direction: column; 
                        justify-content: center; 
                        align-items: center;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                        cursor: default;
                    ">
                        <div class="compra-numero" style="font-size: 2.5rem; font-weight: 700; color: #8b4513; margin-bottom: 0.8rem; line-height: 1;">
                            ${couponInfo.comprasGenerales?.energy || 0}
                        </div>
                        <div class="compra-label" style="color: #654321; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.3rem; justify-content: center;">
                            <span style="font-size: 1.1rem;">⚡</span> ENERGY
                        </div>
                    </div>
                    
                    <!-- JUMPER -->
                    <div class="compra-item jumper-item" style="
                        text-align: center; 
                        padding: 1.8rem 1rem; 
                        background: rgba(139, 69, 19, 0.1); 
                        border-radius: 1rem; 
                        width: 100%;
                        max-width: 180px;
                        aspect-ratio: 1;
                        display: flex; 
                        flex-direction: column; 
                        justify-content: center; 
                        align-items: center;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                        cursor: default;
                    ">
                        <div class="compra-numero" style="font-size: 2.5rem; font-weight: 700; color: #8b4513; margin-bottom: 0.8rem; line-height: 1;">
                            ${couponInfo.comprasGenerales?.jumper || 0}
                        </div>
                        <div class="compra-label" style="color: #654321; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.3rem; justify-content: center;">
                            <span style="font-size: 1.1rem;">🤸‍♂️</span> JUMPER
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
        `;

        resultsContent.innerHTML = html;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ========================================
    // PANEL ADMINISTRATIVO - ACTUALIZADO PARA GOOGLE SHEETS
    // ========================================

    showGoogleSheetsInfo() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>📊 Información de Google Sheets</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="padding: 1rem;">
                        <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem;">
                            <h4 style="color: #2d5a2d; margin-bottom: 1rem;">✅ Sistema Conectado a Google Sheets</h4>
                            <p><strong>📁 Archivo:</strong> Tu Google Sheets de cupones de gas</p>
                            <p><strong>🔄 Actualización:</strong> Automática cada vez que editas</p>
                            <p><strong>⚡ Velocidad:</strong> Cambios visibles en 1-2 minutos</p>
                        </div>
                        
                        <h4>🔧 Para actualizar datos:</h4>
                        <ol style="text-align: left; padding-left: 2rem;">
                            <li>Ve a tu Google Sheets</li>
                            <li>Edita los datos directamente</li>
                            <li>Los cambios se reflejan automáticamente</li>
                            <li>Los usuarios ven datos actualizados</li>
                        </ol>
                        
                        <div style="background: #f0f8ff; padding: 1rem; border-radius: 0.5rem; margin-top: 2rem;">
                            <h4>🎯 Ventajas del sistema actual:</h4>
                            <ul style="text-align: left;">
                                <li>✅ <strong>Sin subir archivos:</strong> Editas directamente online</li>
                                <li>✅ <strong>Actualización instantánea:</strong> Sin retrasos</li>
                                <li>✅ <strong>Acceso desde cualquier dispositivo:</strong> PC, móvil, tablet</li>
                                <li>✅ <strong>Sin problemas técnicos:</strong> Google maneja todo</li>
                                <li>✅ <strong>Historial de cambios:</strong> Google Sheets guarda versiones</li>
                            </ul>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
                            <p><strong>💡 Consejo:</strong> Mantén el formato de las columnas exactamente como está para que el sistema funcione correctamente.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // ========================================
    // EVENTOS Y UI
    // ========================================

   bindEvents() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => this.searchCoupons());
    }

    const rutInput = document.getElementById('rutInput');
    if (rutInput) {
        rutInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCoupons();
        });
        rutInput.addEventListener('input', (e) => this.formatRUT(e));
    }

    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => this.openAdminModal());
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => this.handleLogin());
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => this.showGoogleSheetsInfo());
    }

    const adminModal = document.getElementById('adminLoginModal');
    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target.id === 'adminLoginModal') this.closeAdminModal();
        });
    }
}


        // Refrescar datos manualmente
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadExcelFromGoogleSheets());
        }
    }

    // Métodos de autenticación y UI (simplificados)
    async handleLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('loginError');

        if (!email || !password) {
            this.showError(errorDiv, '📝 Complete todos los campos');
            return;
        }

        this.showLoading(true);
        
        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.hideError(errorDiv);
            this.showAlert('✅ Acceso autorizado exitosamente', 'success');
        } catch (error) {
            this.showError(errorDiv, '❌ Credenciales incorrectas');
        }
        
        this.showLoading(false);
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.showAlert('🚪 Sesión cerrada exitosamente', 'info');
            this.closeAdminModal();
        } catch (error) {
            this.showAlert('❌ Error al cerrar sesión', 'error');
        }
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        this.updateAdminInfo();
    }

    updateAdminInfo() {
        const filesList = document.getElementById('filesList');
        if (filesList) {
            filesList.innerHTML = `
                <div class="file-item">
                    <div>
                        <div class="file-name">📊 Google Sheets - Sistema Conectado</div>
                        <div class="file-date">🔄 Actualizaciones automáticas</div>
                        <div class="file-status">✅ Funcionando correctamente</div>
                    </div>
                    <button class="delete-file-btn" onclick="bienestarSystem.showGoogleSheetsInfo()">
                        ℹ️ Ver Info
                    </button>
                </div>
            `;
        }
    }

    openAdminModal() {
        document.getElementById('adminLoginModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        if (this.currentUser) {
            this.showAdminPanel();
        } else {
            this.showLoginForm();
        }
    }

    closeAdminModal() {
        document.getElementById('adminLoginModal').style.display = 'none';
        document.body.style.overflow = 'auto';
        this.hideError(document.getElementById('loginError'));
    }

    // Utilidades
    parseNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        const num = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'block' : 'none';
        document.body.style.overflow = show ? 'hidden' : 'auto';
    }

    showAlert(message, type = 'info') {
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => {
            if (!alert.id.includes('Error') && !alert.id.includes('Success') && !alert.id.includes('dataStatus')) {
                alert.remove();
            }
        });

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.cursor = 'pointer';

        const searchCard = document.querySelector('.search-card');
        if (searchCard) {
            searchCard.parentNode.insertBefore(alert, searchCard.nextSibling);
        }

        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 8000);

        alert.addEventListener('click', () => alert.remove());
    }

    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    hideError(element) {
        if (element) {
            element.style.display = 'none';
        }
    }
}

// Inicializar sistema
let bienestarSystem;

document.addEventListener('DOMContentLoaded', function() {
    bienestarSystem = new BienestarAPSSystem();
    
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
    
    console.log('🏥 Sistema Bienestar APS - Google Sheets Connected');
    console.log('📊 Datos actualizados automáticamente desde Google Sheets');
    console.log('📧 Admin: Bienestar.aps@cmpuentealto.cl');
});

window.bienestarSystem = bienestarSystem;
