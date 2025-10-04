import QRCode from "qrcode";

export const renderQrPng = async (text: string) => {
  return QRCode.toBuffer(text, {
    type: "png",
    width: 256,
    margin: 4
  });
};
