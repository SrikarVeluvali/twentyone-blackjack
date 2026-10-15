import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        background: '#142d26',
        color: '#ddc18b',
        fontSize: 38,
        fontWeight: 700,
        border: '3px solid #ddc18b',
      }}
    >
      21
    </div>,
    size,
  );
}
