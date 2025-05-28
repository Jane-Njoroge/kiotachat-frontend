// "use client";

// import React, { useState } from "react";
// import Image from "next/image";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// //import Cookies from "js-cookie";

// const OTPVerification: React.FC = () => {
//   const [otp, setOtp] = useState("");
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const email = searchParams.get("email") || "";

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setError("");
//     setSuccess("");

//     if (!otp.trim()) {
//       setError("Please enter the OTP.");
//       return;
//     }

//     if (!email) {
//       setError("Email is missing. Please log in again.");
//       return;
//     }

//     try {
//       const response = await axios.post(
//         `${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`,
//         { email, otp },
//         { withCredentials: true }
//       );

//       if (response.status === 200) {
//         setSuccess("OTP verified successfully! Redirecting...");

//         const { userId, role } = response.data;

//         // Store userId in localStorage (keep for existing frontend logic)
//         localStorage.setItem("userId", userId);

//         // // Set userId and userRole cookies
//         // Cookies.set("userId", userId, {
//         //   secure: process.env.NODE_ENV === "production",
//         //   sameSite: "strict",
//         //   expires: 1, // 1 day expiry (86400 seconds)
//         //   path: "/",
//         // });
//         // Cookies.set("userRole", role, {
//         //   secure: process.env.NODE_ENV === "production",
//         //   sameSite: "strict",
//         //   expires: 1, // 1 day expiry
//         //   path: "/",
//         // });


//       //cookies are set by backend
//         if (role === "ADMIN") {
//           router.push("/adminchatbox");
//         } else {
//           router.push("/userchatbox");
//         }
//       } else {
//         setError("Failed to verify OTP. Please try again.");
//       }
//     } catch (err: unknown) {
//       if (axios.isAxiosError(err)) {
//         setError(err.response?.data?.message || "OTP verification failed.");
//       } else {
//         setError("An unexpected error occurred. Please try again.");
//       }
//       console.error("OTP verification error:", err);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
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

//           {error && <p className="text-center text-sm text-red-600">{error}</p>}
//           {success && (
//             <p className="text-center text-sm text-green-600">{success}</p>
//           )}

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

// export default OTPVerification;
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const OTPVerification: React.FC = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp.trim()) {
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
        { email, otp },
        { withCredentials: true }
      );
      console.log("OTP verification response:", response.data);

      if (response.status === 200) {
        setSuccess("OTP verified successfully! Redirecting...");
        const { userId, role } = response.data;
        localStorage.setItem("userId", userId);
        localStorage.setItem("role", role); // Store role for consistency

        if (role === "ADMIN") {
          router.push("/adminchatbox");
        } else {
          router.push("/userchatbox");
        }
      } else {
        setError("Failed to verify OTP. Please try again.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "OTP verification failed.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error("OTP verification error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
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

          {error && <p className="text-center text-sm text-red-600">{error}</p>}
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
              maxLength={6}
              inputMode="numeric"
              pattern="\d{6}"
              autoComplete="one-time-code"
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