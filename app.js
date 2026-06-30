// app.js - Hỗ trợ đa người dùng, xác thực với khóa tùy chỉnh, ký PDF đa dạng, tạo PDF mẫu (mock)
import {
  generateKeyPair,
  signMessage,
  verifySignature,
  saveKeyPair,
  loadKeyPair
} from './crypto-utils.js';

// ========== CẤU HÌNH TÀI KHOẢN ==========
const ACCOUNTS = {
  admin: { password: 'admin123', role: 'admin', displayName: 'Giam doc' },
  user1: { password: 'user123', role: 'user', displayName: 'Pho giam doc' },
  user2: { password: 'user123', role: 'user', displayName: 'Ke toan' },
};

let currentUser = null;

// DOM Elements - Đăng nhập
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginStatus = document.getElementById('loginStatus');
const currentUserDisplay = document.getElementById('currentUserDisplay');
const currentUserRoleDisplay = document.getElementById('currentUserRoleDisplay');
const userPublicKeyDisplay = document.getElementById('userPublicKeyDisplay');
const loginCard = document.getElementById('loginCard');
const userInfoCard = document.getElementById('userInfoCard');

// DOM Elements - Các chức năng cần disable/enable
const signBtn = document.getElementById('signBtn');
const verifyBtn = document.getElementById('verifyBtn');
const verifyWithCustomKeyBtn = document.getElementById('verifyWithCustomKeyBtn');
const verifyPublicKeyInput = document.getElementById('verifyPublicKeyInput');
const pdfSignInput = document.getElementById('pdfSignInput');
const uploadSignatureInput = document.getElementById('uploadSignatureImage');
const signatureTextInput = document.getElementById('signatureTextInput');
const verifyPdfStandardInput = document.getElementById('verifyPdfStandardInput');
const verifyPdfStandardBtn = document.getElementById('verifyPdfStandardBtn');

// DOM Elements - Các phần khác
const generateKeyBtn = document.getElementById('generateKeyBtn');
const publicKeyDisplay = document.getElementById('publicKeyDisplay');
const privateKeyDisplay = document.getElementById('privateKeyDisplay');
const messageInput = document.getElementById('messageInput');
const signatureDisplay = document.getElementById('signatureDisplay');
const copySignatureBtn = document.getElementById('copySignatureBtn');
const verifyMessageInput = document.getElementById('verifyMessageInput');
const signatureInput = document.getElementById('signatureInput');
const verifyResult = document.getElementById('verifyResult');

// PDF elements
const pdfStandardInput = document.getElementById('verifyPdfStandardInput');
const pdfStandardBtn = document.getElementById('verifyPdfStandardBtn');
const pdfStandardVerifyResult = document.getElementById('pdfStandardVerifyResult');
const pdfStandardSignatureDetails = document.getElementById('pdfStandardSignatureDetails');
const signatureStandardInfo = document.getElementById('signatureStandardInfo');

const pdfPreviewCanvas = document.getElementById('pdfPreviewCanvas');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageNumDisplay = document.getElementById('pageNumDisplay');
const selectedPositionSpan = document.getElementById('selectedPosition');
const signatureCanvas = document.getElementById('signatureCanvas');
const clearSignatureBtn = document.getElementById('clearSignatureBtn');
const confirmSignBtn = document.getElementById('confirmSignBtn');
const signTextBtn = document.getElementById('signTextBtn');
const pdfSignStatus = document.getElementById('pdfSignStatus');
const previewSignatureImg = document.getElementById('previewSignatureImg');
const createSamplePdfBtn = document.getElementById('createSamplePdfBtn');

// Thêm DOM Element cho dấu mộc
const uploadStampInput = document.getElementById('uploadStampImage');
const previewStampImg = document.getElementById('previewStampImg');

// Thêm biến toàn cục lưu trữ dữ liệu dấu mộc
// ========== DẤU MỘC MẶC ĐỊNH ==========
let defaultStampBase64 = null;
const DEFAULT_STAMP_PATH = './default-stamp.png';
let uploadedStampBase64 = null;

// ========== CHỮ KÝ MẶC ĐỊNH THEO USERNAME ==========
let defaultSignatureBase64 = null;
const SIGNATURE_FOLDER = './signatures/';   // Thư mục chứa ảnh chữ ký mặc định

// Biến toàn cục
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.5;
let selectedPosition = null;
let currentPdfBuffer = null;
let currentStandardPdfBytes = null;
let uploadedSignatureBase64 = null;
let droppedSignatureBase64 = null;

function toggleStampSection() {
  const stampSection = document.getElementById('stampSection');
  if (stampSection) {
    stampSection.style.display = (currentUser && currentUser.username === 'admin') ? 'block' : 'none';
  }
}
// ========== Helper: hiển thị thông báo ==========
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


