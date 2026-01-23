/**
 * BIENESTAR APS - SISTEMA DE CUPONES DE GAS
 * JavaScript con Firebase Authentication y Procesamiento de Excel
 * Versión: 3.0 - Full Integration
 */

class HealthGasSystemManager {
    constructor() {
        this.currentData = null;
        this.affiliatesData = [];
        this.transactionsData = [];
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

    // --- CONFIGURACIÓN FIREBASE ---
    setupFirebaseAuth() {
        if (window.onAuthStateChanged) {
            window.onAuthStateChanged(window.firebaseAuth, (user) => {
                this.currentUser = user;
                if (user) {
                    this.showAdminPanel();
                } else {
                    this.showLoginForm();
                }
            });
        }
    }

    bindEvents() {
        // Búsqueda
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCoupons());
        document.getElementById('rutInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCoupons();
        });
        document.getElementById('rutInput').addEventListener('input', (e) => this.formatRUT(e));

        // Admin e Inicio de Sesión
        document.getElementById('adminBtn').addEventListener('click', () => this.openAdminModal());
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Password Management
        document.getElementById('changePasswordBtn').addEventListener('click', () => this.showChangePasswordForm());
        document.getElementById('updatePasswordBtn').addEventListener('click', () => this.handlePasswordChange());
        document.getElementById('cancelPasswordBtn').addEventListener('click', () => this.hideChangePasswordForm());

        // Archivos
        document.getElementById('excelFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFile());

        // Modales
        document.getElementById('adminLoginModal').addEventListener('click', (e) => {
            if (e.target.id === 'adminLoginModal') this.closeAdminModal();
        });
    }

    // --- MÉTODOS DE AUTENTICACIÓN ---
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
        } catch (error) {
            this.showError(errorDiv, '❌ Credenciales incorrectas');
        }
        this.showLoading(false);
    }

    async handleLogout() {
        try {
            await window.signOut(window.firebaseAuth);
            this.closeAdminModal();
        } catch (error) {
            console.error('Logout error');
        }
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('passwordError');
        const successDiv = document.getElementById('passwordSuccess');

        if (newPassword !== confirmPassword) {
            this.showError(errorDiv, '❌ Las contraseñas no coinciden');
            return;
        }

        this.showLoading(true);
        try {
            const user = window.firebaseAuth.currentUser;
            await window.signInWithEmailAndPassword(window.firebaseAuth, user.email, currentPassword);
            await window.updatePassword(user, newPassword);
            this.showSuccess(successDiv, '✅ Contraseña actualizada');
            setTimeout(() => this.hideChangePasswordForm(), 2000);
        } catch (error) {
            this.showError(errorDiv, '❌ Error al actualizar');
        }
        this.showLoading(false);
    }

    // --- MANEJO DE UI (PARTE 1) ---
    showLoading(s) { document.getElementById('loadingOverlay').style.display = s ? 'block' : 'none'; }
    showError(e, m) { e.textContent = m; e.style.display = 'block'; }
    hideError(e) { e.style.display = 'none'; }
    showSuccess(e, m) { e.textContent = m; e.style.display = 'block'; e.className = 'success-message'; }
    
    openAdminModal() { document.getElementById('adminLoginModal').style.display = 'block'; }
    closeAdminModal() { document.getElementById('adminLoginModal').style.display = 'none'; }
    
    showAdminPanel() { 
        document.getElementById('loginForm').style.display = 'none'; 
        document.getElementById('adminPanel').style.display = 'block'; 
    }
    showLoginForm() { 
        document.getElementById('loginForm').style.display = 'block'; 
        document.getElementById('adminPanel').style.display = 'none'; 
    }
}

