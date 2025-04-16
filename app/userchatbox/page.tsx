"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCog } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";

config.autoAddCss = false;

const UserChatbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    console.log(`Navigating to ${tab} chats`);
  };

  return (
    <div
      className="bg-[#121B22] text-gray-300 h-screen w-full overflow-hidden relative"
      style={{ fontFamily: "sans-serif" }}
    >
      
      <div className="bg-[#1E2A32] p-4">
        <div className="bg-[#2A3942] rounded-lg flex items-center pl-4 py-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent border-none outline-none text-gray-400 placeholder-gray-500 w-full"
          />
        </div>
      </div>


      <div className="flex items-center justify-between px-4 mt-2">
        <div className="flex items-center space-x-2">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold focus:outline-none ${
              activeTab === "all" ? "bg-[#2A3942] text-white" : "text-gray-400"
            }`}
            onClick={() => handleTabClick("all")}
          >
            All
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold focus:outline-none ${
              activeTab === "unread" ? "bg-[#2A3942] text-white" : "text-gray-400"
            }`}
            onClick={() => handleTabClick("unread")}
          >
            Unread
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold focus:outline-none ${
              activeTab === "favorites" ? "bg-[#2A3942] text-white" : "text-gray-400"
            }`}
            onClick={() => handleTabClick("favorites")}
          >
            Favorites
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-green-500 focus:outline-none">+</button>
          <div className="relative">
            <FontAwesomeIcon
              icon={faBell}
              className="text-yellow-500 text-lg animate-pulse"
            />
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4">
        <button className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 focus:outline-none">
          <span className="text-sm font-semibold">Settings</span>
          <FontAwesomeIcon icon={faCog} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export default UserChatbox;
