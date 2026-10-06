import { QRCodeSVG } from "qrcode.react";

export default function QrCodePage() {
  const premioUrl = `${window.location.origin}/premio`;

  return (
    <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 style={{ fontSize: 32 }}>🎁 Resgate seu prêmio!</h1>
        <p className="lead" style={{ marginBottom: 20 }}>Aponte a câmera do celular para o QR Code abaixo.</p>
        <div style={{ display: "inline-block", padding: 16, background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-md)" }}>
          <QRCodeSVG value={premioUrl} size={260} fgColor="#0A0A0A" bgColor="#ffffff" level="M" />
        </div>
        <p className="note-small" style={{ marginTop: 16, wordBreak: "break-all" }}>{premioUrl}</p>
      </div>
    </div>
  );
}