// --- LÓGICA DE ARCHIVOS (CONTINUACIÓN) ---
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.name.match(/\.(xlsx|xls)$/)) {
            this.selectedFile = file;
            document.getElementById('uploadBtn').disabled = false;
        }
    }

    async uploadFile() {
        if (!this.selectedFile || !this.currentUser) return;
        this.showLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                // Cargamos el libro de trabajo completo en memoria
                this.currentWorkbook = XLSX.read(data, { type: 'array' });
                
                // Guardamos metadatos para saber qué archivo está activo
                localStorage.setItem('gasSystem_fileMeta', JSON.stringify({
                    name: this.selectedFile.name,
                    date: new Date().toISOString(),
                    user: this.currentUser.email
                }));
                
                this.updateFilesList();
                this.showAlert('✅ Base de datos cargada correctamente', 'success');
                this.showLoading(false);
            };
            reader.readAsArrayBuffer(this.selectedFile);
        } catch (error) {
            this.showAlert('❌ Error al procesar el Excel', 'error');
            this.showLoading(false);
        }
    }

    // --- EL CORAZÓN DEL SISTEMA: BÚSQUEDA ---
    async searchCoupons() {
        const rutInput = document.getElementById('rutInput');
        const rawRut = rutInput.value.trim();
        const rut = this.normalizeRUT(rawRut);

        if (!rut || rawRut.length < 7) {
            this.showAlert('📝 Ingrese un RUT válido', 'error');
            return;
        }

        if (!this.currentWorkbook) {
            this.showAlert('📊 No hay un archivo Excel cargado en el sistema', 'info');
            return;
        }

        this.showLoading(true);
        try {
            const sheetName = 'CUPONES DISPONIBLES';
            const sheet = this.currentWorkbook.Sheets[sheetName];
            
            if (!sheet) {
                this.showAlert(`❌ No existe la hoja "${sheetName}"`, 'error');
                this.showLoading(false);
                return;
            }

            // 👉 ACCIÓN CLAVE: Escribir el RUT en la celda C5
            sheet['C5'] = { t: 's', v: rut };

            // Usamos el ExcelProcessor (debe estar cargado en tu HTML)
            const processor = new ExcelProcessor();
            processor.currentWorkbook = this.currentWorkbook;
            const data = processor.getCuponesDisponiblesByRUT(rut);

            if (!data) {
                this.showAlert('🔍 Sin datos para este RUT', 'info');
                this.showLoading(false);
                return;
            }

            this.displayResults(data);
        } catch (error) {
            console.error(error);
            this.showAlert('❌ Error en el cálculo de cupones', 'error');
        }
        this.showLoading(false);
    }

    // --- RENDERIZADO DE LA TABLA SOLICITADA ---
    displayResults(data) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');

        resultsContent.innerHTML = `
            <table class="coupon-table">
                <thead>
                    <tr>
                        <th>Empresa</th>
                        <th>5 Kg</th>
                        <th>11 Kg</th>
                        <th>15 Kg</th>
                        <th>45 Kg</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Lipigas</strong></td>
                        <td>${data.lipigas[5]}</td>
                        <td>${data.lipigas[11]}</td>
                        <td>${data.lipigas[15]}</td>
                        <td>${data.lipigas[45]}</td>
                    </tr>
                    <tr>
                        <td><strong>Abastible</strong></td>
                        <td>${data.abastible[5]}</td>
                        <td>${data.abastible[11]}</td>
                        <td>${data.abastible[15]}</td>
                        <td>${data.abastible[45]}</td>
                    </tr>
                </tbody>
            </table>
            <div class="coupon-summary" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 5px 0;"><strong>📉 Usado en el mes:</strong> ${data.usados}</p>
                <p style="margin: 5px 0; color: #2c3e50; font-size: 1.1em;"><strong>✅ Disponible:</strong> ${data.disponibles}</p>
            </div>
        `;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // --- UTILIDADES FINALES ---
    formatRUT(e) {
        let v = e.target.value.replace(/[^0-9kK]/g, '');
        if (v.length > 1) v = v.slice(0, -1) + '-' + v.slice(-1);
        e.target.value = v;
    }

    normalizeRUT(rut) {
        const clean = rut.replace(/[.-\s]/g, '').toUpperCase();
        if (clean.length < 2) return clean;
        return clean.slice(0, -1) + '-' + clean.slice(-1);
    }

    updateFilesList() {
        const list = document.getElementById('filesList');
        const meta = localStorage.getItem('gasSystem_fileMeta');
        if (meta) {
            const info = JSON.parse(meta);
            list.innerHTML = `
                <div class="file-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>📄 ${info.name}</span>
                    <button onclick="healthGasSystem.deleteFile()" class="delete-file-btn">Eliminar</button>
                </div>`;
        } else {
            list.innerHTML = '<p>No hay archivos activos.</p>';
        }
    }

    deleteFile() {
        if(confirm('¿Seguro que desea quitar la base de datos actual?')) {
            this.currentWorkbook = null;
            localStorage.removeItem('gasSystem_fileMeta');
            this.updateFilesList();
            document.getElementById('resultsSection').style.display = 'none';
        }
    }

    showAlert(msg, type) {
        alert(msg); // Aquí puedes integrar tu sistema de notificaciones visuales
    }

    loadStoredData() {
        this.updateFilesList();
        console.log("Bienestar APS: Sistema de Gas listo.");
    }
}

