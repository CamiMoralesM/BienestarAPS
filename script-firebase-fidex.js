/**
 * BIENESTAR APS - SISTEMA DE CUPONES DE GAS
 * Versión 3.2 - Firebase Storage CORREGIDO (Sin errores CORS)
 */

class BienestarAPSSystem {
    constructor() {
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFirebase();
    }

    async setupFirebase() {
        // Esperar a que Firebase esté disponible
        if (window.firebase) {
            this.auth = window.firebase.auth();
            this.storage = window.firebase.storage();
            
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    console.log('👤 Usuario autenticado:', user.email);
                    this.showAdminPanel();
                    this.loadExcelFromFirebase(); // Cargar Excel automáticamente
                } else {
                    console.log('👤 Usuario no autenticado');
                    this.showLoginForm();
                    this.loadExcelFromFirebase(); // Cargar Excel para usuarios no autenticados también
                }
            });
            
            // Cargar Excel al inicializar para usuarios no logueados
            this.loadExcelFromFirebase();
        }
    }

    bindEvents() {
        // Búsqueda de cupones
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCoupons());
        document.getElementById('rutInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCoupons();
        });
        document.getElementById('rutInput').addEventListener('input', (e) => this.formatRUT(e));

        // Panel administrativo
        document.getElementById('adminBtn').addEventListener('click', () => this.openAdminModal());

        // Login
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('adminPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Cambio de contraseña
        document.getElementById('changePasswordBtn').addEventListener('click', () => this.showChangePasswordForm());
        document.getElementById('updatePasswordBtn').addEventListener('click', () => this.handlePasswordChange());
        document.getElementById('cancelPasswordBtn').addEventListener('click', () => this.hideChangePasswordForm());

        // Subida de archivos
        document.getElementById('excelFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadToFirebase());

        // Cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAdminModal();
        });

        document.querySelector('.close-btn').addEventListener('click', () => this.closeAdminModal());

        document.getElementById('adminLoginModal').addEventListener('click', (e) => {
            if (e.target.id === 'adminLoginModal') this.closeAdminModal();
        });
    }

    // ========================================
    // AUTENTICACIÓN FIREBASE
    // ========================================
    
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
            console.error('Error de autenticación:', error);
            let errorMessage = '❌ Credenciales incorrectas';
            
            switch (error.code) {
                case 'auth/too-many-requests':
                    errorMessage = '⏰ Demasiados intentos. Espere unos minutos';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '🌐 Error de conexión. Verifique internet';
                    break;
            }
            
            this.showError(errorDiv, errorMessage);
        }
        
        this.showLoading(false);
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.showAlert('🚪 Sesión cerrada exitosamente', 'info');
            this.closeAdminModal();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            this.showAlert('❌ Error al cerrar sesión', 'error');
        }
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('passwordError');
        const successDiv = document.getElementById('passwordSuccess');

        this.hideError(errorDiv);
        this.hideError(successDiv);

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showError(errorDiv, '📝 Complete todos los campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError(errorDiv, '❌ Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            this.showError(errorDiv, '📏 Mínimo 6 caracteres');
            return;
        }

        this.showLoading(true);

        try {
            const user = this.auth.currentUser;
            const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            
            this.showSuccess(successDiv, '✅ Contraseña actualizada exitosamente');
            
            setTimeout(() => {
                this.hideChangePasswordForm();
                this.showAlert('🔑 Contraseña actualizada correctamente', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            let errorMessage = '❌ Error al cambiar contraseña';
            
            switch (error.code) {
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = '❌ Contraseña actual incorrecta';
                    break;
                case 'auth/weak-password':
                    errorMessage = '💪 La nueva contraseña es muy débil';
                    break;
            }
            
            this.showError(errorDiv, errorMessage);
        }
        
        this.showLoading(false);
    }

    showChangePasswordForm() {
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('changePasswordForm').style.display = 'block';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    }

    hideChangePasswordForm() {
        document.getElementById('changePasswordForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        this.hideError(document.getElementById('passwordError'));
        this.hideError(document.getElementById('passwordSuccess'));
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('changePasswordForm').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('changePasswordForm').style.display = 'none';
        this.updateFilesList();
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
        this.hideError(document.getElementById('passwordError'));
        this.hideError(document.getElementById('passwordSuccess'));
    }

    // ========================================
    // RUT VALIDATION Y FORMAT
    // ========================================
    
    formatRUT(e) {
        let value = e.target.value.replace(/[^0-9kK]/g, '');
        if (value.length > 1) {
            const rut = value.slice(0, -1);
            const dv = value.slice(-1);
            value = rut + '-' + dv;
        }
        e.target.value = value;
    }

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
            // Si no hay workbook, intentar cargar desde Firebase
            if (!this.currentWorkbook) {
                await this.loadExcelFromFirebase();
            }

            if (!this.currentWorkbook) {
                this.showAlert('📊 No hay datos disponibles. El administrador debe subir el archivo Excel', 'info');
                this.showLoading(false);
                return;
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

    findCouponInfoInExcel(workbook, rut) {
        const sheet = workbook.Sheets['CUPONES DISPONIBLES'];
        if (!sheet) {
            return this.findUserInBaseDatos(workbook, rut);
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        let foundRow = null;
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[2] && this.normalizeRUT(row[2]) === rut) { // Columna C
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

    // ========================================
    // FIREBASE STORAGE - CORREGIDO SIN CORS
    // ========================================

    handleFileSelect(e) {
        if (!this.currentUser) {
            this.showAlert('🔐 Debe estar autenticado para subir archivos', 'error');
            return;
        }

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

    async uploadToFirebase() {
        if (!this.currentUser) {
            this.showAlert('🔐 Debe estar autenticado', 'error');
            return;
        }

        if (!this.selectedFile) {
            this.showAlert('📁 Seleccione un archivo', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Usar nombre fijo para evitar problemas de URLs
            const fileName = 'cupones-gas-data.xlsx';
            const storageRef = this.storage.ref().child(fileName);
            
            // Subir archivo
            const snapshot = await storageRef.put(this.selectedFile);
            console.log('📤 Archivo subido a Firebase Storage');
            
            // Obtener URL de descarga pública
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            // También guardar localmente como cache
            const workbook = await this.readExcelFile(this.selectedFile);
            const fileData = {
                name: this.selectedFile.name,
                uploadDate: new Date().toISOString(),
                uploadedBy: this.currentUser.email,
                downloadURL: downloadURL,
                workbook: workbook
            };
            
            localStorage.setItem('gasSystemData', JSON.stringify(fileData));
            this.currentWorkbook = workbook;
            
            this.updateFilesList();
            this.showAlert('✅ Archivo subido a Firebase exitosamente', 'success');
            
            document.getElementById('excelFile').value = '';
            document.getElementById('uploadBtn').disabled = true;
            this.selectedFile = null;
            
        } catch (error) {
            console.error('Error subiendo a Firebase:', error);
            this.showAlert('❌ Error al subir archivo. Verifique configuración Firebase', 'error');
        }

        this.showLoading(false);
    }

    async loadExcelFromFirebase() {
        try {
            // Primero intentar desde caché local
            const cachedData = localStorage.getItem('gasSystemData');
            if (cachedData) {
                const fileData = JSON.parse(cachedData);
                if (fileData.workbook) {
                    this.currentWorkbook = fileData.workbook;
                    console.log('📊 Excel cargado desde caché local');
                    return;
                }
            }

            // Si no hay caché, intentar descargar desde Firebase
            const fileName = 'cupones-gas-data.xlsx';
            const storageRef = this.storage.ref().child(fileName);
            
            const downloadURL = await storageRef.getDownloadURL();
            
            // Descargar y procesar
            const response = await fetch(downloadURL);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            
            this.currentWorkbook = workbook;
            
            // Guardar en caché local
            const fileData = {
                name: fileName,
                downloadDate: new Date().toISOString(),
                downloadURL: downloadURL,
                workbook: workbook
            };
            localStorage.setItem('gasSystemData', JSON.stringify(fileData));
            
            console.log('📥 Excel descargado desde Firebase Storage');
            
        } catch (error) {
            console.log('ℹ️ No hay Excel en Firebase Storage o error de acceso:', error.message);
            // No mostrar error al usuario, es normal al inicio
        }
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    if (typeof XLSX === 'undefined') {
                        reject(new Error('XLSX no disponible'));
                        return;
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    updateFilesList() {
        const filesList = document.getElementById('filesList');
        const storedData = localStorage.getItem('gasSystemData');

        if (storedData) {
            try {
                const fileData = JSON.parse(storedData);
                const dateKey = fileData.uploadDate ? 'uploadDate' : 'downloadDate';
                const date = new Date(fileData[dateKey]).toLocaleDateString('es-CL');
                const time = new Date(fileData[dateKey]).toLocaleTimeString('es-CL');
                const action = fileData.uploadDate ? 'Subido' : 'Descargado';
                
                filesList.innerHTML = `
                    <div class="file-item">
                        <div>
                            <div class="file-name">📄 ${fileData.name}</div>
                            <div class="file-date">📅 ${action}: ${date} ${time}</div>
                            ${fileData.uploadedBy ? `<div class="file-date">👤 Por: ${fileData.uploadedBy}</div>` : ''}
                            <div class="file-status">☁️ Almacenado en Firebase Storage</div>
                        </div>
                        <button class="delete-file-btn" onclick="bienestarSystem.deleteFile()">
                            🗑️ Eliminar
                        </button>
                    </div>
                `;
            } catch (error) {
                filesList.innerHTML = '<p class="no-files">❌ Error cargando archivos</p>';
            }
        } else {
            filesList.innerHTML = '<p class="no-files">📂 No hay archivos cargados</p>';
        }
    }

    async deleteFile() {
        if (!this.currentUser) {
            this.showAlert('🔐 Debe estar autenticado', 'error');
            return;
        }

        if (confirm('¿Eliminar archivo de Firebase Storage? No se puede deshacer.')) {
            try {
                const fileName = 'cupones-gas-data.xlsx';
                const storageRef = this.storage.ref().child(fileName);
                await storageRef.delete();
                console.log('🗑️ Archivo eliminado de Firebase Storage');
            } catch (error) {
                console.error('Error eliminando de Firebase:', error);
            }

            localStorage.removeItem('gasSystemData');
            this.currentWorkbook = null;
            this.updateFilesList();
            this.showAlert('✅ Archivo eliminado', 'success');
            
            document.getElementById('resultsSection').style.display = 'none';
        }
    }

    // ========================================
    // UTILIDADES
    // ========================================

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
        }, 6000);

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

    showSuccess(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
}

// ========================================
// FUNCIONES GLOBALES
// ========================================

function closeAdminModal() {
    bienestarSystem.closeAdminModal();
}

// ========================================
// INICIALIZAR SISTEMA
// ========================================

let bienestarSystem;

document.addEventListener('DOMContentLoaded', function() {
    bienestarSystem = new BienestarAPSSystem();
    
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
    
    console.log('🏥 Sistema Bienestar APS v3.2 - Firebase Storage Corregido');
    console.log('📧 Admin: Bienestar.aps@cmpuentealto.cl');
    console.log('🔑 Password: 20BAPS25');
    console.log('☁️ Firebase Storage: Habilitado sin CORS');
});

window.bienestarSystem = bienestarSystem;