// Load dấu mộc mặc định cho Admin
async function loadDefaultStamp() {
  if (!currentUser || currentUser.username !== 'admin') return;

  try {
    const response = await fetch(DEFAULT_STAMP_PATH);
    if (!response.ok) throw new Error('Không tìm thấy file');

    const blob = await response.blob();
    const reader = new FileReader();
    reader.onload = (e) => {
      defaultStampBase64 = e.target.result.split(',')[1];
      uploadedStampBase64 = defaultStampBase64;

      const preview = document.getElementById('previewStampImg');
      if (preview) preview.style.display = 'block';

      console.log('✅ Đã load dấu mộc mặc định cho Admin');
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    console.warn('⚠️ Không load được dấu mộc mặc định:', err);
  }
}

// Load ảnh chữ ký mặc định theo username
async function loadDefaultSignature() {
  if (!currentUser) return null;

  try {
    const signaturePath = `${SIGNATURE_FOLDER}${currentUser.username}.png`;
    const response = await fetch(signaturePath);

    if (!response.ok) {
      console.warn(`⚠️ Không tìm thấy chữ ký mặc định: ${signaturePath}`);
      return null;
    }

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve) => {
      reader.onload = (e) => {
        defaultSignatureBase64 = e.target.result.split(',')[1];
        console.log(`✅ Đã load chữ ký mặc định cho ${currentUser.username}`);
        resolve(defaultSignatureBase64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('⚠️ Không load được chữ ký mặc định:', err);
    return null;
  }
}
// ========== QUẢN LÝ KHÓA THEO NGƯỜI DÙNG ==========
function saveUserKey(username, publicKey, privateKey) {
  localStorage.setItem('user_keys_' + username, JSON.stringify({ publicKey, privateKey }));
}

function loadUserKey(username) {
  const data = localStorage.getItem('user_keys_' + username);
  if (data) return JSON.parse(data);
  return null;
}

async function generateKeyForUser(username) {
  const keyPair = await generateKeyPair();
  saveUserKey(username, keyPair.publicKey, keyPair.privateKey);
  return keyPair;
}

async function getOrCreateUserKey(username) {
  let keys = loadUserKey(username);
  if (!keys) {
    keys = await generateKeyForUser(username);
    showNotification(`Đã tạo cặp khóa mới cho ${username}`, 'success');
  }
  return keys;
}

// ========== ĐĂNG NHẬP / ĐĂNG XUẤT ==========
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    loginStatus.textContent = '❌ Vui lòng nhập tên và mật khẩu';
    loginStatus.style.color = 'red';
    return;
  }
  const account = ACCOUNTS[username];
  if (!account || account.password !== password) {
    loginStatus.textContent = '❌ Sai tên đăng nhập hoặc mật khẩu';
    loginStatus.style.color = 'red';
    return;
  }
  if (uploadStampInput) uploadStampInput.disabled = false;
  loginStatus.textContent = '✅ Đăng nhập thành công!';
  loginStatus.style.color = 'green';
  currentUser = { username, role: account.role, displayName: account.displayName };

  const keys = await getOrCreateUserKey(username);
  currentUser.publicKey = keys.publicKey;
  currentUser.privateKey = keys.privateKey;

  currentUserDisplay.textContent = currentUser.displayName + ' (' + currentUser.username + ')';
  currentUserRoleDisplay.textContent = currentUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
  userPublicKeyDisplay.textContent = currentUser.publicKey.substring(0, 80) + '...';

  loginCard.style.display = 'none';
  userInfoCard.style.display = 'block';

  // Enable các chức năng
  signBtn.disabled = false;
  verifyBtn.disabled = false;
  verifyWithCustomKeyBtn.disabled = false;
  pdfSignInput.disabled = false;
  uploadSignatureInput.disabled = false;
  signatureTextInput.disabled = false;
  verifyPdfStandardInput.disabled = false;
  verifyPdfStandardBtn.disabled = false;
  confirmSignBtn.disabled = false;
  signTextBtn.disabled = false;
  prevPageBtn.disabled = false;
  nextPageBtn.disabled = false;

  showNotification(`Chào mừng ${currentUser.displayName}!`, 'success');
  await loadDefaultStamp();
  await loadDefaultSignature();     // ← Thêm dòng này
  toggleStampSection();
});

logoutBtn.addEventListener('click', () => {
  uploadedStampBase64 = null;
  defaultStampBase64 = null;
  if (uploadStampInput) uploadStampInput.disabled = true;
  currentUser = null;
  loginCard.style.display = 'block';
  userInfoCard.style.display = 'none';
  loginStatus.textContent = 'Đã đăng xuất';
  loginStatus.style.color = '#555';
  signBtn.disabled = true;
  verifyBtn.disabled = true;
  verifyWithCustomKeyBtn.disabled = true;
  pdfSignInput.disabled = true;
  uploadSignatureInput.disabled = true;
  signatureTextInput.disabled = true;
  verifyPdfStandardInput.disabled = true;
  verifyPdfStandardBtn.disabled = true;
  confirmSignBtn.disabled = true;
  signTextBtn.disabled = true;
  prevPageBtn.disabled = true;
  nextPageBtn.disabled = true;
  publicKeyDisplay.textContent = 'Chưa đăng nhập';
  privateKeyDisplay.textContent = 'Chưa đăng nhập';
  showNotification('Đã đăng xuất', 'info');
});

// ========== CÁC CHỨC NĂNG CỐT LÕI ==========
function getCurrentKeys() {
  if (!currentUser) return null;
  return { publicKey: currentUser.publicKey, privateKey: currentUser.privateKey };
}

async function handleSign() {
  if (!currentUser) return showNotification('Vui lòng đăng nhập!', 'warning');
  const message = messageInput.value.trim();
  if (!message) return showNotification('Vui lòng nhập văn bản!', 'warning');
  try {
    const signature = await signMessage(currentUser.privateKey, message);
    signatureDisplay.textContent = signature;
    copySignatureBtn.style.display = 'inline-block';
    showNotification('Ký số thành công!', 'success');
  } catch (error) {
    showNotification('Lỗi ký: ' + error.message, 'error');
  }
}

// HÀM XÁC THỰC CHỮ KÝ (CÓ THỂ DÙNG KHÓA TÙY CHỈNH)
async function performVerification(publicKeyBase64, message, signature) {
  if (!publicKeyBase64) {
    showNotification('Vui lòng nhập Public Key hoặc đăng nhập!', 'warning');
    return false;
  }
  try {
    const isValid = await verifySignature(publicKeyBase64, message, signature);
    return isValid;
  } catch (error) {
    console.error('Lỗi xác thực:', error);
    return false;
  }
}

