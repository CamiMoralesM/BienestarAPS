/**
 * BIENESTAR APS - SISTEMA DE CUPONES DE GAS
 * Versión Google Sheets - CON TU ENLACE ESPECÍFICO
 */

class BienestarAPSSystem {
    constructor() {
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        // TU GOOGLE SHEETS - URL CORRECTA QUE FUNCIONABA ANTES
        this.EXCEL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlgHF7u5CO6n4jaVol3Ov9a1jwgwyGg_ev3Gu3M1Q0fakiRhDDukjByTUjleeIPQ/pub?output=xlsx';
        // URL de backup para móviles  
        this.BACKUP_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlgHF7u5CO6n4jaVol3Gu3M1Q0fakiRhDDukjByTUjleeIPQ/pub?output=csv';
        this.init();
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
            console.log('📊 Descargando datos desde Google Sheets...');
            console.log('🔗 URL a usar:', this.EXCEL_URL);
            
            // Intentar caché reciente primero (5 minutos)
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook && this.isRecentCache(fileData.downloadDate, 5)) {
                    this.currentWorkbook = fileData.workbook;
                    console.log('⚡ Usando caché reciente (menos de 5 min)');
                    return true;
                }
            }

            // Descargar desde Google Sheets - MÉTODO SIMPLE QUE FUNCIONABA
            console.log('🌐 Iniciando descarga desde Google Sheets...');
            const response = await fetch(this.EXCEL_URL, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });

            console.log('📡 Respuesta:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('📊 Procesando archivo Excel...');
            const arrayBuffer = await response.arrayBuffer();
            console.log('📏 Tamaño archivo:', arrayBuffer.byteLength, 'bytes');
            
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            console.log('📋 Hojas encontradas:', workbook.SheetNames);
            
            this.currentWorkbook = workbook;
            
            // Guardar en caché con timestamp
            const fileData = {
                name: 'cupones-gas-data.xlsx',
                downloadDate: new Date().toISOString(),
                source: 'google-sheets-pub',
                url: this.EXCEL_URL,
                workbook: workbook
            };
            localStorage.setItem('gasSystemData', JSON.stringify(fileData));
            
            console.log('✅ Datos actualizados desde Google Sheets');
            this.showDataStatus(true);
            return true;
            
        } catch (error) {
            console.error('❌ Error descargando desde Google Sheets:', error.message);
            
            // Usar caché antiguo como fallback
            const hasOldCache = this.loadFromOldCache();
            this.showDataStatus(false, error.message);
            return hasOldCache;
        }
    }

    async downloadWithTimeout(url, timeout, type) {
        try {
            console.log(`📡 DIAGNÓSTICO: Intentando descargar ${type}`);
            console.log(`🔗 URL completa: ${url}`);
            console.log(`⏱️ Timeout configurado: ${timeout}ms`);
            
            // Crear promise con timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('⏱️ TIMEOUT: Cancelando descarga por tiempo excedido');
                controller.abort();
            }, timeout);
            
            console.log('📡 Iniciando fetch...');
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                signal: controller.signal,
                headers: {
                    'Accept': type === 'XLSX' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
                    'User-Agent': navigator.userAgent
                }
            });
            
            clearTimeout(timeoutId);
            
            console.log(`📊 Respuesta recibida:`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            console.log(`   Content-Type: ${response.headers.get('content-type')}`);
            console.log(`   Content-Length: ${response.headers.get('content-length')}`);
            
            // Diagnóstico específico de errores
            if (!response.ok) {
                let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
                
                switch (response.status) {
                    case 400:
                        errorDetails += '\n❌ URL mal formada o parámetros incorrectos';
                        console.log('🔍 Verificar que el Google Sheets sea público');
                        console.log('🔍 Verificar que el ID del documento sea correcto');
                        break;
                    case 403:
                        errorDetails += '\n❌ Google Sheets no es público o sin permisos';
                        console.log('🔍 Hacer el Google Sheets público: Compartir → Cualquier persona con el enlace');
                        break;
                    case 404:
                        errorDetails += '\n❌ Google Sheets no encontrado';
                        console.log('🔍 Verificar que el ID del documento sea correcto');
                        break;
                    default:
                        errorDetails += '\n❌ Error del servidor de Google';
                }
                
                throw new Error(errorDetails);
            }

            console.log('✅ Respuesta OK, procesando datos...');
            let workbook;
            
            if (type === 'CSV') {
                console.log('📝 Procesando como CSV...');
                const csvText = await response.text();
                console.log(`📏 CSV recibido: ${csvText.length} caracteres`);
                console.log(`📄 Primeras líneas: ${csvText.substring(0, 200)}...`);
                workbook = this.csvToWorkbook(csvText);
            } else {
                console.log('📊 Procesando como XLSX...');
                const arrayBuffer = await response.arrayBuffer();
                console.log(`📏 XLSX recibido: ${arrayBuffer.byteLength} bytes`);
                workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            }
            
            console.log('📋 Hojas encontradas:', workbook.SheetNames);
            this.currentWorkbook = workbook;
            
            // Guardar en caché con timestamp
            const fileData = {
                name: 'cupones-gas-data.' + type.toLowerCase(),
                downloadDate: new Date().toISOString(),
                source: 'google-sheets',
                type: type,
                url: url,
                workbook: workbook
            };
            
            try {
                localStorage.setItem('gasSystemData', JSON.stringify(fileData));
                console.log('💾 Datos guardados en caché local');
            } catch (storageError) {
                console.warn('⚠️ No se pudo guardar en caché:', storageError.message);
            }
            
            console.log(`✅ Descarga ${type} completada exitosamente`);
            this.showDataStatus(true);
            return true;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('⏱️ TIMEOUT: Conexión demasiado lenta');
                throw new Error('Conexión muy lenta - intenta de nuevo');
            }
            
            console.error(`❌ ERROR DESCARGANDO ${type}:`);
            console.error(`   Mensaje: ${error.message}`);
            console.error(`   Tipo: ${error.name}`);
            console.error(`   Stack: ${error.stack}`);
            
            throw error;
        }
    }

    csvToWorkbook(csvText) {
        // Convertir CSV a formato workbook para compatibilidad móvil
        const lines = csvText.split('\n');
        const data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'GENERAL');
        
        return wb;
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
                statusElement.innerHTML = '🟢 Datos actualizados desde Google Sheets';
                statusElement.className = 'alert alert-success';
            } else {
                statusElement.innerHTML = `🔴 Problemas conectando a Google Sheets: ${errorMessage}`;
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

        console.log('\n🔍 ===== DIAGNÓSTICO COMPLETO DE BÚSQUEDA =====');
        console.log('📝 RUT ingresado:', rut);

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
                    this.showAlert('📊 No se pueden cargar los datos actuales. Contacte al administrador.', 'warning');
                    this.showLoading(false);
                    return;
                }
            }

            // DIAGNÓSTICO COMPLETO DEL EXCEL
            console.log('\n📊 ===== ANÁLISIS COMPLETO DEL EXCEL =====');
            console.log('📋 Hojas disponibles:', this.currentWorkbook.SheetNames);
            
            // Analizar cada hoja
            this.currentWorkbook.SheetNames.forEach((sheetName, index) => {
                console.log(`\n📄 HOJA ${index + 1}: "${sheetName}"`);
                const sheet = this.currentWorkbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
                
                console.log(`   📏 Filas totales: ${jsonData.length}`);
                console.log(`   📋 Primeras 5 filas:`, jsonData.slice(0, 5));
                
                // Buscar RUTs en diferentes columnas
                let rutCount = 0;
                const rutColumns = [];
                
                for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                    const row = jsonData[i];
                    if (row) {
                        // Buscar en todas las columnas
                        for (let col = 0; col < row.length; col++) {
                            if (row[col] && this.looksLikeRUT(row[col])) {
                                rutCount++;
                                if (!rutColumns.includes(col)) {
                                    rutColumns.push(col);
                                }
                                console.log(`   🔍 RUT encontrado fila ${i+1}, columna ${String.fromCharCode(65+col)}: "${row[col]}"`);
                            }
                        }
                    }
                }
                
                console.log(`   📈 Total RUTs encontrados: ${rutCount}`);
                console.log(`   📍 Columnas con RUTs: ${rutColumns.map(c => String.fromCharCode(65+c)).join(', ')}`);
            });

            const normalizedRUT = this.normalizeRUT(rut);
            console.log('\n🔧 RUT normalizado para búsqueda:', normalizedRUT);
            
            const couponInfo = this.findCouponInfoInExcel(this.currentWorkbook, normalizedRUT);
            
            console.log('\n📋 Resultado final de búsqueda:', couponInfo);
            console.log('===== FIN DIAGNÓSTICO =====\n');
            
            this.displaySimplifiedResults(couponInfo);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error al buscar cupones:', error);
            this.showAlert('❌ Error al procesar la búsqueda', 'error');
            this.showLoading(false);
        }
    }

    // Función helper para detectar si algo parece un RUT
    looksLikeRUT(value) {
        if (!value) return false;
        const str = String(value).trim();
        // Patrón básico: 7-8 dígitos, seguido de - y dígito o K
        return /^\d{7,8}-[\dkK]$/.test(str);
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
        console.log('🔍 Buscando en hoja GENERAL...');
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        // Variables para sumar múltiples transacciones del mismo RUT
        let encontrado = false;
        let datosUsuario = {
            rut: rut,
            nombres: '',
            apellidos: '',
            establecimiento: '',
            lipigas: { '5': 0, '11': 0, '15': 0, '45': 0 },
            abastible: { '5': 0, '11': 0, '15': 0, '45': 0 },
            usadoEnElMes: 0,
            disponible: 4
        };
        
        // Buscar TODAS las filas que coincidan con el RUT
        for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[3]) { // Columna D (índice 3) - RUT AFILIADO
                const rutEnFila = String(row[3]).trim();
                const rutNormalizado = this.normalizeRUT(rutEnFila);
                
                if (rutNormalizado === rut) {
                    console.log(`✅ RUT encontrado en GENERAL fila ${i + 1}`);
                    encontrado = true;
                    
                    // PRIMERA VEZ: Guardar datos básicos del usuario
                    if (!datosUsuario.nombres) {
                        datosUsuario.nombres = row[4] || '';     // Columna E (NOMBRES)
                        datosUsuario.apellidos = row[5] || '';   // Columna F (APELLIDOS)
                        datosUsuario.establecimiento = row[6] || ''; // Columna G (CENTRO)
                        datosUsuario.usadoEnElMes = this.parseNumber(row[22]) || 0; // Columna W (USADO EN EL MES)
                        datosUsuario.disponible = this.parseNumber(row[23]) || 0;   // Columna X (DISPONIBLE)
                    }
                    
                    // SIEMPRE: Sumar cupones de esta transacción
                    datosUsuario.lipigas['5'] += this.parseNumber(row[8]) || 0;   // Columna I
                    datosUsuario.lipigas['11'] += this.parseNumber(row[9]) || 0;  // Columna J
                    datosUsuario.lipigas['15'] += this.parseNumber(row[10]) || 0; // Columna K
                    datosUsuario.lipigas['45'] += this.parseNumber(row[11]) || 0; // Columna L
                    
                    datosUsuario.abastible['5'] += this.parseNumber(row[12]) || 0;  // Columna M
                    datosUsuario.abastible['11'] += this.parseNumber(row[13]) || 0; // Columna N
                    datosUsuario.abastible['15'] += this.parseNumber(row[14]) || 0; // Columna O
                    datosUsuario.abastible['45'] += this.parseNumber(row[15]) || 0; // Columna P
                }
            }
        }
        
        if (encontrado) {
            console.log(`✅ Total transacciones sumadas para RUT ${rut}:`);
            console.log(`📊 USADO EN EL MES: ${datosUsuario.usadoEnElMes}`);
            console.log(`📊 DISPONIBLE: ${datosUsuario.disponible}`);
            console.log(`⛽ LIPIGAS Total:`, datosUsuario.lipigas);
            console.log(`🔥 ABASTIBLE Total:`, datosUsuario.abastible);
            
            return {
                encontrado: true,
                rut: datosUsuario.rut,
                nombres: datosUsuario.nombres,
                apellidos: datosUsuario.apellidos,
                establecimiento: datosUsuario.establecimiento,
                lipigas: datosUsuario.lipigas,
                abastible: datosUsuario.abastible,
                usadoEnElMes: datosUsuario.usadoEnElMes,
                disponible: datosUsuario.disponible
            };
        }
        
        console.log('❌ RUT no encontrado en hoja GENERAL');
        return null;
    }

    findInCuponesDisponibles(sheet, rut) {
        console.log('🔍 Buscando en hoja CUPONES DISPONIBLES...');
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
            console.log('❌ RUT no encontrado en CUPONES DISPONIBLES');
            return null;
        }

        const row = jsonData[foundRow];
        console.log(`✅ RUT encontrado en CUPONES DISPONIBLES fila ${foundRow + 1}`);
        
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

        // Calcular totales usados por empresa
        const lipigasUsados = (couponInfo.lipigas['5'] || 0) + (couponInfo.lipigas['11'] || 0) + 
                             (couponInfo.lipigas['15'] || 0) + (couponInfo.lipigas['45'] || 0);
        const abastibleUsados = (couponInfo.abastible['5'] || 0) + (couponInfo.abastible['11'] || 0) + 
                               (couponInfo.abastible['15'] || 0) + (couponInfo.abastible['45'] || 0);

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
                            ${couponInfo.usadoEnElMes || 0}
                        </div>
                        <div style="color: var(--health-error); font-weight: 600; font-size: 1.2rem;">
                            USADO EN EL MES
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 2rem; background: rgba(34, 197, 94, 0.05); border-radius: 1.5rem; border: 2px solid rgba(34, 197, 94, 0.1);">
                        <div style="font-size: 3rem; font-weight: 800; color: var(--health-success); margin-bottom: 0.5rem; font-family: var(--font-display);">
                            ${couponInfo.disponible || 4}
                        </div>
                        <div style="color: var(--health-success); font-weight: 600; font-size: 1.2rem;">
                            DISPONIBLE
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detalle por Empresa -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">
                
                <!-- LIPIGAS -->
                <div style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.05), var(--white)); padding: 2rem; border-radius: 1.5rem; border: 2px solid rgba(14, 165, 233, 0.2); box-shadow: var(--shadow-lg);">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h3 style="color: #0ea5e9; font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">⛽ LIPIGAS</h3>
                        <div style="font-size: 2rem; font-weight: 700; color: #0ea5e9;">
                            Total Usado: ${lipigasUsados}
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div style="text-align: center; padding: 1.5rem; background: rgba(14, 165, 233, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #0ea5e9; margin-bottom: 0.5rem;">
                                ${couponInfo.lipigas['5'] || 0}
                            </div>
                            <div style="color: #0369a1; font-weight: 600; font-size: 0.9rem;">
                                5 KG
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 1.5rem; background: rgba(14, 165, 233, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #0ea5e9; margin-bottom: 0.5rem;">
                                ${couponInfo.lipigas['11'] || 0}
                            </div>
                            <div style="color: #0369a1; font-weight: 600; font-size: 0.9rem;">
                                11 KG
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 1.5rem; background: rgba(14, 165, 233, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #0ea5e9; margin-bottom: 0.5rem;">
                                ${couponInfo.lipigas['15'] || 0}
                            </div>
                            <div style="color: #0369a1; font-weight: 600; font-size: 0.9rem;">
                                15 KG
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 1.5rem; background: rgba(14, 165, 233, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #0ea5e9; margin-bottom: 0.5rem;">
                                ${couponInfo.lipigas['45'] || 0}
                            </div>
                            <div style="color: #0369a1; font-weight: 600; font-size: 0.9rem;">
                                45 KG
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ABASTIBLE -->
                <div style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.05), var(--white)); padding: 2rem; border-radius: 1.5rem; border: 2px solid rgba(249, 115, 22, 0.2); box-shadow: var(--shadow-lg);">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h3 style="color: #f97316; font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">🔥 ABASTIBLE</h3>
                        <div style="font-size: 2rem; font-weight: 700; color: #f97316;">
                            Total Usado: ${abastibleUsados}
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div style="text-align: center; padding: 1.5rem; background: rgba(249, 115, 22, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #f97316; margin-bottom: 0.5rem;">
                                ${couponInfo.abastible['5'] || 0}
                            </div>
                            <div style="color: #c2410c; font-weight: 600; font-size: 0.9rem;">
                                5 KG
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 1.5rem; background: rgba(249, 115, 22, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #f97316; margin-bottom: 0.5rem;">
                                ${couponInfo.abastible['11'] || 0}
                            </div>
                            <div style="color: #c2410c; font-weight: 600; font-size: 0.9rem;">
                                11 KG
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 1.5rem; background: rgba(249, 115, 22, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #f97316; margin-bottom: 0.5rem;">
                                ${couponInfo.abastible['15'] || 0}
                            </div>
                            <div style="color: #c2410c; font-weight: 600; font-size: 0.9rem;">
                                15 KG
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 1.5rem; background: rgba(249, 115, 22, 0.1); border-radius: 1rem;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #f97316; margin-bottom: 0.5rem;">
                                ${couponInfo.abastible['45'] || 0}
                            </div>
                            <div style="color: #c2410c; font-weight: 600; font-size: 0.9rem;">
                                45 KG
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
        // Búsqueda de cupones
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCoupons());
        document.getElementById('rutInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCoupons();
        });
        document.getElementById('rutInput').addEventListener('input', (e) => this.formatRUT(e));

        // Panel administrativo
        document.getElementById('adminBtn').addEventListener('click', () => this.openAdminModal());

        // Autenticación
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Información de Google Sheets (reemplaza upload)
        document.getElementById('uploadBtn').addEventListener('click', () => this.showGoogleSheetsInfo());

        // Cerrar modales
        document.querySelector('.close-btn').addEventListener('click', () => this.closeAdminModal());
        document.getElementById('adminLoginModal').addEventListener('click', (e) => {
            if (e.target.id === 'adminLoginModal') this.closeAdminModal();
        });

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
