// // "use client";

// // import React, { useState } from "react";
// // import Image from "next/image";
// // import { useRouter, useSearchParams } from "next/navigation";
// // import axios from "axios";

// // const OTPVerification: React.FC = () => {
// //   const [otp, setOtp] = useState("");
// //   const [error, setError] = useState("");
// //   const [success, setSuccess] = useState("");
// //   const router = useRouter();
// //   const searchParams = useSearchParams();
// //   const email = searchParams.get("email") || "";

// //   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
// //     e.preventDefault();
// //     setError("");
// //     setSuccess("");

// //     if (!otp.trim()) {
// //       setError("Please enter the OTP.");
// //       return;
// //     }

// //     if (!email) {
// //       setError("Email is missing. Please log in again.");
// //       return;
// //     }

// //     try {
// //       const response = await axios.post(
// //         `${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`,
// //         { email, otp },
// //         { withCredentials: true }
// //       );
// //       console.log("OTP verification response:", response.data);

// //       if (response.status === 200) {
// //         setSuccess("OTP verified successfully! Redirecting...");
// //         const { userId, role } = response.data;
// //         localStorage.setItem("userId", userId);
// //         localStorage.setItem("role", role); // Store role for consistency

// //         if (role === "ADMIN") {
// //           router.push("/adminchatbox");
// //         } else {
// //           router.push("/userchatbox");
// //         }
// //       } else {
// //         setError("Failed to verify OTP. Please try again.");
// //       }
// //     } catch (err: unknown) {
// //       if (axios.isAxiosError(err)) {
// //         setError(err.response?.data?.message || "OTP verification failed.");
// //       } else {
// //         setError("An unexpected error occurred. Please try again.");
// //       }
// //       console.error("OTP verification error:", err);
// //     }
// //   };

// //   return (
// //     <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
// //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// //         <div className="flex justify-center mb-8">
// //           <Image
// //             src="/logo_white.svg"
// //             alt="Kiotapay Logo"
// //             width={120}
// //             height={40}
// //             priority
// //           />
// //         </div>

// //         <form onSubmit={handleSubmit} className="space-y-6">
// //           <p className="text-center text-sm text-gray-600 mb-6">
// //             Please enter the OTP sent to your email!
// //           </p>

// //           {error && <p className="text-center text-sm text-red-600">{error}</p>}
// //           {success && (
// //             <p className="text-center text-sm text-green-600">{success}</p>
// //           )}

// //           <div>
// //             <label
// //               htmlFor="otp"
// //               className="block text-sm font-medium text-gray-900 mb-2"
// //             >
// //               OTP Code
// //             </label>
// //             <input
// //               id="otp"
// //               type="text"
// //               placeholder="Enter OTP"
// //               value={otp}
// //               onChange={(e) => setOtp(e.target.value)}
// //               className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005555] transition-all duration-200 text-gray-900 placeholder-gray-500"
// //               maxLength={6}
// //               inputMode="numeric"
// //               pattern="\d{6}"
// //               autoComplete="one-time-code"
// //             />
// //           </div>

// //           <button
// //             type="submit"
// //             className="w-full py-3 bg-[#005555] text-white rounded-md hover:bg-[#004444] transition-colors text-sm font-medium"
// //           >
// //             Verify OTP
// //           </button>
// //         </form>
// //       </div>
// //     </div>
// //   );
// // };

// // export default OTPVerification;

// // "use client";

// // import React, { useState } from "react";
// // import Image from "next/image";
// // import { useRouter, useSearchParams } from "next/navigation";
// // import { Suspense } from "react";
// // import {Toaster, toast} from "react-hot-toast"
// // import axios from "axios";

// // const OTPContent: React.FC = () => {
// //   const [otp, setOtp] = useState("");
// //   const [error, setError] = useState("");
// //   const [success, setSuccess] = useState("");
// //   const router = useRouter();
// //   const searchParams = useSearchParams();
// //   const email = searchParams.get("email") || "";

// //   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
// //     e.preventDefault();
// //     setError("");
// //     setSuccess("");

