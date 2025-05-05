"use client";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: "USER" | "ADMIN";
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
  const [searchResults, setSearchResults] = useState<(User | Conversation)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get<{ userId: string }>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`,
          { withCredentials: true }
        );
        setUserId(response.data.userId);
      } catch (error: unknown) {
        let errorMessage = "Failed to authenticate. Please log in again.";
        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        console.error("Error fetching userId:", errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserId();

    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002", {
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("private message", (message: Message) => {
      if (message.conversationId === selectedConversation?.id) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? { ...conv, messages: [...conv.messages, message], updatedAt: new Date().toISOString() }
            : conv
        )
      );
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("Socket error:", message);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (userId && socketRef.current) {
      socketRef.current.emit("register", { userId, role: "ADMIN" });
    }
  }, [userId]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);
        const response = await axios.get<Conversation[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
          { params: { userId, tab: activeTab }, withCredentials: true }
        );
        setConversations(response

.data);
      } catch (error: unknown) {
        let errorMessage = "Failed to fetch conversations.";
        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message || errorMessage;
        } else if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        }
        console.error("Error fetching conversations:", errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConversations();
  }, [userId, activeTab]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;
      try {
        setIsLoading(true);
        const response = await axios.get<Message[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages`,
          {
            params: { conversationId: selectedConversation.id },
            withCredentials: true,
          }
        );
        setMessages(response.data);
        scrollToBottom();
      } catch (error: unknown) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [selectedConversation]);

  useEffect(() => {
    const searchBackend = async () => {
      if (!searchQuery.trim() || !userId) {
        setSearchResults([]);
        return;
      }
      try {
        setIsLoading(true);
        const response = await axios.get<(User | Conversation)[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/search`,
          {
            params: { query: searchQuery, userId },
            withCredentials: true,
          }
        );
        setSearchResults(response.data);
      } catch (error: unknown) {
        console.error("Error searching:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    const debounce = setTimeout(searchBackend, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, userId]);

  const createNewConversation = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post<Conversation>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        { userId },
        { withCredentials: true }
      );
      setConversations((prev) => [response.data, ...prev]);
      setSelectedConversation(response.data);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: unknown) {
      console.error("Error creating conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabClick = (tab: "all" | "unread" | "favorites") => {
    setActiveTab(tab);
    setSelectedConversation(null);
    setMessages([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !socketRef.current) return;

    try {
      const messageData = {
        content: newMessage,
        to: selectedConversation.userId,
        from: userId,
        conversationId: selectedConversation.id,
      };

      socketRef.current.emit("private message", messageData);
      setNewMessage("");
    } catch (error: unknown) {
      console.error("Error sending message:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex h-screen w-screen bg-[#000000]">
      <div className="w-full max-w-xs bg-[#121B22] flex flex-col border-r border-[#222E35]">
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
              placeholder="Search users, emails, or messages..."
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
          {isLoading && <p className="text-center text-gray-500">Loading...</p>}
          {searchQuery ? (
            searchResults.length > 0 ? (
              searchResults.map((result) => {
                const isUser = "role" in result;
                const existingConversation = isUser
                  ? conversations.find((conv) => conv.userId === result.id)
                  : result;

                return (
                  <div
                    key={isUser ? result.id : result.id}
                    className={`p-4 hover:bg-[#1E2A32] cursor-pointer ${
                      selectedConversation?.id === (isUser ? existingConversation?.id : result.id)
                        ? "bg-[#1E2A32]"
                        : ""
                    }`}
                    onClick={() => {
                      if (isUser && !existingConversation) {
                        createNewConversation(result.id);
                      } else {
                        handleConversationClick((existingConversation || result) as Conversation);
                      }
                    }}
                  >
                    <p className="font-semibold">
                      {isUser ? result.fullName : result.user.fullName}
                    </p>
                    <p className="text-sm">
                      {isUser ? result.email : result.messages[0]?.content || "No messages yet"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isUser
                        ? existingConversation
                          ? `Existing chat - ${existingConversation.messages.length} messages`
                          : "New conversation"
                        : new Date(result.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-center">No users or conversations found</p>
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
                  {new Date(conv.updatedAt).toLocaleDateString()}
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

            <div className="flex-1 overflow-y-auto p-4 bg-[#000000]">
              {messages.length > 0 ? (
                messages.map((msg) => (
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
                ))
              ) : (
                <p className="text-center text-gray-500">No messages yet</p>
              )}
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