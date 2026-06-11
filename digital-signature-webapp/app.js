// app.js - Phiên bản sửa lỗi phần 5, thêm console.log để dễ debug
import { 
    generateKeyPair, 
    signMessage, 
    verifySignature, 
    saveKeyPair, 
    loadKeyPair
} from './crypto-utils.js';

// DOM Elements
const generateKeyBtn = document.getElementById('generateKeyBtn');
const publicKeyDisplay = document.getElementById('publicKeyDisplay');
const privateKeyDisplay = document.getElementById('privateKeyDisplay');
const messageInput = document.getElementById('messageInput');
const signBtn = document.getElementById('signBtn');
const signatureDisplay = document.getElementById('signatureDisplay');
const copySignatureBtn = document.getElementById('copySignatureBtn');
const verifyMessageInput = document.getElementById('verifyMessageInput');
const signatureInput = document.getElementById('signatureInput');
const verifyBtn = document.getElementById('verifyBtn');
const verifyResult = document.getElementById('verifyResult');

// PDF elements (ký thêm text)
const pdfInput = document.getElementById('pdfInput');
const signPdfBtn = document.getElementById('signPdfBtn');
const pdfStatus = document.getElementById('pdfStatus');

// Xác thực PDF phần 5 - kiểm tra kỹ ID
const pdfStandardInput = document.getElementById('verifyPdfStandardInput');
const pdfStandardBtn = document.getElementById('verifyPdfStandardBtn');
const pdfStandardVerifyResult = document.getElementById('pdfStandardVerifyResult');
const pdfStandardSignatureDetails = document.getElementById('pdfStandardSignatureDetails');
const signatureStandardInfo = document.getElementById('signatureStandardInfo');

// Kiểm tra nếu các element tồn tại
console.log('PDF Standard Input:', pdfStandardInput);
console.log('PDF Standard Button:', pdfStandardBtn);
console.log('PDF Standard Verify Result:', pdfStandardVerifyResult);

let currentPublicKey = null;
let currentPrivateKey = null;
let currentPdfBytes = null;
let currentStandardPdfBytes = null;

// Helper: hiển thị thông báo
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '1000';
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : (type === 'error' ? '#f44336' : '#2196F3');
    notification.style.color = 'white';
    notification.style.fontWeight = 'bold';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function updateKeyDisplay(publicKey, privateKey) {
    if (publicKey && privateKey) {
        publicKeyDisplay.textContent = publicKey.substring(0, 100) + '...';
        privateKeyDisplay.textContent = privateKey.substring(0, 100) + '...';
        currentPublicKey = publicKey;
        currentPrivateKey = privateKey;
        saveKeyPair(publicKey, privateKey);
    } else {
        publicKeyDisplay.textContent = 'Chưa tạo';
        privateKeyDisplay.textContent = 'Chưa tạo';
        currentPublicKey = null;
        currentPrivateKey = null;
    }
}

async function handleGenerateKey() {
    try {
        showNotification('Đang tạo cặp khóa...', 'info');
        const keyPair = await generateKeyPair();
        updateKeyDisplay(keyPair.publicKey, keyPair.privateKey);
        showNotification('Tạo cặp khóa thành công!', 'success');
    } catch (error) {
        showNotification('Lỗi tạo khóa: ' + error.message, 'error');
    }
}

async function handleSign() {
    const message = messageInput.value.trim();
    if (!message) return showNotification('Vui lòng nhập văn bản!', 'warning');
    if (!currentPrivateKey) return showNotification('Chưa có khóa!', 'warning');
    try {
        const signature = await signMessage(currentPrivateKey, message);
        signatureDisplay.textContent = signature;
        copySignatureBtn.style.display = 'inline-block';
        showNotification('Ký số thành công!', 'success');
    } catch (error) {
        showNotification('Lỗi ký: ' + error.message, 'error');
    }
}

function handleCopySignature() {
    const sig = signatureDisplay.textContent;
    if (sig && sig !== 'Chưa ký') {
        navigator.clipboard.writeText(sig);
        showNotification('Đã sao chép chữ ký!', 'success');
    }
}

async function handleVerify() {
    const message = verifyMessageInput.value.trim();
    const signature = signatureInput.value.trim();
    if (!message) return showNotification('Nhập văn bản gốc!', 'warning');
    if (!signature) return showNotification('Nhập chữ ký!', 'warning');
    if (!currentPublicKey) return showNotification('Chưa có khóa công khai!', 'warning');
    try {
        const isValid = await verifySignature(currentPublicKey, message, signature);
        if (isValid) {
            verifyResult.textContent = '✅ CHỮ KÝ HỢP LỆ!';
            verifyResult.className = 'result valid';
            showNotification('Xác thực thành công!', 'success');
        } else {
            verifyResult.textContent = '❌ CHỮ KÝ KHÔNG HỢP LỆ!';
            verifyResult.className = 'result invalid';
            showNotification('Xác thực thất bại!', 'error');
        }
    } catch (error) {
        showNotification('Lỗi xác thực: ' + error.message, 'error');
    }
}

