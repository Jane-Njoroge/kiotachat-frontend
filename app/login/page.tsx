"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import axios, { AxiosError } from "axios";
import { Toaster, toast } from "react-hot-toast";

config.autoAddCss = false;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kiotachat-backend-1.onrender.com";

interface LoginResponse {
  message: string;
}

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please enter your email and password.");
      toast.error("Please enter your email and password.");
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format.");
      toast.error("Invalid email format.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Sending request to:", `${BACKEND_URL}/login`);
      const response = await axios.post<LoginResponse>(
        `${BACKEND_URL}/login`,
        { email, password },
        {
          withCredentials: true,
          //increase timeout due to cold start(render free tier)
          timeout: 90000,  
          headers: { "Content-Type": "application/json" },
        }
      );

      setSuccess(response.data.message || "Proceed to enter OTP");
      toast.success("Login successful. Please enter OTP.");
      router.push(`/otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
      const errDetails = {
        message: error instanceof Error ? error.message : "Unknown error",
        code: error instanceof AxiosError ? error.code : undefined,
        response: error instanceof AxiosError ? error.response?.data : undefined,
        status: error instanceof AxiosError ? error.response?.status : undefined,
      };
      console.error("Login error:", errDetails);

      if (error instanceof AxiosError) {
        if (error.code === "ERR_CORS") {
          setError("CORS error. Please check backend configuration.");
        } else if (error.response?.status === 401) {
          setError("Invalid email or password.");
        } else {
          setError(error.response?.data?.message || "Login failed. Please try again.");
        }
      } else {
        setError("Network error. Please check your connection.");
      }
      toast.error(errDetails.message);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Toaster />
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo_white.svg" alt="Kiotapay Logo" width={120} height={40} priority />
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-center text-sm text-gray-600 mb-6">
            Enter your email and password to login
          </p>
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          {success && <p className="text-center text-sm text-green-600">{success}</p>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005555] text-gray-900 placeholder-gray-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005555] text-gray-900 placeholder-gray-500"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#005555] text-white rounded-md hover:bg-[#004444] transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link href="/register" className="text-[#005555] hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;