// --- INICIALIZACIÓN GLOBAL ---
let healthGasSystem;
document.addEventListener('DOMContentLoaded', () => {
    healthGasSystem = new HealthGasSystemManager();
    window.healthGasSystem = healthGasSystem;
});
/**
 * EXCEL PROCESSOR - ENGINE
 * Se encarga de la lectura de celdas específicas y mapeo de datos
 */
class ExcelProcessor {
    constructor() {
        this.currentWorkbook = null;
    }

    // Extrae los datos de la hoja "CUPONES DISPONIBLES"
    getCuponesDisponiblesByRUT(rut) {
        if (!this.currentWorkbook) return null;

        const sheet = this.currentWorkbook.Sheets['CUPONES DISPONIBLES'];
        if (!sheet) return null;

        try {
            // Mapeo de celdas según la estructura de tu Excel
            // Nota: XLSX.utils.format_cell puede ayudar, pero sheet['Celda'].v es más directo
            return {
                lipigas: {
                    5:  this.getCellValue(sheet, 'D11'),
                    11: this.getCellValue(sheet, 'E11'),
                    15: this.getCellValue(sheet, 'F11'),
                    45: this.getCellValue(sheet, 'G11')
                },
                abastible: {
                    5:  this.getCellValue(sheet, 'D12'),
                    11: this.getCellValue(sheet, 'E12'),
                    15: this.getCellValue(sheet, 'F12'),
                    45: this.getCellValue(sheet, 'G12')
                },
                usados:      this.getCellValue(sheet, 'F5'),
                disponibles: this.getCellValue(sheet, 'F7')
            };
        } catch (e) {
            console.error("Error leyendo celdas de resultados:", e);
            return null;
        }
    }

    // Utilidad para extraer el valor de una celda de forma segura
    getCellValue(sheet, address) {
        const cell = sheet[address];
        if (!cell) return 0;
        
        // Si es un número lo devolvemos, si no, intentamos parsearlo
        const val = cell.v;
        return isNaN(val) ? (parseInt(val) || 0) : val;
    }

    // Método para la carga inicial (Base de Datos de Afiliados)
    extractDataFromWorkbook(workbook) {
        const result = { affiliates: [] };
        const sheet = workbook.Sheets['BASE DE DATOS'];
        
        if (sheet) {
            // Convertimos la base de datos a JSON para búsquedas rápidas de nombres
            const rawData = XLSX.utils.sheet_to_json(sheet);
            result.affiliates = rawData.map(row => ({
                rut: row['RUT'] || row['rut'] || '',
                nombres: row['NOMBRES'] || row['nombre'] || '',
                apellidos: row['APELLIDOS'] || row['apellido'] || '',
                establecimiento: row['ESTABLECIMIENTO'] || ''
            }));
        }
        return result;
    }
}

// --- CIERRE DE INTEGRACIÓN ---
// Con esto, el flujo es:
// 1. Manager.searchCoupons() escribe en C5.
// 2. Manager llama a Processor.getCuponesDisponiblesByRUT().
// 3. Processor lee las celdas de respuesta (D11, D12, etc).
// 4. Manager dibuja la tabla con esos valores.
