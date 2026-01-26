/**
 * BIENESTAR APS - VERSIÓN GOOGLE DRIVE (SIN CORS)
 * 100% GRATIS + SIN problemas de CORS
 */

class BienestarAPSSystem {
    constructor() {
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        // URL pública de Google Drive (el admin la actualiza aquí)
        this.EXCEL_URL = 'https://drive.google.com/uc?id=TU_FILE_ID_AQUI&export=download';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFirebase();
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
                // Cargar Excel desde Google Drive (público)
                this.loadExcelFromGoogleDrive();
            });
            
            this.loadExcelFromGoogleDrive();
        }
    }

    // ========================================
    // GOOGLE DRIVE - SIN CORS ISSUES
    // ========================================

    async loadExcelFromGoogleDrive() {
        try {
            // Primero intentar caché local
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook && this.isRecentCache(fileData.downloadDate)) {
                    this.currentWorkbook = fileData.workbook;
                    console.log('📊 Excel cargado desde caché local');
                    return true;
                }
            }

            // Descargar desde Google Drive
            console.log('📥 Descargando Excel desde Google Drive...');
            
            const response = await fetch(this.EXCEL_URL, {
                method: 'GET',
                mode: 'cors' // Google Drive tiene CORS configurado
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            
            this.currentWorkbook = workbook;
            
            // Guardar en caché
            const fileData = {
                name: 'cupones-gas-data.xlsx',
                downloadDate: new Date().toISOString(),
                source: 'google-drive',
                workbook: workbook
            };
            localStorage.setItem('gasSystemData', JSON.stringify(fileData));
            
            console.log('✅ Excel descargado desde Google Drive');
            return true;
            
        } catch (error) {
            console.log('ℹ️ No se pudo cargar Excel desde Google Drive:', error.message);
            
            // Si falla Google Drive, intentar datos del caché aunque sean viejos
            return this.loadFromOldCache();
        }
    }

    isRecentCache(downloadDate) {
        if (!downloadDate) return false;
        const cacheAge = Date.now() - new Date(downloadDate).getTime();
        const maxAge = 60 * 60 * 1000; // 1 hora
        return cacheAge < maxAge;
    }

    loadFromOldCache() {
        try {
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook) {
                    this.currentWorkbook = fileData.workbook;
                    console.log('📊 Usando caché antiguo (sin conexión a Google Drive)');
                    this.showAlert('ℹ️ Usando datos guardados localmente. Puede que no sean los más recientes.', 'info');
                    return true;
                }
            }
            return false;
        } catch {
            return false;
        }
    }

    // ========================================
    // SUBIDA DE ARCHIVOS - INSTRUCCIONES PARA GOOGLE DRIVE
    // ========================================

    async uploadToGoogleDrive() {
        if (!this.currentUser) {
            this.showAlert('🔐 Debe estar autenticado', 'error');
            return;
        }

        if (!this.selectedFile) {
            this.showAlert('📁 Seleccione un archivo', 'error');
            return;
        }

        // En lugar de subir automáticamente, mostrar instrucciones
        this.showGoogleDriveInstructions();
    }

    showGoogleDriveInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>📁 Instrucciones para Subir a Google Drive</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="padding: 1rem;">
                        <h4>🔄 Pasos para actualizar el Excel:</h4>
                        <ol style="text-align: left; padding-left: 2rem;">
                            <li><strong>Sube el archivo</strong> a Google Drive</li>
                            <li><strong>Click derecho</strong> → "Obtener enlace"</li>
                            <li><strong>Cambiar permisos</strong> → "Cualquier persona con el enlace"</li>
                            <li><strong>Copiar ID</strong> del enlace (entre /d/ y /view)</li>
                            <li><strong>Actualizar código</strong> con el nuevo ID</li>
                            <li><strong>Recargar página</strong> para ver cambios</li>
                        </ol>
                        
                        <div style="background: #f5f5f5; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                            <strong>📝 Ejemplo de enlace:</strong><br>
                            <small>https://drive.google.com/file/d/<span style="background: yellow;">1ABC123XYZ</span>/view</small><br>
                            <strong>📋 ID a copiar:</strong> <span style="background: yellow;">1ABC123XYZ</span>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 1rem; border-radius: 0.5rem;">
                            <strong>💡 Ventajas Google Drive:</strong><br>
                            ✅ Completamente GRATIS<br>
                            ✅ Sin problemas de CORS<br>
                            ✅ Accesible desde cualquier dispositivo<br>
                            ✅ El archivo siempre está disponible
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // ========================================
    // RESTO DEL CÓDIGO IGUAL (búsqueda, validación, etc.)
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
            if (!this.currentWorkbook) {
                const loaded = await this.loadExcelFromGoogleDrive();
                if (!loaded) {
                    this.showAlert('📊 No hay datos disponibles. Contacte al administrador.', 'warning');
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

    // [Incluir aquí todos los demás métodos del código original]
    // validateRUT, normalizeRUT, findCouponInfoInExcel, etc.

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
        const sheet = workbook.Sheets['CUPONES DISPONIBLES'];
        if (!sheet) {
            return this.findUserInBaseDatos(workbook, rut);
        }

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
            return this.findUserInBaseDatos(workbook, rut);
        }

        const row = jsonData[foundRow];
        
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
            disponible: this.parseNumber(row[14]) || 4
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

            <div style="background: linear-gradient(135deg, var(--white), var(--gray-25)); padding: 2.5rem; border-radius: 1.5rem; border: 1px solid var(--gray-200); box-shadow: var(--shadow-lg);">
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
        `;

        resultsContent.innerHTML = html;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Métodos de UI y eventos
    bindEvents() {
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCoupons());
        document.getElementById('rutInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCoupons();
        });
        document.getElementById('rutInput').addEventListener('input', (e) => this.formatRUT(e));
        document.getElementById('adminBtn').addEventListener('click', () => this.openAdminModal());
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('excelFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadToGoogleDrive());

        document.querySelector('.close-btn').addEventListener('click', () => this.closeAdminModal());
        document.getElementById('adminLoginModal').addEventListener('click', (e) => {
            if (e.target.id === 'adminLoginModal') this.closeAdminModal();
        });
    }

    // Métodos de autenticación y UI
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

    handleFileSelect(e) {
        const file = e.target.files[0];
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (file && file.name.match(/\.(xlsx|xls)$/)) {
            uploadBtn.disabled = false;
            this.selectedFile = file;
            this.showAlert(`📄 Archivo seleccionado: ${file.name}`, 'success');
        } else {
            uploadBtn.disabled = true;
            this.selectedFile = null;
            if (file) {
                this.showAlert('❌ Seleccione un archivo Excel (.xlsx o .xls)', 'error');
            }
        }
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
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
            if (!alert.id.includes('Error') && !alert.id.includes('Success')) {
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
    
    console.log('🏥 Sistema Bienestar APS - Google Drive Version');
    console.log('💚 100% GRATIS + SIN problemas CORS');
    console.log('📧 Admin: Bienestar.aps@cmpuentealto.cl');
});

window.bienestarSystem = bienestarSystem;
