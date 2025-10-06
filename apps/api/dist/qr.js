import QRCode from "qrcode";
export const renderQrPng = async (text) => {
    return QRCode.toBuffer(text, {
        type: "png",
        width: 256,
        margin: 4
    });
};
//# sourceMappingURL=qr.js.map