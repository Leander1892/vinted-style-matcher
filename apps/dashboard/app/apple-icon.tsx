import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 500,
            color: "#ffffff",
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size }
  );
}
