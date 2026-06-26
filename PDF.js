// 1. Khi người dùng chọn file
const fileInput = document.getElementById('pdfInput');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    // Lưu buffer này để dùng sau
    currentPdfBuffer = arrayBuffer.slice(0);
    // Render trang đầu tiên
    await renderPdfPage(currentPdfBuffer, 1);
});

// 2. Hàm render trang PDF lên canvas
async function renderPdfPage(pdfBuffer, pageNumber) {
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.getElementById('pdfPreviewCanvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
}
// 3. Lắng nghe sự kiện click trên canvas
pdfCanvas.addEventListener('click', (e) => {
    const rect = pdfCanvas.getBoundingClientRect();
    const scaleX = pdfCanvas.width / rect.width;
    const scaleY = pdfCanvas.height / rect.height;
    // Tọa độ pixel trên canvas
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    // Chuyển sang tọa độ PDF (bottom-left)
    const pdfX = canvasX;
    const pdfY = pdfCanvas.height - canvasY;
    // Lưu lại tọa độ và số trang hiện tại (currentPageNumber)
    console.log(`Đã chọn vị trí: X=${pdfX}, Y=${pdfY}, Trang=${currentPageNumber}`);
});
async function embedSignature(pdfBuffer, signatureImageBase64, x, y, pageIndex) {
    // Tải PDF gốc
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
    const page = pdfDoc.getPages()[pageIndex];
    // Chuyển đổi ảnh chữ ký (base64) sang PNG để pdf-lib có thể đọc
    const pngImage = await pdfDoc.embedPng(signatureImageBase64);
    const { width, height } = pngImage.scale(0.5);
    // Vẽ ảnh lên trang PDF
    page.drawImage(pngImage, { x, y: y - height, width, height });
    // Lưu file PDF mới
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}