// Sistema de Cupones de Gas - JavaScript
class GasSystemManager {
    constructor() {
        this.currentData = null;
        this.affiliatesData = [];
        this.transactionsData = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredData();
        this.updateFilesList();
    }

    bindEvents() {
        // Búsqueda de cupones
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCoupons());
        document.getElementById('rutInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCoupons();
        });
        document.getElementById('rutInput').addEventListener('input', (e) => this.formatRUT(e));

        // Panel administrativo
        document.getElementById('adminBtn').addEventListener('click', () => this.openAdminPanel());
        document.querySelector('.close-btn').addEventListener('click', () => this.closeAdminPanel());
        document.getElementById('adminModal').addEventListener('click', (e) => {
            if (e.target.id === 'adminModal') this.closeAdminPanel();
        });

        // Subida de archivos
        document.getElementById('excelFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFile());

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAdminPanel();
        });
    }

    // Validación y formato de RUT chileno
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
        // Eliminar puntos y guiones
        const cleanRUT = rut.replace(/[.-]/g, '');
        
        if (cleanRUT.length < 8) return false;
        
        const rutNumber = cleanRUT.slice(0, -1);
        const dv = cleanRUT.slice(-1).toLowerCase();
        
        // Calcular dígito verificador
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

    // Búsqueda de cupones
    async searchCoupons() {
        const rutInput = document.getElementById('rutInput');
        const rut = rutInput.value.trim();

        if (!rut) {
            this.showAlert('Por favor ingrese un RUT', 'error');
            return;
        }

        if (!this.validateRUT(rut)) {
            this.showAlert('RUT inválido. Verifique el formato (Ej: 12345678-9)', 'error');
            return;
        }

        if (!this.currentData || !this.transactionsData.length) {
            this.showAlert('No hay datos cargados. Por favor suba un archivo Excel desde el panel administrativo', 'info');
            return;
        }

        this.showLoading(true);

        try {
            const normalizedRUT = this.normalizeRUT(rut);
            const userInfo = this.findUserInfo(normalizedRUT);
            
            if (!userInfo) {
                this.showAlert('RUT no encontrado en la base de datos', 'error');
                this.showLoading(false);
                return;
            }

            const couponsInfo = this.calculateCouponsInfo(normalizedRUT);
            this.displayResults(userInfo, couponsInfo);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error al buscar cupones:', error);
            this.showAlert('Error al procesar la búsqueda. Verifique los datos cargados', 'error');
            this.showLoading(false);
        }
    }

    findUserInfo(rut) {
        return this.affiliatesData.find(affiliate => 
            affiliate.rut && this.normalizeRUT(affiliate.rut) === rut
        );
    }

    calculateCouponsInfo(rut) {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Filtrar transacciones del mes actual
        const monthlyTransactions = this.transactionsData.filter(transaction => {
            if (!transaction.fecha) return false;
            const transactionDate = new Date(transaction.fecha);
            return transactionDate.getMonth() + 1 === currentMonth && 
                   transactionDate.getFullYear() === currentYear &&
                   transaction.rutAfiliado && this.normalizeRUT(transaction.rutAfiliado) === rut;
        });

        // Agrupar por tipo de gas y cilindro
        const couponsUsed = {
            lipigas: { '5': 0, '11': 0, '15': 0, '45': 0 },
            abastible: { '5': 0, '11': 0, '15': 0, '45': 0 }
        };

        monthlyTransactions.forEach(transaction => {
            const gasType = transaction.concepto ? transaction.concepto.toLowerCase() : '';
            
            if (gasType.includes('lipigas')) {
                // Sumar cupones de Lipigas
                couponsUsed.lipigas['5'] += parseInt(transaction['05 KILOS']) || 0;
                couponsUsed.lipigas['11'] += parseInt(transaction['11 KILOS']) || 0;
                couponsUsed.lipigas['15'] += parseInt(transaction['15 KILOS']) || 0;
                couponsUsed.lipigas['45'] += parseInt(transaction['45 KILOS']) || 0;
            } else if (gasType.includes('abastible')) {
                // Para ABASTIBLE, usar las columnas .1 si existen, sino las originales
                const abastible5 = transaction['05 KILOS.1'] !== undefined ? 
                                  transaction['05 KILOS.1'] : transaction['05 KILOS'];
                const abastible11 = transaction['11 KILOS.1'] !== undefined ? 
                                   transaction['11 KILOS.1'] : transaction['11 KILOS'];  
                const abastible15 = transaction['15 KILOS.1'] !== undefined ? 
                                   transaction['15 KILOS.1'] : transaction['15 KILOS'];
                const abastible45 = transaction['45 KILOS.1'] !== undefined ? 
                                   transaction['45 KILOS.1'] : transaction['45 KILOS'];
                
                couponsUsed.abastible['5'] += parseInt(abastible5) || 0;
                couponsUsed.abastible['11'] += parseInt(abastible11) || 0;
                couponsUsed.abastible['15'] += parseInt(abastible15) || 0;
                couponsUsed.abastible['45'] += parseInt(abastible45) || 0;
            } else if (gasType.includes('lipigas') || gasType.includes('abastible')) {
                // Manejar conceptos mixtos
                const isLipigas = gasType.indexOf('lipigas') !== -1;
                const isAbastible = gasType.indexOf('abastible') !== -1;
                
                if (isLipigas) {
                    couponsUsed.lipigas['5'] += parseInt(transaction['05 KILOS']) || 0;
                    couponsUsed.lipigas['11'] += parseInt(transaction['11 KILOS']) || 0;
                    couponsUsed.lipigas['15'] += parseInt(transaction['15 KILOS']) || 0;
                    couponsUsed.lipigas['45'] += parseInt(transaction['45 KILOS']) || 0;
                }
                
                if (isAbastible) {
                    const abastible5 = transaction['05 KILOS.1'] || 0;
                    const abastible11 = transaction['11 KILOS.1'] || 0;  
                    const abastible15 = transaction['15 KILOS.1'] || 0;
                    const abastible45 = transaction['45 KILOS.1'] || 0;
                    
                    couponsUsed.abastible['5'] += parseInt(abastible5) || 0;
                    couponsUsed.abastible['11'] += parseInt(abastible11) || 0;
                    couponsUsed.abastible['15'] += parseInt(abastible15) || 0;
                    couponsUsed.abastible['45'] += parseInt(abastible45) || 0;
                }
            }
        });

        // Límites mensuales (ajustar según las reglas del negocio)
        const monthlyLimits = {
            lipigas: { '5': 4, '11': 3, '15': 2, '45': 1 },
            abastible: { '5': 4, '11': 3, '15': 2, '45': 1 }
        };

        // Calcular disponibles
        const couponsAvailable = {
            lipigas: {},
            abastible: {}
        };

        for (const gasType of ['lipigas', 'abastible']) {
            for (const size of ['5', '11', '15', '45']) {
                couponsAvailable[gasType][size] = Math.max(0, 
                    monthlyLimits[gasType][size] - couponsUsed[gasType][size]
                );
            }
        }

        return {
            used: couponsUsed,
            available: couponsAvailable,
            totalUsedThisMonth: monthlyTransactions.length,
            lastTransaction: monthlyTransactions.length > 0 ? 
                monthlyTransactions[monthlyTransactions.length - 1].fecha : null
        };
    }

    displayResults(userInfo, couponsInfo) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');

        const html = `
            <div class="user-info">
                <div class="user-name">${userInfo.nombres} ${userInfo.apellidos}</div>
                <div class="user-details">
                    <div class="user-detail">
                        <span class="detail-label">RUT:</span>
                        <span class="detail-value">${userInfo.rut}</span>
                    </div>
                    <div class="user-detail">
                        <span class="detail-label">Centro de Salud:</span>
                        <span class="detail-value">${userInfo.establecimiento || 'No especificado'}</span>
                    </div>
                    <div class="user-detail">
                        <span class="detail-label">Cupones usados este mes:</span>
                        <span class="detail-value">${couponsInfo.totalUsedThisMonth}</span>
                    </div>
                    ${couponsInfo.lastTransaction ? `
                    <div class="user-detail">
                        <span class="detail-label">Última transacción:</span>
                        <span class="detail-value">${new Date(couponsInfo.lastTransaction).toLocaleDateString('es-CL')}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="gas-types-grid">
                <div class="gas-type-card lipigas">
                    <div class="gas-type-header">
                        <span class="gas-type-icon">⛽</span>
                        <span class="gas-type-name">LIPIGAS</span>
                    </div>
                    <div class="cylinders-grid">
                        ${this.renderCylinderInfo('5', couponsInfo.used.lipigas['5'], couponsInfo.available.lipigas['5'])}
                        ${this.renderCylinderInfo('11', couponsInfo.used.lipigas['11'], couponsInfo.available.lipigas['11'])}
                        ${this.renderCylinderInfo('15', couponsInfo.used.lipigas['15'], couponsInfo.available.lipigas['15'])}
                        ${this.renderCylinderInfo('45', couponsInfo.used.lipigas['45'], couponsInfo.available.lipigas['45'])}
                    </div>
                </div>

                <div class="gas-type-card abastible">
                    <div class="gas-type-header">
                        <span class="gas-type-icon">🔥</span>
                        <span class="gas-type-name">ABASTIBLE</span>
                    </div>
                    <div class="cylinders-grid">
                        ${this.renderCylinderInfo('5', couponsInfo.used.abastible['5'], couponsInfo.available.abastible['5'])}
                        ${this.renderCylinderInfo('11', couponsInfo.used.abastible['11'], couponsInfo.available.abastible['11'])}
                        ${this.renderCylinderInfo('15', couponsInfo.used.abastible['15'], couponsInfo.available.abastible['15'])}
                        ${this.renderCylinderInfo('45', couponsInfo.used.abastible['45'], couponsInfo.available.abastible['45'])}
                    </div>
                </div>
            </div>
        `;

        resultsContent.innerHTML = html;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    renderCylinderInfo(weight, used, available) {
        return `
            <div class="cylinder-info">
                <div class="cylinder-weight">${weight} KG</div>
                <div class="cylinder-used">
                    <span class="label">Usados:</span> ${used}
                </div>
                <div class="cylinder-available">
                    <span class="label">Disponibles:</span> ${available}
                </div>
            </div>
        `;
    }

    // Panel administrativo
    openAdminPanel() {
        document.getElementById('adminModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeAdminPanel() {
        document.getElementById('adminModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Manejo de archivos
    handleFileSelect(e) {
        const file = e.target.files[0];
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (file && file.name.match(/\.(xlsx|xls)$/)) {
            uploadBtn.disabled = false;
            this.selectedFile = file;
            this.showAlert(`Archivo seleccionado: ${file.name}`, 'success');
        } else {
            uploadBtn.disabled = true;
            this.selectedFile = null;
            if (file) {
                this.showAlert('Por favor seleccione un archivo Excel (.xlsx o .xls)', 'error');
            }
        }
    }

    async uploadFile() {
        if (!this.selectedFile) {
            this.showAlert('Por favor seleccione un archivo', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Usar la librería XLSX para leer el archivo
            const data = await this.readExcelFile(this.selectedFile);
            
            if (data) {
                // Guardar datos en localStorage
                const fileData = {
                    name: this.selectedFile.name,
                    uploadDate: new Date().toISOString(),
                    data: data
                };
                
                localStorage.setItem('gasSystemData', JSON.stringify(fileData));
                this.currentData = data;
                this.processExcelData(data);
                
                this.updateFilesList();
                this.showAlert('Archivo subido y procesado exitosamente', 'success');
                
                // Limpiar el input de archivo
                document.getElementById('excelFile').value = '';
                document.getElementById('uploadBtn').disabled = true;
                this.selectedFile = null;
            }
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            this.showAlert('Error al procesar el archivo. Verifique que sea un archivo Excel válido', 'error');
        }

        this.showLoading(false);
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    // Verificar que XLSX esté disponible
                    if (typeof XLSX === 'undefined') {
                        reject(new Error('Librería XLSX no disponible. Intente recargar la página.'));
                        return;
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Usar el procesador especializado
                    if (typeof ExcelProcessor !== 'undefined') {
                        const processor = new ExcelProcessor();
                        const processedData = await processor.processExcelFile(file);
                        resolve(processedData);
                    } else {
                        // Fallback al método original si no hay procesador
                        const result = {
                            affiliates: [],
                            transactions: [],
                            summary: {},
                            sheetNames: workbook.SheetNames
                        };
                        resolve(result);
                    }
                } catch (error) {
                    console.error('Error al procesar Excel:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    processExcelData(data) {
        // Usar los datos reales del Excel si están disponibles
        if (data && data.affiliates && data.transactions) {
            this.affiliatesData = data.affiliates;
            this.transactionsData = data.transactions;
            this.summaryData = data.summary || {};
            
            console.log('Datos reales del Excel procesados:', {
                afiliados: this.affiliatesData.length,
                transacciones: this.transactionsData.length,
                hojas: data.sheetNames || []
            });
        } else {
            // Fallback a datos de ejemplo para testing
            console.log('Usando datos de ejemplo para testing...');
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
                rut: '17108716-3',
                nombres: 'ANGELINA ALEJANDRA',
                apellidos: 'ABARZUA OLAVE',
                establecimiento: 'ADMINISTRACION SALUD'
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
                
                filesList.innerHTML = `
                    <div class="file-item">
                        <div>
                            <div class="file-name">${fileData.name}</div>
                            <div class="file-date">Subido: ${uploadDate}</div>
                        </div>
                        <button class="delete-file-btn" onclick="gasSystem.deleteFile()">
                            Eliminar
                        </button>
                    </div>
                `;
            } catch (error) {
                filesList.innerHTML = '<p class="no-files">Error al cargar información de archivos</p>';
            }
        } else {
            filesList.innerHTML = '<p class="no-files">No hay archivos cargados</p>';
        }
    }

    deleteFile() {
        if (confirm('¿Está seguro de que desea eliminar el archivo cargado?')) {
            localStorage.removeItem('gasSystemData');
            this.currentData = null;
            this.affiliatesData = [];
            this.transactionsData = [];
            this.updateFilesList();
            this.showAlert('Archivo eliminado exitosamente', 'info');
            
            // Ocultar resultados si están visibles
            document.getElementById('resultsSection').style.display = 'none';
        }
    }

    // Utilidades
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'block' : 'none';
        document.body.style.overflow = show ? 'hidden' : 'auto';
    }

    showAlert(message, type = 'info') {
        // Remover alertas existentes
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        // Insertar después del formulario de búsqueda
        const searchCard = document.querySelector('.search-card');
        searchCard.parentNode.insertBefore(alert, searchCard.nextSibling);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);

        // Permitir cerrar haciendo clic
        alert.addEventListener('click', () => alert.remove());
    }
}

// Función para cargar la librería XLSX si no está disponible
function loadSheetJS() {
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        document.head.appendChild(script);
        
        script.onload = () => {
            console.log('SheetJS library loaded');
        };
    }
}

// Inicializar el sistema cuando se carga la página
let gasSystem;

document.addEventListener('DOMContentLoaded', function() {
    loadSheetJS();
    gasSystem = new GasSystemManager();
    
    // Efecto de carga inicial
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
    
    // Mensaje de bienvenida
    console.log('🔥 Sistema de Cupones de Gas inicializado correctamente');
});

// Hacer disponible globalmente para debugging
window.gasSystem = gasSystem;
