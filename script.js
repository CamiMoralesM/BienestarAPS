const SECURITY_CONFIG = {
    ENABLE_DEBUG_LOGS: false,
    IS_DEVELOPMENT: (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.search.includes('debug=true')
    ),
    IS_PRODUCTION: (
        window.location.hostname.includes('github.io') ||
        window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('netlify.app') ||
        window.location.hostname.includes('pages.dev')
    )
};

function sanitizeURL(url) {
    if (!url || typeof url !== 'string') return '[URL]';
    return url
        .replace(/https:\/\/[^\/]+/g, 'https://[DOMAIN]')
        .replace(/personal\/[^\/]+/g, 'personal/[USER]')
        .replace(/\?e=[^&\s]+/g, '?e=[TOKEN]')
        .replace(/[A-Z0-9]{15,}/g, '[ID]')
        .replace(/share=[^&\s]+/g, 'share=[SHARE_ID]');
}

function sanitizeData(data) {
    if (typeof data === 'string') {
        return data
            .replace(/\b\d{7,8}-[0-9kK]\b/g, '****-*')
            .replace(/https:\/\/[^\s]+sharepoint[^\s]+/gi, '[SHAREPOINT_URL]')
            .replace(/personal\/[^\/\s]+/g, 'personal/[USER]')
            .replace(/\?e=[^&\s]+/g, '?e=[TOKEN]')
            .replace(/[A-Z0-9]{20,}/gi, '[LONG_ID]');
    }
    if (typeof data === 'object' && data !== null) {
        return '[OBJECT_DATA]';
    }
    return data;
}