// ========== Hỗ trợ xóa dấu tiếng Việt ==========
function removeVietnameseTones(str) {
    str = str.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a');
    str = str.replace(/[èéẹẻẽêềếệểễ]/g, 'e');
    str = str.replace(/[ìíịỉĩ]/g, 'i');
    str = str.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o');
    str = str.replace(/[ùúụủũưừứựửữ]/g, 'u');
    str = str.replace(/[ỳýỵỷỹ]/g, 'y');
    str = str.replace(/đ/g, 'd');
    str = str.replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A');
    str = str.replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E');
    str = str.replace(/[ÌÍỊỈĨ]/g, 'I');
    str = str.replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O');
    str = str.replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U');
    str = str.replace(/[ỲÝỴỶỸ]/g, 'Y');
    str = str.replace(/Đ/g, 'D');
    return str;
}

// ========== PDF Function thêm text ==========
async function addTextToPDF(pdfBytes, text) {
    if (!window.PDFLib) {
        throw new Error('PDFLib chưa được tải. Vui lòng kiểm tra kết nối mạng hoặc tải lại trang.');
    }
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const safeText = removeVietnameseTones(text);
    firstPage.drawText(safeText, {
        x: 50,
        y: 50,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
    });
    const modifiedBytes = await pdfDoc.save();
    return modifiedBytes;
}

// Xử lý ký PDF (thêm text)
if (pdfInput) {
    pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            currentPdfBytes = new Uint8Array(arrayBuffer);
            pdfStatus.innerHTML = `<span style="color: green;">✅ Đã tải: ${file.name}</span>`;
            signPdfBtn.disabled = false;
        } else {
            pdfStatus.innerHTML = '<span style="color: red;">❌ Vui lòng chọn file PDF hợp lệ.</span>';
            signPdfBtn.disabled = true;
        }
    });
}

if (signPdfBtn) {
    signPdfBtn.addEventListener('click', async () => {
        if (!currentPdfBytes) {
            showNotification('Hãy tải file PDF lên trước!', 'warning');
            return;
        }
        if (!currentPrivateKey) {
            showNotification('Cần tạo cặp khóa trước khi ký!', 'warning');
            return;
        }
        try {
            const sigText = `Chu ky so (demo) - Nguoi ky: ${currentPublicKey.slice(0, 30)}... - ${new Date().toLocaleString()}`;
            const signedBytes = await addTextToPDF(currentPdfBytes, sigText);
            const blob = new Blob([signedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'signed_document.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Đã thêm chữ ký (dạng text) vào PDF!', 'success');
            pdfStatus.innerHTML += '<br/>✅ Đã ký xong, file đã được tải xuống.';
        } catch (err) {
            console.error(err);
            showNotification('Lỗi khi ký PDF: ' + err.message, 'error');
        }
    });
}

// ========== Xác thực PDF phần 5 (mock, nhưng có debug) ==========
function mockVerifyPDF(pdfBytes) {
    // Đọc 10KB đầu để tìm dấu hiệu chữ ký số
    const bytesToCheck = pdfBytes.slice(0, 10000);
    let text = '';
    try {
        text = new TextDecoder().decode(bytesToCheck);
    } catch(e) {
        text = '';
    }
    const hasSignature = text.includes('/Sig') || text.includes('/ByteRange') || text.includes('adbe.pkcs7');
    console.log('Mock verify - hasSignature:', hasSignature);
    return {
        verified: hasSignature,
        authenticity: hasSignature,
        integrity: hasSignature,
        expired: false,
        signatures: hasSignature ? [
            {
                issuedTo: "Demo Issuer (mock)",
                issuedBy: "Mock CA",
                validityPeriod: {
                    notBefore: "2024-01-01",
                    notAfter: "2025-12-31"
                },
                signatureMeta: {
                    reason: "Xác thực demo",
                    location: "Trực tuyến",
                    date: new Date().toISOString()
                }
            }
        ] : []
    };
}

// Gắn sự kiện cho phần 5 - kiểm tra kỹ nếu các element tồn tại
if (pdfStandardInput) {
    console.log('Gắn sự kiện change cho pdfStandardInput');
    pdfStandardInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        console.log('File selected:', file);
        if (file && file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            currentStandardPdfBytes = new Uint8Array(arrayBuffer);
            if (pdfStandardVerifyResult) {
                pdfStandardVerifyResult.innerHTML = `<span style="color: green;">✅ Đã tải: ${file.name}</span>`;
            }
            if (pdfStandardBtn) pdfStandardBtn.disabled = false;
            if (pdfStandardSignatureDetails) pdfStandardSignatureDetails.style.display = 'none';
        } else {
            if (pdfStandardVerifyResult) {
                pdfStandardVerifyResult.innerHTML = '<span style="color: red;">❌ Vui lòng chọn file PDF hợp lệ.</span>';
            }
            if (pdfStandardBtn) pdfStandardBtn.disabled = true;
        }
    });
} else {
    console.error('Không tìm thấy phần tử pdfStandardInput (id="verifyPdfStandardInput")');
}

