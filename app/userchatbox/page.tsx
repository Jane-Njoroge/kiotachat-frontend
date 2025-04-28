"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCog, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import io, { Socket } from "socket.io-client";
import axios from "axios";

config.autoAddCss = false;

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'USER' | 'ADMIN';
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: User;
  createdAt: string;
  conversationId: string;
}

interface Conversation {
  id: string;
  userId: string;
  user: User;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
}

const UserChatbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await axios.get<{ userId: string }>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`,
          { withCredentials: true }
        );
        setUserId(response.data.userId);
      } catch (error) {
        console.error("Error fetching userId:", error);
      }
    };
    fetchUserId();

    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      socket.emit("register", { userId, role: "USER" });
    });

    socket.on("private message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("Socket error:", message);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);
  
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get<Conversation[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
          { params: { userId }, withCredentials: true }
        );
        
        // Get admin info for each conversation
        const withAdmin = await Promise.all(response.data.map(async conv => {
          const admin = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-id`
          );
          return { ...conv, admin: admin.data };
        }));
        
        setConversations(withAdmin);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };
    if (userId) fetchConversations();
  }, [userId, activeTab]);
  // useEffect(() => {
  //   const fetchConversations = async () => {
  //     try {
  //       const response = await axios.get<Conversation[]>(
  //         `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
  //         { params: { userId }, withCredentials: true }
  //       );
  //       setConversations(response.data);
  //       if (response.data.length > 0) {
  //         setSelectedConversation(response.data[0]);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching conversations:", error);
  //     }
  //   };
  //   if (userId) fetchConversations();
  // }, [userId, activeTab]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedConversation) {
        try {
          const response = await axios.get<Message[]>(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages`,
            {
              params: { conversationId: selectedConversation.id },
              withCredentials: true,
            }
          );
          setMessages(response.data);
          scrollToBottom();
        } catch (error) {
          console.error("Error fetching messages:", error);
        }
      }
    };
    fetchMessages();
  }, [selectedConversation]);

  const handleTabClick = (tab: "all" | "unread") => {
    setActiveTab(tab);
    setSelectedConversation(null);
    setMessages([]);
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    try{
      const adminResponse = await axios.get('${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-id');
      const adminId = adminResponse.data.adminId;
    const messageData = {
      content: newMessage,
      to: adminId,
      from: userId,
      conversationId: selectedConversation.id,
    };

    socketRef.current?.emit("private message", messageData);
    setNewMessage("");
  }catch (error) {
    console.error("Error getting admin ID:",error);
  }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className={`h-screen w-full overflow-hidden relative ${
        isDarkMode ? "text-gray-300" : "text-gray-800"
      }`}
      style={{
        fontFamily: "sans-serif",
        backgroundImage: "url('/logo2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className={`absolute inset-0 ${
          isDarkMode ? "bg-black bg-opacity-60" : "bg-white bg-opacity-60"
        }`}
      ></div>

      <div className="relative z-10 h-full flex flex-col">
        <div className={`p-4 ${isDarkMode ? "bg-[#1E2A32]" : "bg-gray-200"}`}>
          <div className={`rounded-lg flex items-center pl-4 py-2 ${
            isDarkMode ? "bg-[#2A3942]" : "bg-white"
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-500 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              className={`bg-transparent border-none outline-none w-full ${
                isDarkMode ? "text-gray-400 placeholder-gray-500" : "text-gray-700 placeholder-gray-400"
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 mt-2">
          <div className="flex items-center space-x-2">
            {(["all", "unread"] as const).map((tab) => (
              <button
                key={tab}
                className={`rounded-full px-4 py-2 text-sm font-semibold focus:outline-none ${
                  activeTab === tab ? "bg-[#2A3942] text-white" : "text-gray-400"
                }`}
                onClick={() => handleTabClick(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <FontAwesomeIcon
                icon={faBell}
                className="text-yellow-500 animate-pulse"
                style={{ fontSize: "20px" }}
              />
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 text-gray-400">
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 hover:bg-[#1E2A32] cursor-pointer ${
                  selectedConversation?.id === conv.id ? "bg-[#1E2A32]" : ""
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <p className="font-semibold">{conv.user?.fullName || 'Unknown User'}</p>
                <p className="text-sm">
                  {conv.messages[0]?.content || "No messages yet"}
                </p>
                {conv.createdAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center">No chats available</p>
          )}
        </div>

        <div className="flex-grow flex flex-col p-4">
          {selectedConversation ? (
            <div className="flex flex-col h-full">
              <div className="p-4 bg-[#1E2A32] border-b border-[#222E35]">
                <h2 className="text-white font-semibold">Admin Chat</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-[#0B141A]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-4 flex ${
                      msg.sender.id === userId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className={`max-w-xs p-3 rounded-lg ${
                      msg.sender.id === userId ? "bg-[#2A3942] text-white" : "bg-[#1E2A32] text-gray-300"
                    }`}>
                      <p>{msg.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 bg-[#1E2A32] flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#2A3942] text-white rounded-lg p-3 outline-none"
                />
                <button
                  type="submit"
                  className="ml-2 bg-[#005555] text-white rounded-lg px-4 py-2"
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-center items-center text-gray-500 text-lg">
            
            </div>
          )}
        </div>

        <div className="absolute bottom-4 right-4">
          <button
            className="flex items-center space-x-2 hover:text-gray-300 focus:outline-none"
            onClick={() => setShowSettings(!showSettings)}
          >
            <span className="text-sm font-semibold">Settings</span>
            <FontAwesomeIcon icon={faCog} className="text-gray-500" />
          </button>
        </div>

        {showSettings && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-gray-800 p-6 rounded-lg shadow-xl w-80 z-20">
            <h3 className="text-lg font-semibold mb-4">Settings</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <img
                src={profilePicture ?? "/profilePicture.png"}
                alt="Profile"
                className="mt-2 rounded-full w-16 h-16 object-cover"
              />
            </div>
            <div className="mb-4 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                {isDarkMode ? "Dark Mode" : "Light Mode"}
              </label>
              <button onClick={toggleDarkMode} className="focus:outline-none">
                <FontAwesomeIcon
                  icon={isDarkMode ? faMoon : faSun}
                  className="text-xl text-gray-500"
                />
              </button>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserChatbox;