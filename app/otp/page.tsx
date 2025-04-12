"use client";

import React, { useState } from "react";
import Image from "next/image";

const OTPVerification = () => {
  const [otp, setOtp] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("OTP:", otp);
   
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo_white.svg"
            alt="Kiotapay Logo"
            width={120}
            height={40}
            priority
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-center text-sm text-gray-600 mb-6">
            Please enter the OTP sent to your email!
          </p>

          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              OTP Code
            </label>
            <input
              id="otp"
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005555] transition-all duration-200 text-gray-900 placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#005555] text-white rounded-md hover:bg-[#004444] transition-colors text-sm font-medium"
          >
            Verify OTP
          </button>
        </form>
      </div>
    </div>
  );
};

export default OTPVerification;