async function handleVerify() {
  if (!currentUser) return showNotification('Vui lòng đăng nhập!', 'warning');
  const message = verifyMessageInput.value.trim();
  const signature = signatureInput.value.trim();
  if (!message) return showNotification('Nhập văn bản gốc!', 'warning');
  if (!signature) return showNotification('Nhập chữ ký!', 'warning');

  const publicKey = currentUser.publicKey;
  const isValid = await performVerification(publicKey, message, signature);

  if (isValid) {
    verifyResult.textContent = '✅ CHỮ KÝ HỢP LỆ! (Khóa của bạn)';
    verifyResult.className = 'result valid';
    showNotification('Xác thực thành công!', 'success');
  } else {
    verifyResult.textContent = '❌ CHỮ KÝ KHÔNG HỢP LỆ!';
    verifyResult.className = 'result invalid';
    showNotification('Xác thực thất bại!', 'error');
  }
}

async function handleVerifyWithCustomKey() {
  const message = verifyMessageInput.value.trim();
  const signature = signatureInput.value.trim();
  const customPublicKey = verifyPublicKeyInput.value.trim();
  if (!message) return showNotification('Nhập văn bản gốc!', 'warning');
  if (!signature) return showNotification('Nhập chữ ký!', 'warning');
  if (!customPublicKey) return showNotification('Hãy dán Public Key của người ký!', 'warning');

  const isValid = await performVerification(customPublicKey, message, signature);

  if (isValid) {
    verifyResult.textContent = '✅ CHỮ KÝ HỢP LỆ! (Khóa nhập)';
    verifyResult.className = 'result valid';
    showNotification('Xác thực thành công với khóa nhập!', 'success');
  } else {
    verifyResult.textContent = '❌ CHỮ KÝ KHÔNG HỢP LỆ!';
    verifyResult.className = 'result invalid';
    showNotification('Xác thực thất bại!', 'error');
  }
}

function handleCopySignature() {
  const sig = signatureDisplay.textContent;
  if (sig && sig !== 'Chưa ký') {
    navigator.clipboard.writeText(sig);
    showNotification('Đã sao chép chữ ký!', 'success');
  }
}

signBtn.addEventListener('click', handleSign);
copySignatureBtn.addEventListener('click', handleCopySignature);
verifyBtn.addEventListener('click', handleVerify);
verifyWithCustomKeyBtn.addEventListener('click', handleVerifyWithCustomKey);

// ========== HÀM LOẠI BỎ DẤU TIẾNG VIỆT ==========
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
// ========== HELPER: APPEND CHỮ KÝ ECDSA VÀO CUỐI PDF ==========
async function appendCryptoSignature(pdfBytes, username) {
  try {
    console.log("=== APPEND CRYPTO SIGNATURE ===");
    console.log("PDF gốc size:", pdfBytes.length);

    // Tính hash TRƯỚC khi nhúng bất kỳ thứ gì
    const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const keys = await getOrCreateUserKey(username);
    const signature = await signMessage(keys.privateKey, hashHex);

    const signTime = new Date().toISOString();

    const sigBlock =
      `%%SIG_START%%
      username:${username}
      signTime:${signTime}
      hash:${hashHex}
      signature:${signature}
      %%SIG_END%%`;

    const encoder = new TextEncoder();
    const sigBytes = encoder.encode(sigBlock);

    const finalPdf = new Uint8Array(pdfBytes.length + sigBytes.length);
    finalPdf.set(pdfBytes, 0);
    finalPdf.set(sigBytes, pdfBytes.length);

    console.log("✅ Hash gốc:", hashHex.substring(0, 40) + "...");
    console.log("✅ Append hoàn tất, kích thước mới:", finalPdf.length);
    console.log("Original last 20 bytes:");
    console.log(Array.from(pdfBytes.slice(-20)));
    console.log("Original PDF length:", pdfBytes.length);

    const testHash = await crypto.subtle.digest("SHA-256", pdfBytes);

    console.log(
      "Hash before save:",
      Array.from(new Uint8Array(testHash))
        .map(x => x.toString(16).padStart(2, "0"))
        .join("")
    );
    return finalPdf;
  } catch (err) {
    console.error("❌ Append error:", err);
    return pdfBytes;
  }
}

// 2. Hàm bóc tách chữ ký (ĐÃ CẢI TIẾN)
function extractActualPdfSignature(pdfBytes) {
  console.log("=== BẮT ĐẦU extractActualPdfSignature ===");
  console.log("Tổng kích thước PDF:", pdfBytes.length, "bytes");

  const startTag = "%%SIG_START%%";
  const endTag = "%%SIG_END%%";
  const sigStart = findSignatureStart(pdfBytes);

  if (sigStart === -1) {
    return null;
  }

  const tailStr = new TextDecoder().decode(
    pdfBytes.slice(sigStart)
  );

  // console.log(`Đang quét ${lastBytesCount} byte cuối của file`);

  const startIndex = tailStr.indexOf(startTag);
  const endIndex = tailStr.indexOf(endTag);

  console.log(`Vị trí startTag: ${startIndex}, endTag: ${endIndex}`);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    console.warn("❌ KHÔNG TÌM THẤY BLOCK CHỮ KÝ!");
    console.log("20 ký tự đầu tail:", tailStr.substring(0, 200));
    return null;
  }

  const sigBlock = tailStr.substring(startIndex + startTag.length, endIndex).trim();
  console.log("Raw sigBlock:", JSON.stringify(sigBlock));

  const lines = sigBlock.split(/\r?\n|\r/).map(line => line.trim());

  let username = "";
  let signTime = "";
  let hash = "";
  let signature = "";

  lines.forEach(line => {

    if (line.startsWith("username:"))
      username = line.replace("username:", "").trim();

    else if (line.startsWith("signTime:"))
      signTime = line.replace("signTime:", "").trim();

    else if (line.startsWith("hash:"))
      hash = line.replace("hash:", "").trim();

    else if (line.startsWith("signature:"))
      signature = line.replace("signature:", "").trim();

  });

  console.log("Trích xuất được:");
  console.log("→ username:", username);
  console.log("→ hash:", hash ? hash.substring(0, 40) + "..." : "NULL");
  console.log("→ signature length:", signature ? signature.length : 0);

  console.log("=== KẾT THÚC extractActualPdfSignature ===");

  return (username && hash && signature)
    ? {
      username,
      signTime,
      hash,
      signature
    }
    : null;
}

