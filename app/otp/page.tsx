"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kiotachat-backend-1.onrender.com";

const OTPContent: React.FC = () => {
  const [otp, setOtp] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otp.trim() || !/^\d{6}$/.test(otp)) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    if (!email) {
      toast.error("Email is missing. Please log in again.");
      router.push("/login");
      return;
    }

    try {
      console.log("Sending OTP verification to:", `${BACKEND_URL}/verify-otp`, {
        email,
        otp,
      });
      const response = await axios.post(
        `${BACKEND_URL}/verify-otp`,
        { email, otp },
        {
          withCredentials: true,
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        }
      );
      console.log("OTP verification response:", {
        data: response.data,
        headers: response.headers,
        status: response.status,
      });

      toast.success("OTP verified successfully! Redirecting...");
      localStorage.setItem("fullName", response.data.fullName || email);

      // Normalize role to uppercase to avoid case-sensitivity issues
      const role = response.data.role?.toUpperCase();
      if (role === "ADMIN") {
        console.log("Redirecting to /adminchatbox", { userId: response.data.userId, role });
        router.push("/adminchatbox");
      } else if (role === "USER") {
        console.log("Redirecting to /userchatbox", { userId: response.data.userId, role });
        router.push("/userchatbox");
      } else {
        console.error("Invalid role received:", role);
        toast.error("Invalid role received. Please contact support.");
        router.push("/login");
      }
    } catch (err: unknown) {
      const error = axios.isAxiosError(err)
        ? {
            message: err.response?.data?.message || "OTP verification failed.",
            status: err.response?.status,
            headers: err.response?.headers,
            data: err.response?.data,
          }
        : { message: "An unexpected error occurred. Please try again." };
      console.error("OTP verification error:", error);
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Toaster position="top-right" />
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
            Please enter the OTP sent to your email address.
          </p>

          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              maxLength={6}
              inputMode="numeric"
              pattern="\d{6}"
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#005555] text-white rounded-md hover:bg-[#004444] transition-colors text-sm font-semibold"
            title="Verify OTP"
          >
            Verify OTP
          </button>
        </form>
      </div>
    </div>
  );
};

const OTPVerification: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          Loading OTP verification...
        </div>
      }
    >
      <OTPContent />
    </Suspense>
  );
};

export default OTPVerification;