// //     if (!otp.trim()) {
// //       setError("Please enter the OTP.");
// //       return;
// //     }

// //     if (!email) {
// //       setError("Email is missing. Please log in again.");
// //       return;
// //     }
// //     const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL
// //     if (!BACKEND_URL) {
// //       console.error("NEXT_PUBLIC_BACKEND_URL is not defined");
// //       setError("Server configuration error. Please contact support.");
// //       return;
// //     }

// //     try {
// //       const response = await axios.post(
// //         `${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`,
// //         { email, otp },
// //         { withCredentials: true }
// //       );
// //       console.log("OTP verification response:", response.data);

// //       if (response.status === 200) {
// //         setSuccess("OTP verified successfully! Redirecting...");
// //         const { userId, role,fullName } = response.data;
// //         localStorage.setItem("userId", userId);
// //         localStorage.setItem("role", role.toUpperCase());
// //         localStorage.setItem("fullName", fullName || email);
// //         console.log("OTP verification response:", { userId, role, fullName });


// //         if (role.toUpperCase() === "ADMIN") {
// //           router.push("/adminchatbox");
// //         } else {
// //           router.push("/userchatbox");
// //         }
// //       } else {
// //         setError("Failed to verify OTP. Please try again.");
// //       }
// //     } catch (err: unknown) {
// //       if (axios.isAxiosError(err)) {
// //         setError(err.response?.data?.message || "OTP verification failed.");
// //       } else {
// //         setError("An unexpected error occurred. Please try again.");
// //       }
// //       console.error("OTP verification error:", err);
// //     }
// //   };

// //   return (
// //     <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
// //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// //         <div className="flex justify-center mb-8">
// //           <Image
// //             src="/logo_white.svg"
// //             alt="Kiotapay Logo"
// //             width={120}
// //             height={40}
// //             priority
// //           />
// //         </div>

// //         <form onSubmit={handleSubmit} className="space-y-6">
// //           <p className="text-center text-sm text-gray-600 mb-6">
// //             Please enter the OTP sent to your email!
// //           </p>

// //           {error && <p className="text-center text-sm text-red-600">{error}</p>}
// //           {success && (
// //             <p className="text-center text-sm text-green-600">{success}</p>
// //           )}

// //           <div>
// //             <label
// //               htmlFor="otp"
// //               className="block text-sm font-medium text-gray-900 mb-2"
// //             >
// //               OTP Code
// //             </label>
// //             <input
// //               id="otp"
// //               type="text"
// //               placeholder="Enter OTP"
// //               value={otp}
// //               onChange={(e) => setOtp(e.target.value)}
// //               className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005555] transition-all duration-200 text-gray-900 placeholder-gray-500"
// //               maxLength={6}
// //               inputMode="numeric"
// //               pattern="\d{6}"
// //               autoComplete="one-time-code"
// //             />
// //           </div>

// //           <button
// //             type="submit"
// //             className="w-full py-3 bg-[#005555] text-white rounded-md hover:bg-[#004444] transition-colors text-sm font-medium"
// //           >
// //             Verify OTP
// //           </button>
// //         </form>
// //       </div>
// //     </div>
// //   );
// // };

// // const OTPVerification: React.FC = () => {
// //   return (
// //     <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading OTP verification...</div>}>
// //       <OTPContent />
// //     </Suspense>
// //   );
// // };

// // export default OTPVerification;


// "use client";

// import React, { useState } from "react";
// import Image from "next/image";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import { Toaster, toast } from "react-hot-toast";
// import axios from "axios";