// 3. Sự kiện nạp file (CHỈ ĐỊNH NGHĨA 1 LẦN)
if (verifyPdfStandardInput) {
  verifyPdfStandardInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) {
      currentStandardPdfBytes = null;
      return;
    }
    try {
      currentStandardPdfBytes = new Uint8Array(await file.arrayBuffer());
      showNotification('Đã nạp file PDF thành công!', 'success');
    } catch (error) {
      showNotification('Lỗi đọc file PDF!', 'error');
    }
  });
}

// 4. Sự kiện nút bấm xác thực (CHỈ ĐỊNH NGHĨA 1 LẦN)
if (verifyPdfStandardBtn) {
  verifyPdfStandardBtn.addEventListener('click', async () => {
    if (!currentStandardPdfBytes) {
      showNotification('Vui lòng chọn file PDF trước!', 'warning');
      return;
    }

    console.log("=== BẮT ĐẦU VERIFY PDF ===");
    showNotification('Đang kiểm tra tính toàn vẹn...', 'info');

    const extracted = extractActualPdfSignature(currentStandardPdfBytes);
    if (!extracted) {
      showNotification('Không tìm thấy chữ ký số!', 'error');
      return;
    }

    const {
      username,
      signTime,
      hash: originalHash,
      signature
    } = extracted;
    const displayName = ACCOUNTS[username]?.displayName || username;
    try {
      // Tìm vị trí bắt đầu của block signature
      const startTag = "%%SIG_START%%";
      const sigStart = findSignatureStart(currentStandardPdfBytes);

      if (sigStart === -1) {
        throw new Error("Không tìm thấy Signature Block");
      }

      let contentEnd = sigStart;

      // Nếu ngay trước Signature là ký tự xuống dòng thì bỏ nó
      if (
        contentEnd > 0 &&
        (
          currentStandardPdfBytes[contentEnd - 1] === 10 || // LF
          currentStandardPdfBytes[contentEnd - 1] === 13    // CR
        )
      ) {
        contentEnd--;
      }

      const pdfContentOnly =
        currentStandardPdfBytes.slice(0, contentEnd);
      console.log("sigStart =", sigStart);
      console.log("Byte trước Signature =", currentStandardPdfBytes[sigStart - 1]);

      console.log("Recovered last 20 bytes:");
      console.log(Array.from(pdfContentOnly.slice(-20)));

      // Tính hash lại
      console.log(
        "Recovered PDF length:",
        pdfContentOnly.length
      );
      const hashBuffer = await crypto.subtle.digest('SHA-256', pdfContentOnly);
      const currentHashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      console.log("Hash gốc (khi ký) :", originalHash.substring(0, 40) + "...");
      console.log("Hash tính lại     :", currentHashHex.substring(0, 40) + "...");
      console.log("Hash khớp?", currentHashHex === originalHash);

      // Verify chữ ký
      const stored = localStorage.getItem('user_keys_' + username);
      if (!stored) throw new Error("Không tìm thấy public key");

      const { publicKey } = JSON.parse(stored);
      const isSigValid = await verifySignature(publicKey, originalHash, signature);

      if (currentHashHex === originalHash && isSigValid) {
        const signAlgorithm = "ECDSA + SHA-256";
        const signDate = signTime
          ? new Date(signTime).toLocaleString("vi-VN")
          : "Không xác định";

        pdfStandardVerifyResult.innerHTML = `
          <div style="color:green; line-height:1.8;">
              <div style="font-size:18px;font-weight:bold;">
                  ✅ FILE NGUYÊN VẸN
              </div>

              <div><b>Người ký:</b> ${displayName}</div>

              <div><b>Thời gian ký:</b> ${signDate}</div>

              <div><b>Thuật toán ký:</b> ${signAlgorithm}</div>

              <div><b>Trạng thái:</b> Chữ ký hợp lệ</div>
          </div>
          `;
        showNotification('✅ File chưa bị chỉnh sửa!', 'success');
      } else {
        pdfStandardVerifyResult.innerHTML = `<div style="color:red;font-weight:bold;">❌ FILE ĐÃ BỊ CHỈNH SỬA</div>`;
        showNotification('File đã bị thay đổi!', 'error');
      }
    } catch (err) {
      console.error("Lỗi verify:", err);
      showNotification('Lỗi verify: ' + err.message, 'error');
    }

    console.log("=== KẾT THÚC VERIFY ===");
  });
}

function findSignatureStart(pdfBytes) {
  const marker = new TextEncoder().encode("%%SIG_START%%");

  for (let i = 0; i <= pdfBytes.length - marker.length; i++) {

    let found = true;

    for (let j = 0; j < marker.length; j++) {

      if (pdfBytes[i + j] !== marker[j]) {
        found = false;
        break;
      }

    }

    if (found) return i;
  }

  return -1;
}
// Xóa hoặc comment bỏ đoạn "if (pdfStandardBtn)" nếu nó gây trùng lặp với nút trên.

// ========== TẠO PDF MẪU CÓ CHỮ KÝ GIẢ (SỬ DỤNG METADATA) ==========
if (createSamplePdfBtn) {
  createSamplePdfBtn.addEventListener('click', async () => {
    try {
      const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([400, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      // Vẽ nội dung thông thường
      page.drawText('Sample Signed PDF (Mock)', {
        x: 50,
        y: 350,
        size: 18,
        font: font,
        color: rgb(0, 0, 0),
      });
      page.drawText('This PDF contains metadata with signature keywords.', {
        x: 50,
        y: 300,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      // Đặt metadata chứa từ khóa
      pdfDoc.setTitle('Sample PDF with /Sig /ByteRange adbe.pkcs7');
      pdfDoc.setAuthor('/Sig /ByteRange adbe.pkcs7');
      pdfDoc.setSubject('/Sig /ByteRange adbe.pkcs7');
      pdfDoc.setKeywords(['/Sig', '/ByteRange', 'adbe.pkcs7']);
      // Cũng vẽ thêm text để chắc chắn (nhưng sẽ bị nén, metadata là chính)
      page.drawText('Metadata contains: /Sig /ByteRange adbe.pkcs7', {
        x: 50,
        y: 250,
        size: 12,
        font: font,
        color: rgb(0.5, 0, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_signed_mock.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('✅ Đã tạo file PDF mẫu thành công!', 'success');
    } catch (err) {
      console.error('Lỗi tạo PDF mẫu:', err);
      showNotification('❌ Lỗi tạo PDF: ' + err.message, 'error');
    }
  });
}

// ========== PHẦN KÝ PDF (VẼ TAY, TẢI ẢNH, KÉO THẢ, KÝ CHỮ) ==========
// Canvas vẽ chữ ký (nền trong suốt)
const ctxSig = signatureCanvas.getContext('2d');
signatureCanvas.width = 300;
signatureCanvas.height = 150;
ctxSig.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
ctxSig.strokeStyle = '#000';
ctxSig.lineWidth = 2;
ctxSig.lineCap = 'round';

let drawing = false;
let lastX = 0, lastY = 0;

function startDrawing(e) {
  drawing = true;
  const rect = signatureCanvas.getBoundingClientRect();
  const scaleX = signatureCanvas.width / rect.width;
  const scaleY = signatureCanvas.height / rect.height;
  lastX = (e.clientX - rect.left) * scaleX;
  lastY = (e.clientY - rect.top) * scaleY;
  ctxSig.beginPath();
  ctxSig.moveTo(lastX, lastY);
  ctxSig.lineTo(lastX, lastY);
  ctxSig.stroke();
}
function draw(e) {
  if (!drawing) return;
  const rect = signatureCanvas.getBoundingClientRect();
  const scaleX = signatureCanvas.width / rect.width;
  const scaleY = signatureCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  ctxSig.lineTo(x, y);
  ctxSig.stroke();
  ctxSig.beginPath();
  ctxSig.moveTo(x, y);
}
function stopDrawing() { drawing = false; }
signatureCanvas.addEventListener('mousedown', startDrawing);
signatureCanvas.addEventListener('mousemove', draw);
signatureCanvas.addEventListener('mouseup', stopDrawing);

clearSignatureBtn.addEventListener('click', () => {
  ctxSig.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  showNotification('Đã xóa chữ ký', 'info');
});

// Tải ảnh PNG
uploadSignatureInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'image/png') {
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedSignatureBase64 = event.target.result.split(',')[1];
      previewSignatureImg.src = event.target.result;
      previewSignatureImg.style.display = 'block';
      showNotification('Đã tải ảnh chữ ký', 'success');
    };
    reader.readAsDataURL(file);
  } else {
    showNotification('Vui lòng chọn file PNG hợp lệ!', 'warning');
    uploadSignatureInput.value = '';
    uploadedSignatureBase64 = null;
    previewSignatureImg.style.display = 'none';
  }
});


// Sự kiện tải ảnh dấu mộc (PNG)
if (uploadStampInput) {
  uploadStampInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedStampBase64 = event.target.result.split(',')[1];
        previewStampImg.src = event.target.result;
        previewStampImg.style.display = 'block';
        showNotification('Đã tải ảnh dấu mộc thành công!', 'success');
      };
      reader.readAsDataURL(file);
    } else {
      showNotification('Vui lòng chọn file dấu mộc dạng PNG hợp lệ!', 'warning');
      uploadStampInput.value = '';
      uploadedStampBase64 = null;
      previewStampImg.style.display = 'none';
    }
  });
}

// Cập nhật trạng thái nút
function updateButtons() {
  const hasPosition = selectedPosition !== null;
  confirmSignBtn.disabled = !hasPosition || !currentPdfBuffer || !currentUser;
  signTextBtn.disabled = !hasPosition || !currentPdfBuffer || !currentUser;
}

// Tải PDF
pdfSignInput.addEventListener('change', async (e) => {
  if (!currentUser) return showNotification('Vui lòng đăng nhập!', 'warning');
  const file = e.target.files[0];
  if (!file || file.type !== 'application/pdf') {
    pdfSignStatus.innerHTML = '<span style="color:red;">❌ Vui lòng chọn file PDF hợp lệ.</span>';
    return;
  }
  const arrayBuffer = await file.arrayBuffer();
  currentPdfBuffer = arrayBuffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  pdfDoc = await loadingTask.promise;
  totalPages = pdfDoc.numPages;
  currentPage = 1;
  renderPage(currentPage);
  pdfSignStatus.innerHTML = `<span style="color:green;">✅ Đã tải: ${file.name} (${totalPages} trang)</span>`;
  prevPageBtn.disabled = false;
  nextPageBtn.disabled = false;
  selectedPosition = null;
  selectedPositionSpan.textContent = 'Chưa chọn (click hoặc kéo thả ảnh lên PDF)';
  updateButtons();
});

async function renderPage(pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: scale });
  const canvas = pdfPreviewCanvas;
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  const renderContext = { canvasContext: context, viewport };
  await page.render(renderContext).promise;
  pageNumDisplay.textContent = `Trang ${pageNum} / ${totalPages}`;
}

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
    selectedPosition = null;
    selectedPositionSpan.textContent = 'Chưa chọn (click hoặc kéo thả ảnh lên PDF)';
    updateButtons();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderPage(currentPage);
    selectedPosition = null;
    selectedPositionSpan.textContent = 'Chưa chọn (click hoặc kéo thả ảnh lên PDF)';
    updateButtons();
  }
});

// Click chọn vị trí trên canvas PDF
pdfPreviewCanvas.addEventListener('click', async (e) => {
  if (!pdfDoc || !currentUser) return;
  const rect = pdfPreviewCanvas.getBoundingClientRect();
  const scaleX = pdfPreviewCanvas.width / rect.width;
  const scaleY = pdfPreviewCanvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;
  const page = await pdfDoc.getPage(currentPage);
  const viewport = page.getViewport({ scale: scale });
  const pdfX = canvasX / scale;
  const pdfY = (viewport.height - canvasY) / scale;
  selectedPosition = { x: pdfX, y: pdfY, page: currentPage };
  selectedPositionSpan.textContent = `X: ${pdfX.toFixed(2)}, Y: ${pdfY.toFixed(2)}, Trang ${currentPage}`;
  showNotification(`Đã chọn vị trí (${pdfX.toFixed(0)}, ${pdfY.toFixed(0)})`, 'success');
  console.log(`Vị trí: x=${pdfX}, y=${pdfY}, trang=${currentPage}`);
  updateButtons();
});

// Kéo thả ảnh lên canvas
if (pdfPreviewCanvas) {
  pdfPreviewCanvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  pdfPreviewCanvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!pdfDoc || !currentUser) {
      showNotification('Hãy đăng nhập và tải PDF trước!', 'warning');
      return;
    }
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      showNotification('Chỉ hỗ trợ kéo thả file ảnh (PNG, JPG)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(',')[1];
      const rect = pdfPreviewCanvas.getBoundingClientRect();
      const scaleX = pdfPreviewCanvas.width / rect.width;
      const scaleY = pdfPreviewCanvas.height / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: scale });
      const pdfX = canvasX / scale;
      const pdfY = (viewport.height - canvasY) / scale;
      selectedPosition = { x: pdfX, y: pdfY, page: currentPage };
      selectedPositionSpan.textContent = `X: ${pdfX.toFixed(2)}, Y: ${pdfY.toFixed(2)}, Trang ${currentPage} (kéo thả)`;
      droppedSignatureBase64 = base64Data;
      showNotification(`Đã thả ảnh. Nhấn "Đặt chữ ký" để nhúng.`, 'success');
      updateButtons();
    };
    reader.readAsDataURL(file);
  });
}

// Hàm nhúng ảnh chữ ký (nền trong suốt)
async function embedSignatureIntoPDF(pdfBuffer, signatureImageBase64, position) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const page = pdfDoc.getPages()[position.page - 1];
  const { height: pageHeight } = page.getSize();

  // 1. Nhúng ảnh chữ ký cá nhân
  const binaryString = atob(signatureImageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const pngImage = await pdfDoc.embedPng(bytes);

  const desiredWidth = 150;
  const scaleFactor = desiredWidth / pngImage.width;
  const scaledWidth = pngImage.width * scaleFactor;
  const scaledHeight = pngImage.height * scaleFactor;

  let finalY = position.y;
  if (finalY > pageHeight) finalY = pageHeight - 50;
  if (finalY - scaledHeight < 0) finalY = scaledHeight + 10;

  page.drawImage(pngImage, {
    x: position.x,
    y: finalY - scaledHeight,
    width: scaledWidth,
    height: scaledHeight,
  });

  // 2. NHÚNG ẢNH DẤU MỘC (Nếu có)
  // NHÚNG DẤU MỘC - CHỈ ADMIN
  const shouldUseStamp = currentUser && currentUser.username === 'admin' && (uploadedStampBase64 || defaultStampBase64);
  if (shouldUseStamp) {
    try {
      const stampToUse = uploadedStampBase64 || defaultStampBase64;
      const stampBinary = atob(stampToUse);
      const stampBytes = new Uint8Array(stampBinary.length);
      for (let i = 0; i < stampBinary.length; i++) stampBytes[i] = stampBinary.charCodeAt(i);

      const stampImage = await pdfDoc.embedPng(stampBytes);
      const desiredStampWidth = 130;
      const stampScale = desiredStampWidth / stampImage.width;

      const stampX = position.x - 50;
      const stampY = finalY - 40;

      page.drawImage(stampImage, {
        x: Math.max(10, stampX),
        y: Math.max(10, stampY),
        width: stampImage.width * stampScale,
        height: stampImage.height * stampScale,
      });
      console.log("✅ Admin - Đã nhúng dấu mộc đỏ");
    } catch (e) {
      console.error("Lỗi nhúng mộc:", e);
    }
  }

  let signedBytes = await pdfDoc.save();

  // === APPEND CHỮ KÝ THẬT ===
  signedBytes = await appendCryptoSignature(signedBytes, currentUser.username);

  return signedBytes;
}

// Hàm nhúng văn bản 2 dòng (đã sửa lỗi font)
async function embedTextIntoPDF(pdfBuffer, username, timestamp, position) {
  // --- THÊM LOG KIỂM TRA BIẾN TOÀN CỤC KHI BẮT ĐẦU VÀO HÀM ---
  console.log("=== [DEBUG LOG] BẮT ĐẦU HÀM EMBEDTEXTINTOPDF ===");
  console.log("Giá trị biến uploadedStampBase64 hiện tại:", uploadedStampBase64 ? "CÓ TỒN TẠI (Đang giữ dữ liệu ảnh)" : "TRỐNG / NULL");
  if (uploadedStampBase64) {
    console.log("Độ dài chuỗi mộc đỏ mang vào hàm:", uploadedStampBase64.length);
  }

  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const page = pdfDoc.getPages()[position.page - 1];
  const { height: pageHeight } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;

  // Chuẩn bị 2 dòng (loại bỏ dấu)
  const text1 = `Da duoc ky boi: ${username}`;
  const text2 = `Vao luc: ${timestamp}`;
  const safeText1 = removeVietnameseTones(text1);
  const safeText2 = removeVietnameseTones(text2);

  // Điều chỉnh tọa độ y
  let y = position.y;
  if (y > pageHeight) y = pageHeight - 20;
  if (y - lineHeight < 0) y = lineHeight + 10;

  // Vẽ dòng thứ hai (thời gian) ở dưới
  page.drawText(safeText2, {
    x: position.x,
    y: y,
    size: fontSize,
    font: font,
    color: rgb(1, 0, 0),
  });
  // Vẽ dòng thứ nhất (người ký) ở trên (cách 1 dòng)
  page.drawText(safeText1, {
    x: position.x,
    y: y + lineHeight,
    size: fontSize,
    font: font,
    color: rgb(1, 0, 0),
  });

  // --- THÊM LOGIC NHÚNG MỘC ĐỎ DỰA TRÊN FORMAT CỦA BẠN ---
  // Trong embedTextIntoPDF và embedSignatureIntoPDF, thay phần nhúng mộc cũ bằng:
  const stampToUse = uploadedStampBase64 || defaultStampBase64;

  // NHÚNG DẤU MỘC - CHỈ ADMIN
  const shouldUseStamp = currentUser && currentUser.username === 'admin' && (uploadedStampBase64 || defaultStampBase64);
  if (shouldUseStamp) {
    try {
      const stampToUse = uploadedStampBase64 || defaultStampBase64;
      const stampBinary = atob(stampToUse);
      const stampBytes = new Uint8Array(stampBinary.length);
      for (let i = 0; i < stampBinary.length; i++) stampBytes[i] = stampBinary.charCodeAt(i);

      const stampImage = await pdfDoc.embedPng(stampBytes);
      const desiredStampWidth = 120;
      const stampScale = desiredStampWidth / stampImage.width;

      const stampX = position.x - 45;
      const stampY = y - 45;

      page.drawImage(stampImage, {
        x: Math.max(10, stampX),
        y: Math.max(10, stampY),
        width: stampImage.width * stampScale,
        height: stampImage.height * stampScale,
      });
      console.log("✅ Admin - Đã nhúng dấu mộc đỏ vào chữ ký văn bản");
    } catch (e) {
      console.error("Lỗi nhúng mộc:", e);
    }
  } else {
    console.warn("⚠️ THÔNG BÁO: Bỏ qua nhúng mộc vì không có ảnh nào được tải lên (uploadedStampBase64 rỗng).");
  }

  let signedBytes = await pdfDoc.save();

  // === APPEND CHỮ KÝ THẬT ===
  signedBytes = await appendCryptoSignature(signedBytes, currentUser.username);

  return signedBytes;
}

