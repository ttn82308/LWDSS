// Chuyển đổi ArrayBuffer thành Base64
export function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Chuyển đổi Base64 thành ArrayBuffer
export function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Tạo cặp khóa ECDSA (Sử dụng đường cong P-384)
export async function generateKeyPair() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-384"
            },
            true,
            ["sign", "verify"]
        );
        const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
        const publicKeyBase64 = btoa(JSON.stringify(publicKey));
        const privateKeyBase64 = btoa(JSON.stringify(privateKey));
        return { publicKey: publicKeyBase64, privateKey: privateKeyBase64 };
    } catch (error) {
        console.error("Lỗi tạo khóa:", error);
        throw error;
    }
}

// Nhập khóa từ định dạng Base64
export async function importKey(keyBase64, keyType) {
    try {
        const keyJson = JSON.parse(atob(keyBase64));
        const keyAlgorithm = {
            name: "ECDSA",
            namedCurve: "P-384"
        };
        if (keyType === 'public') {
            return await window.crypto.subtle.importKey(
                "jwk",
                keyJson,
                keyAlgorithm,
                true,
                ["verify"]
            );
        } else {
            return await window.crypto.subtle.importKey(
                "jwk",
                keyJson,
                keyAlgorithm,
                true,
                ["sign"]
            );
        }
    } catch (error) {
        console.error("Lỗi nhập khóa:", error);
        throw error;
    }
}

// Ký số trên văn bản
export async function signMessage(privateKeyBase64, message) {
    try {
        const privateKey = await importKey(privateKeyBase64, 'private');
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const signature = await window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-384" }
            },
            privateKey,
            data
        );
        return arrayBufferToBase64(signature);
    } catch (error) {
        console.error("Lỗi ký số:", error);
        throw error;
    }
}

// Xác thực chữ ký
export async function verifySignature(publicKeyBase64, message, signatureBase64) {
    try {
        const publicKey = await importKey(publicKeyBase64, 'public');
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const signature = base64ToArrayBuffer(signatureBase64);
        const isValid = await window.crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: { name: "SHA-384" }
            },
            publicKey,
            signature,
            data
        );
        return isValid;
    } catch (error) {
        console.error("Lỗi xác thực:", error);
        return false;
    }
}

// Lưu key pair vào localStorage
export function saveKeyPair(publicKey, privateKey) {
    localStorage.setItem('publicKey', publicKey);
    localStorage.setItem('privateKey', privateKey);
}

// Đọc key pair từ localStorage
export function loadKeyPair() {
    const publicKey = localStorage.getItem('publicKey');
    const privateKey = localStorage.getItem('privateKey');
    return { publicKey, privateKey };
}

// Xóa key pair
export function clearKeyPair() {
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
}