function secureLog(message, level = 'info', sensitiveData = null) {
    if (SECURITY_CONFIG.IS_PRODUCTION && !SECURITY_CONFIG.ENABLE_DEBUG_LOGS) {
        if (level === 'status') {
            console.log(`🏥 ${message}`);
        }
        return;
    }
    if (!SECURITY_CONFIG.ENABLE_DEBUG_LOGS && level !== 'status') {
        return;
    }
    const cleanMessage = sanitizeData(String(message));
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🏥 [${timestamp}]`;
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

function showAppStatus(message) {
    secureLog(message, 'status');
}

function logURL(description, url) {
    if (SECURITY_CONFIG.ENABLE_DEBUG_LOGS && SECURITY_CONFIG.IS_DEVELOPMENT) {
        secureLog(`${description}: ${sanitizeURL(url)}`);
    } else {
        secureLog(`${description}: [URL_OCULTA]`);
    }
}

class BienestarAPSSystem {
    constructor() {
        this.DEBUG_MODE = false;
        this.DEVELOPMENT = this.detectDevelopmentMode();
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        this.EXCEL_URL = 'https://cmesapa-my.sharepoint.com/:x:/g/personal/alejandro_ponce_cmpuentealto_cl/IQDMU9-cU2OESYO8ETvodgptAU2lRYCtsFgLjHcMfgBQd-I?e=z8r8sT&download=1';
        this.BACKUP_URL = 'https://cmesapa-my.sharepoint.com/personal/alejandro_ponce_cmpuentealto_cl/_layouts/15/download.aspx?share=IQDMU9-cU2OESYO8ETvodgptAU2lRYCtsFgLjHcMfgBQd-I';
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000;
        this.init();
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

    detectDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.port === '3000' ||
               window.location.search.includes('debug=true');
    }

    sanitizeForLog(data) {
        if (!data) return data;
        const sensitiveFields = ['rut', 'nombres', 'apellidos', 'establecimiento'];
        const sanitized = { ...data };
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[PROTECTED]';
            }
        });
        return sanitized;
    }

    secureLog(message, level = 'info', sensitiveData = null) {
        const shouldLog = this.DEVELOPMENT && this.DEBUG_MODE;
        if (!shouldLog) {
            if (level === 'error') {
                const cleanMessage = this.sanitizeSensitiveData(String(message));
                console.error(`🏥 Error: ${cleanMessage}`);
            }
            return;
        }
        const cleanMessage = this.sanitizeSensitiveData(String(message));
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `🏥 [${timestamp}]`;
        
        switch(level) {
            case 'error':
                console.error(prefix, cleanMessage);
                if (this.DEBUG_MODE && sensitiveData) {
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
                break;
        }
    }

    sanitizeSensitiveData(message) {
        return String(message)
            .replace(/\b\d{7,8}-[0-9kK]\b/g, '****-*')
            .replace(/sharepoint\.com[^\s]+/gi, 'sharepoint.com/[PROTECTED]')
            .replace(/personal\/[^\/\s]+/g, 'personal/[USER]')
            .replace(/\?e=[^&\s]+/g, '?e=[TOKEN]')
            .replace(/[A-Z0-9]{15,}/g, '[ID]');
    }

    init() {
        this.secureLog('🚀 Iniciando Sistema Bienestar APS', 'info');
        this.loadExcelFromGoogleSheets();
        
        const searchBtn = document.getElementById('searchBtn');
        const rutInput = document.getElementById('rutInput');
        const adminBtn = document.getElementById('adminBtn');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchCouponsByRUT());
        }

        if (rutInput) {
            rutInput.addEventListener('input', (e) => this.formatRUT(e));
            rutInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchCouponsByRUT();
                }
            });
        }
    }

    async loadExcelFromGoogleSheets() {
        try {
            secureLog('📊 Descargando datos desde SharePoint...');
            showAppStatus('Conectando a SharePoint...');
            
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook && this.isRecentCache(fileData.downloadDate, 5)) {
                    this.currentWorkbook = fileData.workbook;
                    secureLog('⚡ Usando datos en caché recientes');
                    return true;
                }
            }

            secureLog('🌐 Iniciando descarga desde fuente de datos...');
            
            let success = await this.trySharePointDownload(this.EXCEL_URL, 'Método 1');
            if (success) return true;

            if (this.BACKUP_URL) {
                secureLog('🔄 Intentando método alternativo...');
                success = await this.trySharePointDownload(this.BACKUP_URL, 'Método 2');
                if (success) return true;
            }

            const urlSinDownload = this.EXCEL_URL.replace('&download=1', '');
            secureLog('🔄 Intentando configuración alternativa...');
            success = await this.trySharePointDownload(urlSinDownload, 'Método 3');
            if (success) return true;
            
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
            
            this.currentWorkbook = workbook;
            
            this.cacheWorkbook(workbook);
            this.showDataStatus(true, `Conectado exitosamente con ${methodName}`);
            return true;

        } catch (error) {
            secureLog(`❌ ${methodName} falló: ${error.message}`, 'error');
            return false;
        }
    }

    isRecentCache(downloadDate, maxMinutes) {
        if (!downloadDate) return false;
        const now = new Date().getTime();
        const cacheTime = new Date(downloadDate).getTime();
        const diffMinutes = (now - cacheTime) / (1000 * 60);
        return diffMinutes < maxMinutes;
    }

    cacheWorkbook(workbook) {
        try {
            const cacheData = {
                workbook: workbook,
                downloadDate: new Date().toISOString()
            };
            localStorage.setItem('gasSystemData', JSON.stringify(cacheData));
            secureLog('💾 Datos guardados en caché local');
        } catch (error) {
            secureLog('⚠️ No se pudo guardar caché: ' + error.message, 'warn');
        }
    }

    loadFromOldCache() {
        try {
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook) {
                    this.currentWorkbook = fileData.workbook;
                    secureLog('📋 Usando datos guardados localmente');
                    return true;
                }
            }
        } catch (error) {
            secureLog('❌ Error cargando caché local: ' + error.message, 'error');
        }
        return false;
    }

    showDataStatus(connected, message) {
        const statusElement = document.querySelector('.data-status');
        if (statusElement) {
            statusElement.innerHTML = connected ? 
                `<span style="color: #10B981;">✅ ${message}</span>` : 
                `<span style="color: #EF4444;">❌ ${message}</span>`;
        }
    }

    async searchCouponsByRUT() {
        const rutInput = document.getElementById('rutInput');
        const rawRUT = rutInput.value.trim();
        
        if (!rawRUT) {
            alert('Por favor ingrese su RUT');
            rutInput.focus();
            return;
        }

        if (!this.isValidRUT(rawRUT)) {
            alert('Por favor ingrese un RUT válido (ej: 12345678-9)');
            rutInput.focus();
            return;
        }

        const formattedRUT = this.normalizeRUT(rawRUT);
        
        if (!this.currentWorkbook) {
            alert('No se han podido cargar los datos. Intente nuevamente en unos minutos.');
            this.loadExcelFromGoogleSheets();
            return;
        }

        secureLog('🔍 Iniciando búsqueda de cupones...');

        try {
            const couponInfo = this.findCouponInfoInExcel(this.currentWorkbook, formattedRUT);
            this.displaySimplifiedResults(couponInfo);
            
        } catch (error) {
            secureLog('❌ Error en búsqueda: ' + error.message, 'error');
            alert('Error buscando información. Intente nuevamente.');
        }
    }

    isValidRUT(rut) {
        const cleanRUT = rut.replace(/[.-\s]/g, '');
        if (cleanRUT.length < 8 || cleanRUT.length > 9) return false;
        
        const rutNumber = cleanRUT.slice(0, -1);
        const dv = cleanRUT.slice(-1).toLowerCase();
        
        if (!/^\d+$/.test(rutNumber)) return false;
        if (!/^[0-9kK]$/.test(dv)) return false;
        
        let sum = 0;
        let multiplier = 2;
        
        for (let i = rutNumber.length - 1; i >= 0; i--) {
            sum += parseInt(rutNumber[i]) * multiplier;
            multiplier = multiplier < 7 ? multiplier + 1 : 2;
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
        const generalSheet = workbook.Sheets['GENERAL'];
        if (generalSheet) {
            const result = this.findInGeneralSheet(generalSheet, rut);
            if (result) {
                return result;
            }
        }

        const cuponesSheet = workbook.Sheets['CUPONES DISPONIBLES'];
        if (cuponesSheet) {
            const result = this.findInCuponesDisponibles(cuponesSheet, rut);
            if (result) {
                return result;
            }
        }

        return this.findUserInBaseDatos(workbook, rut);
    }

    findInGeneralSheet(sheet, rut) {
        secureLog('🔍 Buscando en hoja GENERAL...');
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
                cine: 0,      
                energy: 0,    
                jumper: 0     
            },
            usadoEnElMes: 0,
            disponible: 4
        };

        for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];

            if (row && row[4]) {
                const rutEnFila = String(row[4]).trim();
                const rutNormalizado = this.normalizeRUT(rutEnFila);

                if (rutNormalizado === rut) {
                    encontrado = true;
                    secureLog(`✅ Datos encontrados en hoja principal`);

                    if (!datosUsuario.nombres) {
                        datosUsuario.nombres = row[5] || '';
                        datosUsuario.apellidos = row[6] || '';
                        datosUsuario.establecimiento = row[7] || '';

                        const usadoExcel = this.parseNumber(row[31]);
                        datosUsuario.usadoEnElMes = Number.isFinite(usadoExcel) ? usadoExcel : 0;

                        const disponibleExcel = this.parseNumber(row[32]);
                        datosUsuario.disponible = Number.isFinite(disponibleExcel) ? disponibleExcel : 4;
                        
                        secureLog(`📊 Datos de uso actualizados`);
                        secureLog(`📊 Cupones disponibles calculados`);
                    }

                    datosUsuario.lipigas['5'] += this.parseNumber(row[9]) || 0;
                    datosUsuario.lipigas['11'] += this.parseNumber(row[10]) || 0;
                    datosUsuario.lipigas['15'] += this.parseNumber(row[11]) || 0;
                    datosUsuario.lipigas['45'] += this.parseNumber(row[12]) || 0;

                    datosUsuario.abastible['5'] += this.parseNumber(row[13]) || 0;
                    datosUsuario.abastible['11'] += this.parseNumber(row[14]) || 0;
                    datosUsuario.abastible['15'] += this.parseNumber(row[15]) || 0;
                    datosUsuario.abastible['45'] += this.parseNumber(row[16]) || 0;

                    datosUsuario.comprasGenerales.cine += this.parseNumber(row[17]) || 0;
                    datosUsuario.comprasGenerales.energy += this.parseNumber(row[18]) || 0;
                    datosUsuario.comprasGenerales.jumper += this.parseNumber(row[22]) || 0;
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
            comprasGenerales: { cine: 0, energy: 0, jumper: 0 },
            usadoEnElMes: this.parseNumber(row[13]) || 0,
            disponible: Math.max(0, 4 - (this.parseNumber(row[13]) || 0))
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
                    comprasGenerales: { cine: 0, energy: 0, jumper: 0 },
                    usadoEnElMes: 0,
                    disponible: 4
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
        <div style="background: linear-gradient(135deg, var(--gray-25), var(--white)); padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--gray-200); box-shadow: var(--shadow-md); margin-bottom: 2rem;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--health-primary); margin-bottom: 1rem; font-family: var(--font-display); text-align: center;">
                ${couponInfo.nombres} ${couponInfo.apellidos}
            </div>
            <div style="text-align: center; color: var(--gray-600); font-size: 1rem;">
                <strong>RUT:</strong> ${couponInfo.rut}
                ${couponInfo.establecimiento ? `<br><strong>Centro:</strong> ${couponInfo.establecimiento}` : ''}
            </div>
        </div>

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

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">

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
                <div class="compras-generales-header" style="text-align: center; margin-bottom: 2rem;">
                    <h3 style="color: #8b4513; font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">🛍️ COMPRAS GENERALES</h3>
                    <div class="total-compras" style="font-size: 2rem; font-weight: 700; color: #8b4513;">
                        Total: ${(couponInfo.comprasGenerales?.cine || 0) + (couponInfo.comprasGenerales?.energy || 0) + (couponInfo.comprasGenerales?.jumper || 0)}
                    </div>
                </div>

                <div class="compras-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
                    gap: 1.5rem; 
                    max-width: 600px; 
                    margin: 0 auto;
                    justify-items: center;
                ">
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

    parseNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number' && !isNaN(value)) return value;
        if (typeof value === 'string') {
            const cleanValue = value.trim();
            if (cleanValue === '') return 0;
            const parsed = parseFloat(cleanValue);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.bienestarSystem = new BienestarAPSSystem();
});
