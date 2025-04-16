"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import axios from "axios";

const OTPVerification = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
  
    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }
  
    if (!email) {
      setError("Email is missing. Please log in again.");
      return;
    }
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`,
        { email, otp }
      );
    
      if (response.status === 200) {
        // const { otp } = response.data; 
        // console.log("Received OTP:", otp); 
    
        // setSuccess("Login successful! Redirecting to OTP verification...");
        // sessionStorage.setItem("authEmail", email); 
        // router.push("/otp?mail=${email}");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error("Login error:", err);
    }
    
    // try {
    //   const response = await axios.post(
    //     `${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`,
    //     {
    //       email,
    //       otp,
    //     }
    //   );
    //   if (response.status === 200) {
    //     setSuccess("OTP verified! Redirecting to dashboard...");
    //     router.push("/dashboard"); 
    //   }
    // } catch (err) {
    //   if (axios.isAxiosError(err)) {
    //     setError(err.response?.data?.message || "OTP verification failed.");
    //   } else {
    //     setError("An unexpected error occurred. Please try again.");
    //   }
    //   console.error("OTP error:", err);
    // }
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
          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="text-center text-sm text-green-600">{success}</p>
          )}
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