// ========== HÀM KÝ ĐẦY ĐỦ: ẢNH + TEXT + MỘC (CẢI TIẾN THEO MẪU) ==========
async function embedFullSignature(pdfBuffer, signatureImageBase64, position) {
  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const page = pdfDoc.getPages()[position.page - 1];
  const { height: pageHeight } = page.getSize();

  const baseX = position.x;
  const baseY = position.y;

  // ====================== ĐIỀU CHỈNH VỊ TRÍ TẠI ĐÂY ======================
  const stampWidth = 100;      // Kích thước dấu mộc
  const sigWidth = 80;      // Kích thước chữ ký ảnh
  const textFontSize = 11.5;

  // 1. Nhúng DẤU MỘC ĐỎ (Bên trái)
  const shouldUseStamp = currentUser && currentUser.username === 'admin' && (uploadedStampBase64 || defaultStampBase64);
  if (shouldUseStamp) {
    try {
      const stampToUse = uploadedStampBase64 || defaultStampBase64;
      const stampBinary = atob(stampToUse);
      const stampBytes = new Uint8Array(stampBinary.length);
      for (let i = 0; i < stampBinary.length; i++) stampBytes[i] = stampBinary.charCodeAt(i);

      const stampImage = await pdfDoc.embedPng(stampBytes);
      const scale = stampWidth / stampImage.width;

      const stampX = baseX - 20;           // Dấu mộc nằm bên trái
      const stampY = baseY - 10;

      page.drawImage(stampImage, {
        x: Math.max(15, stampX),
        y: Math.max(20, stampY),
        width: stampImage.width * scale,
        height: stampImage.height * scale,
      });
      console.log("✅ Đã nhúng dấu mộc đỏ");
    } catch (e) {
      console.error("Lỗi nhúng mộc:", e);
    }
  }

  // 2. Nhúng ẢNH CHỮ KÝ (Bên phải dấu mộc)
  let signatureBottomY = baseY;
  if (signatureImageBase64) {
    const binaryString = atob(signatureImageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const pngImage = await pdfDoc.embedPng(bytes);
    const scaleFactor = sigWidth / pngImage.width;
    const sigHeight = pngImage.height * scaleFactor;

    const sigX = baseX + 30;                    // ← Đẩy chữ ký sang phải dấu mộc
    const sigY = baseY - sigHeight / 2 + 30;    // Căn giữa chiều dọc với dấu mộc

    page.drawImage(pngImage, {
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
    });

    signatureBottomY = sigY;
    console.log("✅ Đã nhúng chữ ký ảnh");
  }

  // 3. Nhúng TEXT (Ngay dưới chữ ký)
  let customText = signatureTextInput.value.trim() || currentUser.displayName;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const lineHeight = textFontSize * 1.7;

  const text1 = `Ký bởi: ${customText}`;
  // const text2 = `Vào lúc: ${new Date().toLocaleString('vi-VN')}`;

  const safeText1 = removeVietnameseTones(text1);
  // const safeText2 = removeVietnameseTones(text2);

  const textX = baseX + 95;   // Căn lề với chữ ký ảnh

  page.drawText(safeText1, {
    x: textX,
    y: signatureBottomY + 30,                    // Dòng "Ký bởi"
    size: textFontSize,
    font: font,
    color: rgb(1, 0, 0),
  });
  // page.drawText(safeText2, {
  //   x: textX,
  //   y: signatureBottomY + 10,                    // Dòng "Ký bởi"
  //   size: textFontSize,
  //   font: font,
  //   color: rgb(1, 0, 0),
  // });

  // Lưu PDF
  let signedBytes = await pdfDoc.save();
  signedBytes = await appendCryptoSignature(signedBytes, currentUser.username);

  return signedBytes;
}

// Sự kiện nút "Đặt chữ ký" (ưu tiên ảnh kéo thả, sau đó ảnh tải lên, cuối cùng vẽ tay)
// Sự kiện nút "Đặt chữ ký (ảnh)" → Giờ sẽ ký cả ảnh + text
// Sự kiện nút "Đặt chữ ký (ảnh)" - Ưu tiên upload > mặc định
confirmSignBtn.addEventListener('click', async () => {
  if (!currentUser) return showNotification('Vui lòng đăng nhập!', 'warning');
  if (!currentPdfBuffer || !selectedPosition) {
    showNotification('Hãy tải PDF và chọn vị trí!', 'warning');
    return;
  }

  let base64Data = null;

  // Ưu tiên: Kéo thả → Upload → Mặc định theo username
  if (droppedSignatureBase64) {
    base64Data = droppedSignatureBase64;
    droppedSignatureBase64 = null;
    showNotification('Sử dụng ảnh vừa kéo thả', 'info');
  } else if (uploadedSignatureBase64) {
    base64Data = uploadedSignatureBase64;
    showNotification('Sử dụng ảnh chữ ký đã upload', 'info');
  } else if (defaultSignatureBase64) {
    base64Data = defaultSignatureBase64;
    showNotification(`Sử dụng chữ ký mặc định của ${currentUser.username}`, 'info');
  } else {
    // Fallback nếu không có gì
    let sigDataURL = signatureCanvas.toDataURL('image/png');
    base64Data = sigDataURL.split(',')[1];
    showNotification('Sử dụng chữ ký vẽ tay mặc định', 'warning');
  }

  if (!base64Data) {
    showNotification('Không tìm thấy chữ ký!', 'error');
    return;
  }

  try {
    showNotification('Đang nhúng chữ ký ảnh + text + mộc...', 'info');

    const signedBytes = await embedFullSignature(currentPdfBuffer, base64Data, selectedPosition);

    const blob = new Blob([signedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signed_full_${currentUser.username}_page${selectedPosition.page}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('✅ Ký thành công (Ảnh + Text + Mộc)', 'success');
  } catch (err) {
    console.error(err);
    showNotification('Lỗi khi ký: ' + err.message, 'error');
  }
});

// Sự kiện nút "Ký dạng chữ" (2 dòng)
// Sự kiện nút "Ký dạng chữ" (2 dòng) - Đã hoàn thiện cấu trúc
signTextBtn.addEventListener('click', async () => {
  if (!currentUser) return showNotification('Vui lòng đăng nhập!', 'warning');
  if (!currentPdfBuffer || !selectedPosition) {
    showNotification('Hãy tải PDF và chọn vị trí!', 'warning');
    return;
  }
  let customText = signatureTextInput.value.trim();
  let username = currentUser.displayName;
  let timestamp = new Date().toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  if (customText) {
    username = customText;
  }

  try {
    showNotification('Đang nhúng chữ ký văn bản (2 dòng)...', 'info');
    const signedBytes = await embedTextIntoPDF(currentPdfBuffer, username, timestamp, selectedPosition);
    const blob = new Blob([signedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signed_text_page${selectedPosition.page}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Đã ký dạng chữ (2 dòng) thành công!', 'success');
    pdfSignStatus.innerHTML += `<br/>✅ Đã ký dạng chữ: "${username}" vào ${timestamp}`;
  } catch (err) {
    console.error(err);
    showNotification('Lỗi: ' + err.message, 'error');
  }
});

// ========== KHỞI TẠO ==========
// Disable các chức năng cho đến khi đăng nhập
signBtn.disabled = true;
verifyBtn.disabled = true;
verifyWithCustomKeyBtn.disabled = true;
pdfSignInput.disabled = true;
uploadSignatureInput.disabled = true;
signatureTextInput.disabled = true;
verifyPdfStandardInput.disabled = true;
verifyPdfStandardBtn.disabled = true;
confirmSignBtn.disabled = true;
signTextBtn.disabled = true;
prevPageBtn.disabled = true;
nextPageBtn.disabled = true;
// Thêm dòng này vào cụm Khởi tạo ban đầu dưới cùng file:
if (uploadStampInput) uploadStampInput.disabled = true;