if (pdfStandardBtn) {
    console.log('Gắn sự kiện click cho pdfStandardBtn');
    pdfStandardBtn.addEventListener('click', async () => {
        console.log('Nút xác thực được nhấn');
        if (!currentStandardPdfBytes) {
            showNotification('Hãy tải file PDF lên trước!', 'warning');
            return;
        }
        try {
            showNotification('Đang xác thực chữ ký PDF...', 'info');
            const result = mockVerifyPDF(currentStandardPdfBytes);
            console.log('Kết quả mock:', result);
            
            let resultHtml = '<h3>Kết quả xác thực (Mock):</h3>';
            resultHtml += `<p><strong>✅ Xác thực tổng thể:</strong> ${result.verified ? 'THÀNH CÔNG' : 'THẤT BẠI'}</p>`;
            resultHtml += `<p><strong>🔐 Tính xác thực (Authenticity):</strong> ${result.authenticity ? 'Hợp lệ' : 'Không hợp lệ'}</p>`;
            resultHtml += `<p><strong>📄 Tính toàn vẹn (Integrity):</strong> ${result.integrity ? 'Nguyên vẹn' : 'Đã bị thay đổi'}</p>`;
            resultHtml += `<p><strong>⏰ Hạn chứng chỉ (Expired):</strong> ${result.expired ? 'Đã hết hạn' : 'Còn hiệu lực'}</p>`;
            resultHtml += `<p><em>Lưu ý: Đây là kết quả mô phỏng dựa trên phát hiện trường chữ ký. Để xác thực thực sự, cần tích hợp backend.</em></p>`;
            if (pdfStandardVerifyResult) {
                pdfStandardVerifyResult.innerHTML = resultHtml;
                pdfStandardVerifyResult.className = `result ${result.verified ? 'valid' : 'invalid'}`;
            }
            
            if (result.signatures && result.signatures.length > 0 && pdfStandardSignatureDetails && signatureStandardInfo) {
                pdfStandardSignatureDetails.style.display = 'block';
                let sigHtml = '';
                result.signatures.forEach((sig, index) => {
                    sigHtml += `<div style="border-bottom: 1px solid #ddd; margin-bottom: 10px; padding-bottom: 10px;">`;
                    sigHtml += `<strong>Chữ ký số ${index + 1} (Mock):</strong><br>`;
                    sigHtml += `<strong>- Người ký (IssuedTo):</strong> ${sig.issuedTo}<br>`;
                    sigHtml += `<strong>- Nhà phát hành (IssuedBy):</strong> ${sig.issuedBy}<br>`;
                    sigHtml += `<strong>- Thời hạn:</strong> ${sig.validityPeriod.notBefore} → ${sig.validityPeriod.notAfter}<br>`;
                    sigHtml += `<strong>- Lý do ký:</strong> ${sig.signatureMeta.reason}<br>`;
                    sigHtml += `<strong>- Vị trí:</strong> ${sig.signatureMeta.location}<br>`;
                    sigHtml += `<strong>- Ngày ký:</strong> ${sig.signatureMeta.date}<br>`;
                    sigHtml += `</div>`;
                });
                signatureStandardInfo.innerHTML = sigHtml;
                showNotification(`Phát hiện chữ ký (mock) trong file PDF!`, 'success');
            } else if (pdfStandardSignatureDetails && signatureStandardInfo) {
                pdfStandardSignatureDetails.style.display = 'block';
                signatureStandardInfo.innerHTML = '<p>Không tìm thấy chữ ký số nào trong file PDF này.</p>';
                showNotification('Không tìm thấy chữ ký số!', 'warning');
            }
        } catch (error) {
            console.error("Lỗi khi xác thực PDF:", error);
            if (pdfStandardVerifyResult) {
                pdfStandardVerifyResult.innerHTML = `<span style="color: red;">❌ Lỗi xác thực: ${error.message}</span>`;
                pdfStandardVerifyResult.className = 'result invalid';
            }
            showNotification('Lỗi xác thực PDF: ' + error.message, 'error');
        }
    });
} else {
    console.error('Không tìm thấy phần tử pdfStandardBtn (id="verifyPdfStandardBtn")');
}

// Gắn sự kiện
if (generateKeyBtn) generateKeyBtn.addEventListener('click', handleGenerateKey);
if (signBtn) signBtn.addEventListener('click', handleSign);
if (copySignatureBtn) copySignatureBtn.addEventListener('click', handleCopySignature);
if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);

// Khởi tạo: tải key từ localStorage nếu có
const saved = loadKeyPair();
if (saved.publicKey && saved.privateKey) {
    updateKeyDisplay(saved.publicKey, saved.privateKey);
    showNotification('Đã tải khóa từ bộ nhớ!', 'success');
} else {
    handleGenerateKey();
}