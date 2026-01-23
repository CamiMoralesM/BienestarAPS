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
        this.summaryData = {};
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredData();
        this.updateFilesList();
        this.setupFirebaseAuth();
    }

    // ========================================
    // FIREBASE AUTH
    // ========================================
    setupFirebaseAuth() {
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

    // ========================================
    // EVENTOS
    // ========================================
    bindEvents() {
        // Búsqueda de cupones
        document.getElementById('searchBtn')
            .addEventListener('click', () => this.searchCoupons());

        document.getElementById('rutInput')
            .addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchCoupons();
            });

        document.getElementById('rutInput')
            .addEventListener('input', (e) => this.formatRUT(e));

        // Panel administrativo
        document.getElementById('adminBtn')
            .addEventListener('click', () => this.openAdminModal());

        // Login
        document.getElementById('loginBtn')
            .addEventListener('click', () => this.handleLogin());

        document.getElementById('adminPassword')
            .addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });

        // Logout
        document.getElementById('logoutBtn')
            .addEventListener('click', () => this.handleLogout());

        // Cambio de contraseña
        document.getElementById('changePasswordBtn')
            .addEventListener('click', () => this.showChangePasswordForm());

        document.getElementById('updatePasswordBtn')
            .addEventListener('click', () => this.handlePasswordChange());

        document.getElementById('cancelPasswordBtn')
            .addEventListener('click', () => this.hideChangePasswordForm());

        // Subida de archivos
        document.getElementById('excelFile')
            .addEventListener('change', (e) => this.handleFileSelect(e));

        document.getElementById('uploadBtn')
            .addEventListener('click', () => this.uploadFile());

        // Cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAdminModal();
        });

        document.getElementById('adminLoginModal')
            .addEventListener('click', (e) => {
                if (e.target.id === 'adminLoginModal') {
                    this.closeAdminModal();
                }
            });
    }

    // ========================================
    // AUTH METHODS
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
            await window.signInWithEmailAndPassword(
                window.firebaseAuth,
                email,
                password
            );
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
                    errorMessage = '⏰ Demasiados intentos fallidos';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '🌐 Error de conexión';
                    break;
                default:
                    errorMessage = '❌ Error de autenticación';
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
    // RUT FORMATEO Y VALIDACIÓN
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
        const calculatedDV =
            remainder === 0 ? '0' :
            remainder === 1 ? 'k' :
            (11 - remainder).toString();

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
    // BÚSQUEDA DE CUPONES (NUEVA LÓGICA EXCEL)
    // ========================================
    searchCoupons() {
        const rut = this.normalizeRUT(
            document.getElementById('rutInput').value
        );

        if (!rut) return;

        if (!this.currentWorkbook) {
            this.showAlert('No hay Excel cargado', 'error');
            return;
        }

        const sheet = this.currentWorkbook.Sheets['CUPONES DISPONIBLES'];
        if (!sheet) {
            this.showAlert('Hoja "CUPONES DISPONIBLES" no encontrada', 'error');
            return;
        }

        // 👉 escribir RUT en C5
        sheet['C5'] = { t: 's', v: rut };

        // 👉 forzar recálculo
        XLSX.utils.sheet_to_json(sheet, { raw: true });

        const processor = new ExcelProcessor();
        processor.currentWorkbook = this.currentWorkbook;

        const data = processor.getCuponesDisponiblesByRUT(rut);

        if (!data) {
            this.showAlert('RUT no encontrado', 'error');
            return;
        }

        this.displayResultsFromCupones(data);
    }

    // ========================================
    // MOSTRAR RESULTADOS DESDE EXCEL
    // ========================================
    displayResultsFromCupones(data) {
        document.getElementById('resultsContent').innerHTML = `
            <table class="coupon-table">
                <tr>
                    <th></th>
                    <th>5</th>
                    <th>11</th>
                    <th>15</th>
                    <th>45</th>
                </tr>
                <tr>
                    <td><b>Lipigas</b></td>
                    <td>${data.lipigas[5]}</td>
                    <td>${data.lipigas[11]}</td>
                    <td>${data.lipigas[15]}</td>
                    <td>${data.lipigas[45]}</td>
                </tr>
                <tr>
                    <td><b>Abastible</b></td>
                    <td>${data.abastible[5]}</td>
                    <td>${data.abastible[11]}</td>
                    <td>${data.abastible[15]}</td>
                    <td>${data.abastible[45]}</td>
                </tr>
            </table>
            <p><b>Usado en el mes:</b> ${data.usados}</p>
            <p><b>Disponible:</b> ${data.disponibles}</p>
        `;

        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('resultsSection')
            .scrollIntoView({ behavior: 'smooth' });
    }

    // ========================================
    // FILE MANAGEMENT
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
                this.showAlert('❌ Seleccione un archivo Excel válido', 'error');
            }
        }
    }

    async uploadFile() {
        if (!this.currentUser) {
            this.showAlert('🔐 Debe estar autenticado para subir archivos', 'error');
            return;
        }

        if (!this.selectedFile) {
            this.showAlert('📁 Seleccione un archivo', 'error');
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

                localStorage.setItem(
                    'gasSystemData',
                    JSON.stringify(fileData)
                );

                this.currentData = data;
                this.processExcelData(data);
                this.updateFilesList();

                this.showAlert(
                    '✅ Archivo subido y procesado exitosamente',
                    'success'
                );

                document.getElementById('excelFile').value = '';
                document.getElementById('uploadBtn').disabled = true;
                this.selectedFile = null;
            }
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            this.showAlert(
                '❌ Error al procesar el archivo Excel',
                'error'
            );
        }

        this.showLoading(false);
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    this.currentWorkbook = workbook;

                    if (typeof ExcelProcessor !== 'undefined') {
                        const processor = new ExcelProcessor();
                        processor.currentWorkbook = workbook;
                        const processedData =
                            processor.extractDataFromWorkbook(workbook);
                        resolve(processedData);
                    } else {
                        const processedData =
                            this.extractDataFromWorkbook(workbook);
                        resolve(processedData);
                    }
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () =>
                reject(new Error('Error al leer el archivo'));

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

        if (workbook.Sheets['BASE DE DATOS']) {
            result.affiliates =
                this.processAffiliatesSheet(
                    workbook.Sheets['BASE DE DATOS']
                );
        }

        if (workbook.Sheets['GENERAL']) {
            result.transactions =
                this.processTransactionsSheet(
                    workbook.Sheets['GENERAL']
                );
        }

        return result;
    }

    processAffiliatesSheet(sheet) {
        const affiliates = [];
        const jsonData =
            XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        let headerRowIndex = -1;

        for (let i = 0; i < 10; i++) {
            const row = jsonData[i];
            if (row && row.some(c => c && c.toString().includes('RUT'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return affiliates;

        const headers = jsonData[headerRowIndex];

        const colRut = headers.findIndex(h => h && h.includes('RUT'));
        const colNom = headers.findIndex(h => h && h.includes('NOMBRES'));
        const colApe = headers.findIndex(h => h && h.includes('APELLIDOS'));
        const colEst = headers.findIndex(h => h && h.includes('ESTABLE'));

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[colRut]) continue;

            affiliates.push({
                rut: this.cleanRUT(row[colRut]),
                nombres: row[colNom] || '',
                apellidos: row[colApe] || '',
                establecimiento: row[colEst] || ''
            });
        }

        return affiliates;
    }

    processTransactionsSheet(sheet) {
        const transactions = [];
        const jsonData =
            XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        let headerRowIndex = -1;

        for (let i = 0; i < 10; i++) {
            const row = jsonData[i];
            if (row && row.some(c => c && c.toString().includes('RUT AFILIADO'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return transactions;

        const headers = jsonData[headerRowIndex];

        const idx = (txt) =>
            headers.findIndex(h => h && h.toString().includes(txt));

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[idx('RUT AFILIADO')]) continue;

            transactions.push({
                fecha: this.parseDate(row[idx('FECHA')]),
                rutAfiliado: this.cleanRUT(row[idx('RUT AFILIADO')]),
                concepto: row[idx('CONCEPTO')] || '',
                '05 KILOS': row[idx('05')] || 0,
                '11 KILOS': row[idx('11')] || 0,
                '15 KILOS': row[idx('15')] || 0,
                '45 KILOS': row[idx('45')] || 0
            });
        }

        return transactions;
    }

    // ========================================
    // UTILIDADES
    // ========================================
    cleanRUT(rut) {
        if (!rut) return '';
        let r = rut.toString().replace(/[.\s]/g, '').toUpperCase();
        if (!r.includes('-') && r.length > 1) {
            r = r.slice(0, -1) + '-' + r.slice(-1);
        }
        return r;
    }

    parseDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    parseNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        const num = parseFloat(
            value.toString().replace(/[^\d.-]/g, '')
        );
        return isNaN(num) ? 0 : num;
    }

    processExcelData(data) {
        if (data && data.affiliates && data.transactions) {
            this.affiliatesData = data.affiliates;
            this.transactionsData = data.transactions;
            this.summaryData = data.summary || {};

            console.log('📊 Datos del Excel procesados:', {
                afiliados: this.affiliatesData.length,
                transacciones: this.transactionsData.length,
                hojas: data.sheetNames || []
            });
        } else {
            console.warn('⚠️ Datos incompletos, usando datos de prueba');
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
        const d = new Date();
        return [
            {
                fecha: new Date(d.getFullYear(), d.getMonth(), 1),
                rutAfiliado: '12345678-9',
                concepto: 'LIPIGAS',
                '05 KILOS': 1,
                '11 KILOS': 0,
                '15 KILOS': 1,
                '45 KILOS': 0
            },
            {
                fecha: new Date(d.getFullYear(), d.getMonth(), 5),
                rutAfiliado: '12345678-9',
                concepto: 'ABASTIBLE',
                '05 KILOS': 1,
                '11 KILOS': 1,
                '15 KILOS': 0,
                '45 KILOS': 0
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
                console.log('📂 Datos cargados desde almacenamiento local');
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
                const uploadDate =
                    new Date(fileData.uploadDate).toLocaleDateString('es-CL');
                const uploadTime =
                    new Date(fileData.uploadDate).toLocaleTimeString('es-CL');

                filesList.innerHTML = `
                    <div class="file-item">
                        <div>
                            <div class="file-name">📄 ${fileData.name}</div>
                            <div class="file-date">
                                Subido: ${uploadDate} ${uploadTime}
                            </div>
                            ${
                                fileData.uploadedBy
                                    ? `<div class="file-date">
                                        Por: ${fileData.uploadedBy}
                                       </div>`
                                    : ''
                            }
                        </div>
                        <button class="delete-file-btn"
                            onclick="healthGasSystem.deleteFile()">
                            🗑️ Eliminar
                        </button>
                    </div>
                `;
            } catch (error) {
                filesList.innerHTML =
                    '<p class="no-files">❌ Error al cargar archivo</p>';
            }
        } else {
            filesList.innerHTML =
                '<p class="no-files">📂 No hay archivos cargados</p>';
        }
    }

    deleteFile() {
        if (!this.currentUser) {
            this.showAlert(
                '🔐 Debe estar autenticado para eliminar archivos',
                'error'
            );
            return;
        }

        if (
            confirm(
                '¿Está seguro de eliminar el archivo? Esta acción no se puede deshacer.'
            )
        ) {
            localStorage.removeItem('gasSystemData');
            this.currentData = null;
            this.currentWorkbook = null;
            this.affiliatesData = [];
            this.transactionsData = [];
            this.updateFilesList();

            document.getElementById('resultsSection').style.display = 'none';
            this.showAlert('✅ Archivo eliminado correctamente', 'success');
        }
    }

    // ========================================
    // UI UTILITIES
    // ========================================
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'block' : 'none';
        document.body.style.overflow = show ? 'hidden' : 'auto';
    }

    showAlert(message, type = 'info') {
        document.querySelectorAll('.alert').forEach(a => a.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.cursor = 'pointer';

        const searchCard = document.querySelector('.search-card');
        if (searchCard) {
            searchCard.parentNode.insertBefore(
                alert,
                searchCard.nextSibling
            );
        }

        setTimeout(() => alert.remove(), 6000);
        alert.addEventListener('click', () => alert.remove());
    }

    showError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    hideError(el) {
        if (el) el.style.display = 'none';
    }

    showSuccess(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }
}

// ========================================
// GLOBAL FUNCTIONS
// ========================================
function closeAdminModal() {
    if (window.healthGasSystem) {
        window.healthGasSystem.closeAdminModal();
    }
}

// ========================================
// INITIALIZATION
// ========================================
let healthGasSystem;

document.addEventListener('DOMContentLoaded', () => {
    healthGasSystem = new HealthGasSystemManager();

    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

    console.log('🏥 Sistema de Cupones de Gas - Bienestar APS iniciado');
});

// Acceso global
window.healthGasSystem = healthGasSystem;
