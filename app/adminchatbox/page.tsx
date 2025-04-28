"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";

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
  createdAt: string;
  sender: User;
  conversationId: string;
}

interface Conversation {
  id: string;
  userId: string;
  user: User;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const AdminChatLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "favorites">("all");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
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
      socket.emit("register", { userId, role: "ADMIN" });
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
    const fetchUsers = async () => {
      try {
        const response = await axios.get<User[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/users`,
          { 
            params: {role: "USER"},
            withCredentials: true }
        );
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    
    if (userId) fetchUsers();
  }, [userId]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get<Conversation[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
          { params: { userId }, withCredentials: true }
        );
        setConversations(response.data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };
    if (userId) fetchConversations();
  }, [userId, activeTab]);

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

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = users.filter(user =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phoneNumber?.includes(searchQuery)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, users]);

  const createNewConversation = async (userId: string) => {
    try {
      const response = await axios.post<Conversation>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        { userId },
        { withCredentials: true }
      );
      
      setConversations(prev => [response.data, ...prev]);
      setSelectedConversation(response.data);
      setSearchQuery("");
      
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleTabClick = (tab: "all" | "unread" | "favorites") => {
    setActiveTab(tab);
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

  try{
    const messageData = {
      content: newMessage,
      to: selectedConversation.userId,
      from: userId,
      conversationId: selectedConversation.id,
    };

    socketRef.current?.emit("private message", messageData);
    setNewMessage("");
  }catch (error) {
    console.error("Error sending message:", error);
  }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B141A]">
      <div className="w-full max-w-sm bg-[#121B22] flex flex-col border-r border-[#222E35]">
        <div className="p-4 bg-[#1E2A32]">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center px-4 mt-2 space-x-2">
          {(["all", "unread", "favorites"] as const).map((tab) => (
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

        <div className="flex-1 overflow-y-auto mt-4 text-gray-400">
          {searchQuery ? (
            searchResults.length > 0 ? (
              searchResults.map((user) => {
                const existingConversation = conversations.find(
                  conv => conv.userId === user.id
                );
                
                return (
                  <div
                    key={user.id}
                    className={`p-4 hover:bg-[#1E2A32] cursor-pointer ${
                      selectedConversation?.userId === user.id ? "bg-[#1E2A32]" : ""
                    }`}
                    onClick={() => {
                      if (existingConversation) {
                        handleConversationClick(existingConversation);
                      } else {
                        createNewConversation(user.id);
                      }
                    }}
                  >
                    <p className="font-semibold">{user.fullName}</p>
                    <p className="text-sm">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {existingConversation 
                        ? `Existing chat - ${existingConversation.messages.length} messages`
                        : "New conversation"}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-center">No users found</p>
            )
          ) : conversations.length > 0 ? (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 hover:bg-[#1E2A32] cursor-pointer ${
                  selectedConversation?.id === conv.id ? "bg-[#1E2A32]" : ""
                }`}
                onClick={() => handleConversationClick(conv)}
              >
                <p className="font-semibold">{conv.user.fullName}</p>
                <p className="text-sm">
                  {conv.messages[0]?.content || "No messages yet"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(conv.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center">No chats available</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-[#1E2A32] border-b border-[#222E35]">
              <h2 className="text-white font-semibold">
                {selectedConversation.user.fullName}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#0B141A]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${
                    msg.senderId === userId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      msg.senderId === userId
                        ? "bg-[#2A3942] text-white"
                        : "bg-[#1E2A32] text-gray-300"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-[#1E2A32] flex items-center"
            >
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
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatLayout;