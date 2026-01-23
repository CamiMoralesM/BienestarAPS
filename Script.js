/**
 * BIENESTAR APS - SISTEMA DE CUPONES DE GAS
 * JavaScript con Firebase Authentication y Procesamiento de Excel
 * Versión: 2.0 - Health Edition
 */

// Sistema de Cupones de Gas con Firebase Auth - Tema Salud
class HealthGasSystemManager {
    constructor() {
        this.currentData = null;
        this.affiliatesData = [];
        this.transactionsData = [];
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredData();
        this.updateFilesList();
        this.setupFirebaseAuth();
    }

    setupFirebaseAuth() {
        // Monitor authentication state
        if (window.onAuthStateChanged) {
            window.onAuthStateChanged(window.firebaseAuth, (user) => {
                this.currentUser = user;
                if (user) {
                    console.log('Usuario autenticado:', user.email);
                    this.showAdminPanel();
                } else {
                    console.log('Usuario no autenticado');
                    this.showLoginForm();
                }
            });
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

        // Change Password
        document.getElementById('changePasswordBtn').addEventListener('click', () => this.showChangePasswordForm());
        document.getElementById('updatePasswordBtn').addEventListener('click', () => this.handlePasswordChange());
        document.getElementById('cancelPasswordBtn').addEventListener('click', () => this.hideChangePasswordForm());

        // Subida de archivos
        document.getElementById('excelFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFile());

        // Cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAdminModal();
        });

        document.getElementById('adminLoginModal').addEventListener('click', (e) => {
            if (e.target.id === 'adminLoginModal') this.closeAdminModal();
        });
    }

    // ========================================
    // AUTHENTICATION METHODS
    // ========================================

    async handleLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('loginError');

        if (!email || !password) {
            this.showError(errorDiv, 'Por favor complete todos los campos');
            return;
        }

        this.showLoading(true);
        
        try {
            await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
            this.hideError(errorDiv);
            this.showAlert('✅ Acceso autorizado exitosamente', 'success');
        } catch (error) {
            console.error('Error de autenticación:', error);
            let errorMessage = 'Error de autenticación';
            
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = '❌ Credenciales incorrectas';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = '⏰ Demasiados intentos fallidos. Intente más tarde';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '🌐 Error de conexión. Verifique su internet';
                    break;
                default:
                    errorMessage = '❌ Error de autenticación. Intente nuevamente';
            }
            
            this.showError(errorDiv, errorMessage);
        }
        
        this.showLoading(false);
    }

    async handleLogout() {
        try {
            await window.signOut(window.firebaseAuth);
            this.showAlert('🚪 Sesión cerrada exitosamente', 'info');
            this.closeAdminModal();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            this.showAlert('❌ Error al cerrar sesión', 'error');
        }
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
            this.showError(errorDiv, '❌ Las contraseñas nuevas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            this.showError(errorDiv, '📏 La contraseña debe tener al menos 6 caracteres');
            return;
        }

        this.showLoading(true);

        try {
            // Re-authenticate first
            const user = window.firebaseAuth.currentUser;
            const email = user.email;
            
            await window.signInWithEmailAndPassword(window.firebaseAuth, email, currentPassword);
            
            // Update password
            await window.updatePassword(user, newPassword);
            
            this.showSuccess(successDiv, '✅ Contraseña actualizada exitosamente');
            
            setTimeout(() => {
                this.hideChangePasswordForm();
                this.showAlert('🔑 Contraseña actualizada correctamente', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            let errorMessage = 'Error al cambiar contraseña';
            
            switch (error.code) {
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = '❌ Contraseña actual incorrecta';
                    break;
                case 'auth/weak-password':
                    errorMessage = '💪 La nueva contraseña es muy débil';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = '🔄 Debe iniciar sesión nuevamente para cambiar la contraseña';
                    break;
                default:
                    errorMessage = '❌ Error al actualizar contraseña. Intente nuevamente';
            }
            
            this.showError(errorDiv, errorMessage);
        }
        
        this.showLoading(false);
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
    // RUT VALIDATION AND FORMATTING
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
    // COUPON SEARCH
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
            this.showAlert('❌ RUT inválido. Verifique el formato (Ej: 12345678-9)', 'error');
            rutInput.focus();
            return;
        }

        if (!this.currentData || !this.transactionsData.length) {
            this.showAlert('📊 No hay datos cargados. El administrador debe subir un archivo Excel actualizado', 'info');
            return;
        }

        this.showLoading(true);

        try {
            const normalizedRUT = this.normalizeRUT(rut);
            const userInfo = this.findUserInfo(normalizedRUT);
            
            if (!userInfo) {
                this.showAlert('🔍 RUT no encontrado en la base de datos de afiliados', 'error');
                this.showLoading(false);
                return;
            }

            const couponsInfo = this.calculateCouponsInfo(normalizedRUT);
            this.displayResults(userInfo, couponsInfo);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error al buscar cupones:', error);
            this.showAlert('❌ Error al procesar la búsqueda. Verifique los datos cargados', 'error');
            this.showLoading(false);
        }
    }

    findUserInfo(rut) {
        return this.affiliatesData.find(affiliate => 
            affiliate.rut && this.normalizeRUT(affiliate.rut) === rut
        );
    }

calculateCouponsInfo(rut) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const result = {
        lipigas: { 5: 0, 11: 0, 15: 0, 45: 0 },
        abastible: { 5: 0, 11: 0, 15: 0, 45: 0 },
        usados: 0,
        disponibles: 4
    };

    const monthlyTransactions = this.transactionsData.filter(t => {
        if (!t.fecha) return false;
        const d = new Date(t.fecha);
        return (
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear &&
            this.normalizeRUT(t.rutAfiliado) === rut
        );
    });

    monthlyTransactions.forEach(t => {
        const concepto = (t.concepto || '').toLowerCase();

        if (concepto.includes('lipigas')) {
            result.lipigas[5]  += Number(t['05 KILOS']) || 0;
            result.lipigas[11] += Number(t['11 KILOS']) || 0;
            result.lipigas[15] += Number(t['15 KILOS']) || 0;
            result.lipigas[45] += Number(t['45 KILOS']) || 0;
        }

        if (concepto.includes('abastible')) {
            result.abastible[5]  += Number(t['05 KILOS']) || 0;
            result.abastible[11] += Number(t['11 KILOS']) || 0;
            result.abastible[15] += Number(t['15 KILOS']) || 0;
            result.abastible[45] += Number(t['45 KILOS']) || 0;
        }
    });

    result.usados = monthlyTransactions.length;
    result.disponibles = Math.max(0, 4 - result.usados);

    return result;
}

    renderCylinderInfo(weight, used, available) {
        return `
            <div class="cylinder-info">
                <div class="cylinder-weight">${weight} KG</div>
                <div class="cylinder-used">
                    Usados: ${used}
                </div>
                <div class="cylinder-available">
                    Disponibles: ${available}
                </div>
            </div>
        `;
    }

    // ========================================
    // FILE MANAGEMENT (requires authentication)
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
                this.showAlert('❌ Por favor seleccione un archivo Excel (.xlsx o .xls)', 'error');
            }
        }
    }

    async uploadFile() {
        if (!this.currentUser) {
            this.showAlert('🔐 Debe estar autenticado para subir archivos', 'error');
            return;
        }

        if (!this.selectedFile) {
            this.showAlert('📁 Por favor seleccione un archivo', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const data = await this.readExcelFile(this.selectedFile);
            
            if (data) {
                const fileData = {
                    name: this.selectedFile.name,
                    uploadDate: new Date().toISOString(),
                    uploadedBy: this.currentUser.email,
                    data: data
                };
                
                localStorage.setItem('gasSystemData', JSON.stringify(fileData));
                this.currentData = data;
                this.processExcelData(data);
                
                this.updateFilesList();
                this.showAlert('✅ Archivo subido y procesado exitosamente', 'success');
                
                document.getElementById('excelFile').value = '';
                document.getElementById('uploadBtn').disabled = true;
                this.selectedFile = null;
            }
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            this.showAlert('❌ Error al procesar el archivo. Verifique que sea un archivo Excel válido', 'error');
        }

        this.showLoading(false);
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    if (typeof XLSX === 'undefined') {
                        reject(new Error('Librería XLSX no disponible. Intente recargar la página.'));
                        return;
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const processedData = this.extractDataFromWorkbook(workbook);
                    resolve(processedData);
                    
                } catch (error) {
                    console.error('Error procesando Excel:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    // ========================================
    // EXCEL DATA PROCESSING
    // ========================================

    extractDataFromWorkbook(workbook) {
        const result = {
            affiliates: [],
            transactions: [],
            summary: {},
            sheetNames: workbook.SheetNames
        };

        try {
            if (workbook.Sheets['BASE DE DATOS']) {
                result.affiliates = this.processAffiliatesSheet(workbook.Sheets['BASE DE DATOS']);
            }

            if (workbook.Sheets['GENERAL']) {
                result.transactions = this.processTransactionsSheet(workbook.Sheets['GENERAL']);
            }

            console.log('📊 Datos procesados:', {
                affiliates: result.affiliates.length,
                transactions: result.transactions.length,
                sheets: result.sheetNames
            });

        } catch (error) {
            console.error('Error extrayendo datos:', error);
            throw error;
        }

        return result;
    }

    processAffiliatesSheet(sheet) {
        const affiliates = [];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell && cell.toString().includes('RUT'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return affiliates;

        const headers = jsonData[headerRowIndex];
        
        const columnMap = {
            rut: this.findColumnIndex(headers, ['RUT']),
            nombres: this.findColumnIndex(headers, ['NOMBRES', 'NOMBRE']),
            apellidos: this.findColumnIndex(headers, ['APELLIDOS', 'APELLIDO']),
            establecimiento: this.findColumnIndex(headers, ['ESTABLECIMIENTO', 'CENTRO'])
        };

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[columnMap.rut]) continue;

            const affiliate = {
                rut: this.cleanRUT(row[columnMap.rut]),
                nombres: row[columnMap.nombres] || '',
                apellidos: row[columnMap.apellidos] || '',
                establecimiento: row[columnMap.establecimiento] || ''
            };

            if (affiliate.rut) {
                affiliates.push(affiliate);
            }
        }

        return affiliates;
    }

    processTransactionsSheet(sheet) {
        const transactions = [];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell && cell.toString().includes('RUT AFILIADO'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return transactions;

        const headers = jsonData[headerRowIndex];
        
        const columnMap = {
            fecha: this.findColumnIndex(headers, ['FECHA']),
            rutAfiliado: this.findColumnIndex(headers, ['RUT AFILIADO']),
            nombres: this.findColumnIndex(headers, ['NOMBRES']),
            apellidos: this.findColumnIndex(headers, ['APELLIDOS']),
            concepto: this.findColumnIndex(headers, ['CONCEPTO']),
            lipigas5: this.findColumnIndex(headers, ['05 KILOS']),
            lipigas11: this.findColumnIndex(headers, ['11 KILOS']),
            lipigas15: this.findColumnIndex(headers, ['15 KILOS']),
            lipigas45: this.findColumnIndex(headers, ['45 KILOS'])
        };

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[columnMap.rutAfiliado]) continue;

            const transaction = {
                fecha: this.parseDate(row[columnMap.fecha]),
                rutAfiliado: this.cleanRUT(row[columnMap.rutAfiliado]),
                nombres: row[columnMap.nombres] || '',
                apellidos: row[columnMap.apellidos] || '',
                concepto: row[columnMap.concepto] || '',
                '05 KILOS': this.parseNumber(row[columnMap.lipigas5]),
                '11 KILOS': this.parseNumber(row[columnMap.lipigas11]),
                '15 KILOS': this.parseNumber(row[columnMap.lipigas15]),
                '45 KILOS': this.parseNumber(row[columnMap.lipigas45])
            };

            if (transaction.rutAfiliado) {
                transactions.push(transaction);
            }
        }

        return transactions;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    findColumnIndex(headers, searchTerms) {
        for (const term of searchTerms) {
            const index = headers.findIndex(header => 
                header && header.toString().toUpperCase().includes(term.toUpperCase())
            );
            if (index >= 0) return index;
        }
        return -1;
    }

    cleanRUT(rut) {
        if (!rut) return '';
        let cleanRUT = rut.toString().replace(/[.\s]/g, '').toUpperCase();
        if (cleanRUT.length > 1 && !cleanRUT.includes('-')) {
            cleanRUT = cleanRUT.slice(0, -1) + '-' + cleanRUT.slice(-1);
        }
        return cleanRUT;
    }

    parseDate(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date) return dateValue;
        
        const dateStr = dateValue.toString();
        if (!isNaN(dateStr) && dateStr.length > 5) {
            const excelDate = new Date((parseFloat(dateStr) - 25569) * 86400 * 1000);
            if (excelDate.getFullYear() > 1900) return excelDate;
        }
        
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    parseNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        const num = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
    }

    processExcelData(data) {
        if (data && data.affiliates && data.transactions) {
            this.affiliatesData = data.affiliates;
            this.transactionsData = data.transactions;
            this.summaryData = data.summary || {};
            
            console.log('📊 Datos reales del Excel procesados:', {
                afiliados: this.affiliatesData.length,
                transacciones: this.transactionsData.length,
                hojas: data.sheetNames || []
            });
        } else {
            console.log('🧪 Usando datos de ejemplo para testing...');
            this.affiliatesData = this.generateSampleAffiliates();
            this.transactionsData = this.generateSampleTransactions();
            this.summaryData = {};
        }
    }

    generateSampleAffiliates() {
        return [
            {
                rut: '19919092-K',
                nombres: 'MARIA JOSE',
                apellidos: 'ABANTO DIAZ',
                establecimiento: 'CONS. SAN GERONIMO'
            },
            {
                rut: '12345678-9',
                nombres: 'JUAN CARLOS',
                apellidos: 'PÉREZ GONZÁLEZ',
                establecimiento: 'CONS. KAROL WOJTYLA'
            }
        ];
    }

    generateSampleTransactions() {
        const currentDate = new Date();
        return [
            {
                fecha: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                rutAfiliado: '12345678-9',
                concepto: 'LIPIGAS',
                '05 KILOS': '1',
                '11 KILOS': '0',
                '15 KILOS': '1',
                '45 KILOS': '0'
            },
            {
                fecha: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
                rutAfiliado: '12345678-9',
                concepto: 'ABASTIBLE',
                '05 KILOS': '1',
                '11 KILOS': '1',
                '15 KILOS': '0',
                '45 KILOS': '0'
            }
        ];
    }

    loadStoredData() {
        const storedData = localStorage.getItem('gasSystemData');
        if (storedData) {
            try {
                const fileData = JSON.parse(storedData);
                this.currentData = fileData.data;
                this.processExcelData(fileData.data);
            } catch (error) {
                console.error('Error al cargar datos almacenados:', error);
                localStorage.removeItem('gasSystemData');
            }
        }
    }

    updateFilesList() {
        const filesList = document.getElementById('filesList');
        const storedData = localStorage.getItem('gasSystemData');

        if (storedData) {
            try {
                const fileData = JSON.parse(storedData);
                const uploadDate = new Date(fileData.uploadDate).toLocaleDateString('es-CL');
                const uploadTime = new Date(fileData.uploadDate).toLocaleTimeString('es-CL');
                
                filesList.innerHTML = `
                    <div class="file-item">
                        <div>
                            <div class="file-name">📄 ${fileData.name}</div>
                            <div class="file-date">Subido: ${uploadDate} ${uploadTime}</div>
                            ${fileData.uploadedBy ? `<div class="file-date">Por: ${fileData.uploadedBy}</div>` : ''}
                        </div>
                        <button class="delete-file-btn" onclick="healthGasSystem.deleteFile()">
                            🗑️ Eliminar
                        </button>
                    </div>
                `;
            } catch (error) {
                filesList.innerHTML = '<p class="no-files">❌ Error al cargar información de archivos</p>';
            }
        } else {
            filesList.innerHTML = '<p class="no-files">📂 No hay archivos cargados</p>';
        }
    }

    deleteFile() {
        if (!this.currentUser) {
            this.showAlert('🔐 Debe estar autenticado para eliminar archivos', 'error');
            return;
        }

        if (confirm('¿Está seguro de que desea eliminar el archivo cargado? Esta acción no se puede deshacer.')) {
            localStorage.removeItem('gasSystemData');
            this.currentData = null;
            this.affiliatesData = [];
            this.transactionsData = [];
            this.updateFilesList();
            this.showAlert('✅ Archivo eliminado exitosamente', 'success');
            
            document.getElementById('resultsSection').style.display = 'none';
        }
    }

    // ========================================
    // UI UTILITY METHODS
    // ========================================

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
        searchCard.parentNode.insertBefore(alert, searchCard.nextSibling);

        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 6000);

        alert.addEventListener('click', () => alert.remove());
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    hideError(element) {
        element.style.display = 'none';
    }

    showSuccess(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// ========================================
// GLOBAL FUNCTIONS
// ========================================

function closeAdminModal() {
    healthGasSystem.closeAdminModal();
}

// ========================================
// INITIALIZE SYSTEM
// ========================================

let healthGasSystem;

document.addEventListener('DOMContentLoaded', function() {
    healthGasSystem = new HealthGasSystemManager();
    
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
    
    console.log('🏥 Sistema de Cupones de Gas - Bienestar APS inicializado correctamente');
    console.log('📧 Admin: Bienestar.aps@cmpuentealto.cl');
    console.log('🔑 Password: 20BAPS25 (cambiar desde el panel)');
});

// Make available globally for debugging and external access
window.healthGasSystem = healthGasSystem;
