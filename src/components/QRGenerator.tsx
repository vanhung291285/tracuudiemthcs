/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface QRGeneratorProps {
  value: string;
  size?: number;
}

export default function QRGenerator({ value, size = 120 }: QRGeneratorProps) {
  // Use a well-known, fast, and secure QR generation service (QR Server)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=0055a5&bgcolor=ffffff&qzone=1`;

  return (
    <div className="flex flex-col items-center justify-center bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Real Dynamic QR Code from a lightweight educational-safe proxy */}
        <img
          src={qrUrl}
          alt="Mã QR Xác Thực"
          className="w-full h-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Offline fallback: render a beautiful, complex vector verification seal
            e.currentTarget.style.display = "none";
            const fallbackElem = document.getElementById("qr-offline-fallback");
            if (fallbackElem) {
              fallbackElem.classList.remove("hidden");
            }
          }}
        />

        {/* Beautiful fallback graphic in case of no internet */}
        <div
          id="qr-offline-fallback"
          className="hidden w-full h-full absolute inset-0 bg-slate-50 flex flex-col items-center justify-center border border-dashed border-primary/30 rounded"
          style={{ width: size, height: size }}
        >
          <svg className="w-10 h-10 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-[9px] font-semibold text-blue-800 text-center uppercase tracking-wide mt-1 px-1">
            Chữ Ký Số
          </span>
          <span className="text-[7px] text-gray-500 font-mono mt-0.5">
            {value.substring(7, 18)}...
          </span>
        </div>
      </div>
      
      <div className="text-[10px] text-slate-500 mt-1.5 font-semibold text-center uppercase tracking-wider">
        Mã xác thực số
      </div>
      <div className="text-[8px] font-mono text-blue-800 mt-0.5 select-all">
        {value}
      </div>
    </div>
  );
}
