/**
 * BIENESTAR APS - SISTEMA DE CUPONES DE GAS v3.0
 * Con Firebase Storage y interfaz simplificada
 */

// Sistema de Cupones de Gas - VERSIÓN FINAL
class BienestarAPSSystem {
    constructor() {
        this.currentUser = null;
        this.currentWorkbook = null;
        this.selectedFile = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFirebaseAuth();
        this.checkStoredExcel();
    }

    // ========================================
    // FIREBASE AUTH Y STORAGE SETUP
    // ========================================
    
    setupFirebaseAuth() {
        if (window.onAuthStateChanged) {
            window.onAuthStateChanged(window.firebaseAuth, (user) => {
                this.currentUser = user;
                if (user) {
                    console.log('👤 Usuario autenticado:', user.email);
                    this.showAdminPanel();
                } else {
                    console.log('👤 Usuario no autenticado');
                    this.showLoginForm();
                }
            });
        }
        
        // Inicializar Firebase Storage
        if (window.firebase && window.firebase.storage) {
            this.storage = window.firebase.storage();
        }
    }

    // ========================================
    // EVENTOS
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
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFile());

        // Cerrar modales - MEJORADO
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAdminModal();
        });

        // Cerrar haciendo clic en X - NUEVO
        document.querySelector('.close-btn').addEventListener('click', () => this.closeAdminModal());

        // Cerrar haciendo clic fuera del modal
        document.getElementById('adminLoginModal').addEventListener('click', (e) => {
            if (e.target.id === 'adminLoginModal') this.closeAdminModal();
        });
    }

    // ========================================
    // AUTENTICACIÓN (igual que antes)
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
            const user = window.firebaseAuth.currentUser;
            const email = user.email;
            
            await window.signInWithEmailAndPassword(window.firebaseAuth, email, currentPassword);
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
    // BÚSQUEDA DE CUPONES - SIMPLIFICADA
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

        this.showLoading(true);

        try {
            // Descargar el Excel desde Firebase Storage
            const workbook = await this.downloadExcelFromFirebase();
            
            if (!workbook) {
                this.showAlert('📊 No hay archivo Excel cargado en el sistema', 'info');
                this.showLoading(false);
                return;
            }

            // Buscar información del RUT
            const normalizedRUT = this.normalizeRUT(rut);
            const couponInfo = this.findCouponInfoInExcel(workbook, normalizedRUT);
            
            this.displaySimplifiedResults(couponInfo);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error al buscar cupones:', error);
            this.showAlert('❌ Error al procesar la búsqueda. Intente nuevamente', 'error');
            this.showLoading(false);
        }
    }

    // NUEVA FUNCIÓN: Descargar Excel desde Firebase
    async downloadExcelFromFirebase() {
        try {
            if (!window.firebase || !window.firebase.storage) {
                console.error('Firebase Storage no disponible');
                return null;
            }

            const storage = window.firebase.storage();
            const storageRef = storage.ref();
            const excelRef = storageRef.child('cupones-disponibles.xlsx');
            
            // Descargar el archivo
            const downloadURL = await excelRef.getDownloadURL();
            const response = await fetch(downloadURL);
            const arrayBuffer = await response.arrayBuffer();
            
            // Leer con XLSX
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            this.currentWorkbook = workbook;
            
            console.log('📥 Excel descargado desde Firebase Storage');
            return workbook;
            
        } catch (error) {
            console.error('Error descargando Excel:', error);
            
            // Si no hay archivo en Firebase, intentar desde localStorage
            const storedData = localStorage.getItem('gasSystemData');
            if (storedData) {
                const fileData = JSON.parse(storedData);
                const workbook = XLSX.read(fileData.data, { type: 'binary' });
                console.log('📥 Excel cargado desde almacenamiento local');
                return workbook;
            }
            
            return null;
        }
    }

    // NUEVA FUNCIÓN: Buscar información exacta según especificaciones
    findCouponInfoInExcel(workbook, rut) {
        const sheet = workbook.Sheets['CUPONES DISPONIBLES'];
        if (!sheet) {
            console.error('Hoja CUPONES DISPONIBLES no encontrada');
            return null;
        }

        // Escribir el RUT en C5 (simulando la búsqueda)
        sheet['C5'] = { t: 's', v: rut };

        // Leer los datos exactos de las celdas especificadas
        const getCellValue = (cell) => {
            const cellObj = sheet[cell];
            if (!cellObj) return 0;
            return cellObj.v || 0;
        };

        // Verificar si el RUT existe (C5 debería tener datos relacionados)
        const rutEnExcel = getCellValue('C5');
        const nombres = getCellValue('D5');
        const apellidos = getCellValue('E5');

        if (!rutEnExcel && !nombres && !apellidos) {
            // RUT no encontrado - buscar en BASE DE DATOS
            return this.findUserInBaseDatos(workbook, rut);
        }

        return {
            encontrado: true,
            rut: rutEnExcel || rut,
            nombres: nombres || '',
            apellidos: apellidos || '',
            // LIPIGAS - según especificación
            lipigas: {
                '5': getCellValue('F5'),   // F5: 5 KILOS Lipigas
                '11': getCellValue('G5'),  // G5: 11 KILOS Lipigas
                '15': getCellValue('H5'),  // H5: 15 KILOS Lipigas
                '45': getCellValue('I5')   // I5: 45 KILOS Lipigas
            },
            // ABASTIBLE - según especificación
            abastible: {
                '5': getCellValue('J5'),   // J5: 5 KILOS Abastible
                '11': getCellValue('K5'),  // K5: 11 KILOS Abastible
                '15': getCellValue('L5'),  // L5: 15 KILOS Abastible
                '45': getCellValue('M5')   // M5: 45 KILOS Abastible
            },
            // ESTADO DEL CUPO - según especificación
            usadoEnElMes: getCellValue('N5'),  // N5: USADO EN EL MES
            disponible: getCellValue('O5')     // O5: DISPONIBLE
        };
    }

    // NUEVA FUNCIÓN: Buscar en BASE DE DATOS si no está en CUPONES DISPONIBLES
    findUserInBaseDatos(workbook, rut) {
        const sheet = workbook.Sheets['BASE DE DATOS'];
        if (!sheet) {
            return null;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        // Buscar el RUT en la BASE DE DATOS
        let userFound = null;
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[4] && this.normalizeRUT(row[4]) === rut) { // Columna E (índice 4)
                userFound = {
                    encontrado: true,
                    rut: this.normalizeRUT(row[4]),
                    nombres: row[5] || '', // Columna F (índice 5)
                    apellidos: row[6] || '', // Columna G (índice 6)
                    establecimiento: row[7] || '', // Si existe columna H
                    // No ha comprado, valores por defecto
                    lipigas: { '5': 0, '11': 0, '15': 0, '45': 0 },
                    abastible: { '5': 0, '11': 0, '15': 0, '45': 0 },
                    usadoEnElMes: 0,
                    disponible: 4 // Valor por defecto
                };
                break;
            }
        }

        return userFound;
    }

    // NUEVA FUNCIÓN: Mostrar resultados simplificados como la imagen
    displaySimplifiedResults(couponInfo) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');

        if (!couponInfo || !couponInfo.encontrado) {
            resultsContent.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--health-error);">
                    <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">🔍 RUT no encontrado</h3>
                    <p style="color: var(--gray-600);">El RUT ingresado no se encuentra en la base de datos de afiliados.</p>
                </div>
            `;
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // Calcular totales (suma de Lipigas + Abastible para cada kilo)
        const total5 = (couponInfo.lipigas['5'] || 0) + (couponInfo.abastible['5'] || 0);
        const total11 = (couponInfo.lipigas['11'] || 0) + (couponInfo.abastible['11'] || 0);
        const total15 = (couponInfo.lipigas['15'] || 0) + (couponInfo.abastible['15'] || 0);
        const total45 = (couponInfo.lipigas['45'] || 0) + (couponInfo.abastible['45'] || 0);

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

            <!-- Información Simplificada de Cupones - COMO LA IMAGEN -->
            <div style="background: linear-gradient(135deg, var(--white), var(--gray-25)); padding: 2.5rem; border-radius: 1.5rem; border: 1px solid var(--gray-200); box-shadow: var(--shadow-lg);">
                
                <!-- Tabla de Cupones por Kilos -->
                <div style="margin-bottom: 2rem;">
                    <h4 style="font-family: var(--font-display); font-size: 1.2rem; color: var(--gray-700); margin-bottom: 1rem; text-align: center;">
                        📊 Cupones por Tipo de Cilindro
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
                        <div style="text-align: center; padding: 1rem; background: rgba(16, 185, 129, 0.05); border-radius: 1rem; border: 1px solid rgba(16, 185, 129, 0.1);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--health-primary); margin-bottom: 0.5rem;">5 KG</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Total: ${total5}</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: rgba(16, 185, 129, 0.05); border-radius: 1rem; border: 1px solid rgba(16, 185, 129, 0.1);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--health-primary); margin-bottom: 0.5rem;">11 KG</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Total: ${total11}</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: rgba(16, 185, 129, 0.05); border-radius: 1rem; border: 1px solid rgba(16, 185, 129, 0.1);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--health-primary); margin-bottom: 0.5rem;">15 KG</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Total: ${total15}</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: rgba(16, 185, 129, 0.05); border-radius: 1rem; border: 1px solid rgba(16, 185, 129, 0.1);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--health-primary); margin-bottom: 0.5rem;">45 KG</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Total: ${total45}</div>
                        </div>
                    </div>
                </div>

                <!-- Estado Principal - COMO LA IMAGEN -->
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
    // GESTIÓN DE ARCHIVOS CON FIREBASE STORAGE
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
            // Subir a Firebase Storage
            await this.uploadExcelToFirebase(this.selectedFile);
            
            // También guardarlo localmente como respaldo
            const data = await this.readExcelFile(this.selectedFile);
            const fileData = {
                name: this.selectedFile.name,
                uploadDate: new Date().toISOString(),
                uploadedBy: this.currentUser.email,
                data: data
            };
            
            localStorage.setItem('gasSystemData', JSON.stringify(fileData));
            
            this.updateFilesList();
            this.showAlert('✅ Archivo subido exitosamente a la nube de Firebase', 'success');
            
            document.getElementById('excelFile').value = '';
            document.getElementById('uploadBtn').disabled = true;
            this.selectedFile = null;
            
        } catch (error) {
            console.error('Error al subir archivo:', error);
            this.showAlert('❌ Error al subir el archivo. Verifique su conexión', 'error');
        }

        this.showLoading(false);
    }

    // NUEVA FUNCIÓN: Subir Excel a Firebase Storage
    async uploadExcelToFirebase(file) {
        try {
            if (!window.firebase || !window.firebase.storage) {
                throw new Error('Firebase Storage no disponible');
            }

            const storage = window.firebase.storage();
            const storageRef = storage.ref();
            const excelRef = storageRef.child('cupones-disponibles.xlsx');
            
            // Subir el archivo
            const snapshot = await excelRef.put(file);
            console.log('📤 Excel subido a Firebase Storage');
            
            // Obtener URL de descarga
            const downloadURL = await snapshot.ref.getDownloadURL();
            console.log('🔗 URL de descarga:', downloadURL);
            
            return downloadURL;
            
        } catch (error) {
            console.error('Error subiendo a Firebase:', error);
            throw error;
        }
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
                    resolve(workbook);
                    
                } catch (error) {
                    console.error('Error procesando Excel:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    // Verificar si hay Excel en Firebase al cargar
    async checkStoredExcel() {
        try {
            const workbook = await this.downloadExcelFromFirebase();
            if (workbook) {
                console.log('✅ Excel disponible desde Firebase Storage');
            }
        } catch (error) {
            console.log('ℹ️ No hay Excel en Firebase Storage aún');
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
                            <div class="file-date">Por: ${fileData.uploadedBy}</div>
                            <div class="file-status">☁️ Almacenado en Firebase Storage</div>
                        </div>
                        <button class="delete-file-btn" onclick="bienestarSystem.deleteFile()">
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

        if (confirm('¿Está seguro de que desea eliminar el archivo cargado? Esta acción eliminará el archivo de Firebase Storage y no se puede deshacer.')) {
            this.deleteExcelFromFirebase();
            localStorage.removeItem('gasSystemData');
            this.currentWorkbook = null;
            this.updateFilesList();
            this.showAlert('✅ Archivo eliminado exitosamente', 'success');
            
            document.getElementById('resultsSection').style.display = 'none';
        }
    }

    // NUEVA FUNCIÓN: Eliminar de Firebase Storage
    async deleteExcelFromFirebase() {
        try {
            if (!window.firebase || !window.firebase.storage) {
                return;
            }

            const storage = window.firebase.storage();
            const storageRef = storage.ref();
            const excelRef = storageRef.child('cupones-disponibles.xlsx');
            
            await excelRef.delete();
            console.log('🗑️ Excel eliminado de Firebase Storage');
            
        } catch (error) {
            console.error('Error eliminando de Firebase:', error);
        }
    }

    // ========================================
    // UTILIDADES
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
    bienestarSystem.closeAdminModal();
}

// ========================================
// INITIALIZE SYSTEM
// ========================================

let bienestarSystem;

document.addEventListener('DOMContentLoaded', function() {
    // Importar Firebase Storage
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
    script.type = 'module';
    document.head.appendChild(script);
    
    bienestarSystem = new BienestarAPSSystem();
    
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
    
    console.log('🏥 Sistema Bienestar APS v3.0 iniciado con Firebase Storage');
    console.log('📧 Admin: Bienestar.aps@cmpuentealto.cl');
    console.log('🔑 Password: 20BAPS25');
});

window.bienestarSystem = bienestarSystem;
