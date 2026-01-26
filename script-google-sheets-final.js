/**
 * BIENESTAR APS - SISTEMA DE CUPONES DE GAS
 * Versión Google Sheets - CON TU ENLACE ESPECÍFICO
 */

class BienestarAPSSystem {
    constructor() {
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        // TU GOOGLE SHEETS - Se actualiza automáticamente cuando editas online
        this.EXCEL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlgHF7u5CO6n4jaVol3Ov9a1jwgwyGg_ev3Gu3M1Q0fakiRhDDukjByTUjleeIPQ/pubhtml';
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

            // Descargar desde Google Sheets
            const response = await fetch(this.EXCEL_URL, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache' // Siempre obtener la versión más reciente
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: No se puede acceder a Google Sheets`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            
            this.currentWorkbook = workbook;
            
            // Guardar en caché con timestamp
            const fileData = {
                name: 'cupones-gas-data.xlsx',
                downloadDate: new Date().toISOString(),
                source: 'google-sheets',
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

            const normalizedRUT = this.normalizeRUT(rut);
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
    console.log('🔍 Buscando en hoja GENERAL...');
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

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

    for (let i = 5; i < jsonData.length; i++) {
        const row = jsonData[i];

        if (row && row[4]) { // Columna E - RUT
            const rutEnFila = String(row[4]).trim();
            const rutNormalizado = this.normalizeRUT(rutEnFila);

            if (rutNormalizado === rut) {
                encontrado = true;
                console.log(`✅ RUT encontrado en GENERAL fila ${i + 1}`);

                // Guardar datos solo la primera vez
                if (!datosUsuario.nombres) {
                    datosUsuario.nombres = row[5] || '';
                    datosUsuario.apellidos = row[6] || '';
                    datosUsuario.establecimiento = row[7] || '';

                    // AF - USADO EN EL MES
                    const usadoExcel = this.parseNumber(row[31]);
                    datosUsuario.usadoEnElMes = Number.isFinite(usadoExcel) ? usadoExcel : 0;

                    // AG - DISPONIBLE (AQUÍ ESTABA EL ERROR)
                    const disponibleExcel = this.parseNumber(row[32]);
                    datosUsuario.disponible = Number.isFinite(disponibleExcel)
                        ? disponibleExcel
                        : 4;
                }

                // Sumar cupones Lipigas
                datosUsuario.lipigas['5'] += this.parseNumber(row[9]) || 0;
                datosUsuario.lipigas['11'] += this.parseNumber(row[10]) || 0;
                datosUsuario.lipigas['15'] += this.parseNumber(row[11]) || 0;
                datosUsuario.lipigas['45'] += this.parseNumber(row[12]) || 0;

                // Sumar cupones Abastible
                datosUsuario.abastible['5'] += this.parseNumber(row[13]) || 0;
                datosUsuario.abastible['11'] += this.parseNumber(row[14]) || 0;
                datosUsuario.abastible['15'] += this.parseNumber(row[15]) || 0;
                datosUsuario.abastible['45'] += this.parseNumber(row[16]) || 0;
            }
        }
    }

    if (!encontrado) {
        console.log('❌ RUT no encontrado en hoja GENERAL');
        return null;
    }

    console.log(`📊 USADO EN EL MES: ${datosUsuario.usadoEnElMes}`);
    console.log(`📊 DISPONIBLE: ${datosUsuario.disponible}`);

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
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin-bottom: 2rem;">

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