// const OTPContent: React.FC = () => {
//   const [otp, setOtp] = useState("");
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const email = searchParams.get("email") || "";

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     if (!otp.trim()) {
//       toast.error("Please enter the OTP.");
//       return;
//     }

//     if (!email) {
//       toast.error("Email is missing. Please log in again.");
//       return;
//     }

//     const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
//     if (!BACKEND_URL) {
//       console.error("NEXT_PUBLIC_BACKEND_URL is not defined");
//       toast.error("Server configuration error. Please contact support.");
//       return;
//     }

//     try {
//       const response = await axios.post(
//         `${BACKEND_URL}/verify-otp`,
//         { email, otp },
//         { withCredentials: true }
//       );
//       console.log("OTP verification response:", response.data);

//       if (response.status === 200) {
//         toast.success("OTP verified successfully! Redirecting...");
//         const { userId, role, fullName } = response.data;
//         localStorage.setItem("userId", String(userId));
//         localStorage.setItem("role", role.toUpperCase()); // Normalize role
//         localStorage.setItem("fullName", fullName || email);
//         console.log("Stored in localStorage:", { userId, role, fullName });

//         if (role.toUpperCase() === "ADMIN") {
//           router.push("/adminchatbox");
//         } else {
//           router.push("/userchatbox");
//         }
//       } else {
//         toast.error("Failed to verify OTP. Please try again.");
//       }
//     } catch (err: unknown) {
//       const message = axios.isAxiosError(err)
//         ? err.response?.data?.message || "OTP verification failed."
//         : "An unexpected error occurred. Please try again.";
//       toast.error(message);
//       console.error("OTP verification error:", err);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
//       <Toaster position="top-right" />
//       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
//         <div className="flex justify-center mb-8">
//           <Image
//             src="/logo_white.svg"
//             alt="Kiotapay Logo"
//             width={120}
//             height={40}
//             priority
//           />
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           <p className="text-center text-sm text-gray-600 mb-6">
//             Please enter the OTP sent to your email!
//           </p>

//           <div>
//             <label
//               htmlFor="otp"
//               className="block text-sm font-medium text-gray-900 mb-2"
//             >
//               OTP Code
//             </label>
//             <input
//               id="otp"
//               type="text"
//               placeholder="Enter OTP"
//               value={otp}
//               onChange={(e) => setOtp(e.target.value)}
//               className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005555] transition-all duration-200 text-gray-900 placeholder-gray-500"
//               maxLength={6}
//               inputMode="numeric"
//               pattern="\d{6}"
//               autoComplete="one-time-code"
//             />
//           </div>

//           <button
//             type="submit"
//             className="w-full py-3 bg-[#005555] text-white rounded-md hover:bg-[#004444] transition-colors text-sm font-medium"
//           >
//             Verify OTP
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// const OTPVerification: React.FC = () => {
//   return (
//     <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading OTP verification...</div>}>
//       <OTPContent />
//     </Suspense>
//   );
// };

// export default OTPVerification;


"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002";

const OTPContent: React.FC = () => {
  const [otp, setOtp] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  // Clear cookies on mount
  useEffect(() => {
    const clearCookies = async () => {
      try {
        await axios.post(
          `${BACKEND_URL}/clear-cookies`,
          {},
          { withCredentials: true }
        );
        console.log("Cookies cleared before OTP verification");
      } catch (error) {
        console.error("Error clearing cookies:", error);
      }
    };
    clearCookies();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error("Please enter the OTP.");
      return;
    }

    if (!email) {
      toast.error("Email is missing. Please log in again.");
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/verify-otp`,
        { email, otp },
        { withCredentials: true }
      );
      console.log("OTP verification response:", response.data);

      if (response.status === 200) {
        toast.success("OTP verified successfully! Redirecting...");
        localStorage.setItem("fullName", response.data.fullName || email); // Only store non-sensitive data

        if (response.data.role.toUpperCase() === "ADMIN") {
          router.push("/adminchatbox");
        } else {
          router.push("/userchatbox");
        }
      } else {
        toast.error("Failed to verify OTP. Please try again.");
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || "OTP verification failed."
        : "An unexpected error occurred. Please try again.";
      toast.error(message);
      console.error("OTP verification error:", err);
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
              maxLength={6}
              inputMode="numeric"
              pattern="\d{6}"
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#005555] text-white rounded-md hover:bg-[#004444] transition-colors text-sm font-medium"
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
