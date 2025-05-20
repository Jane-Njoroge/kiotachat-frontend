"use client";

import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faGear, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import io, { Socket } from "socket.io-client";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

config.autoAddCss = false;

interface User {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "USER";
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
  participant1: { id: string; fullName: string; email: string; role: string };
  participant2: { id: string; fullName: string; email: string; role: string };
  messages: Message[];
  unread: number;
  createdAt: string;
  updatedAt: string;
}

const AdminChatbox: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(User | Conversation)[]>([]);
  const [adminId, setAdminId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedAdminId = localStorage.getItem("userId")?.trim();
    if (storedAdminId && !isNaN(parseInt(storedAdminId, 10))) {
      setAdminId(storedAdminId);
    } else {
      setError("No valid admin ID found. Please log in again.");
      toast.error("No valid admin ID found. Please log in again.");
    }
  }, []);

  useEffect(() => {
    if (!adminId) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002", {
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      socket.emit("register", { userId: adminId, role: "ADMIN" });
    });

    socket.on("private message", (message: Message) => {
      if (!message?.conversationId) {
        console.error("Invalid message received:", message);
        return;
      }
      const normalizedMessage = {
        ...message,
        id: String(message.id),
        senderId: String(message.senderId),
        sender: { ...message.sender, id: String(message.sender.id) },
      };
      console.log("Received message:", normalizedMessage);
      if (message.conversationId === selectedConversation?.id) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !String(m.id).startsWith("temp"));
          return [...filtered, normalizedMessage];
        });
        scrollToBottom();
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                messages: [...(conv.messages || []), normalizedMessage],
                unread: conv.id === selectedConversation?.id ? 0 : (conv.unread || 0) + 1,
                updatedAt: new Date().toISOString(),
              }
            : conv
        )
      );
    });

    socket.on("conversation updated", (updatedConversation: Conversation) => {
      if (!updatedConversation?.id || !updatedConversation.participant1 || !updatedConversation.participant2) {
        console.error("Invalid conversation update received:", updatedConversation);
        return;
      }
      const normalizedConversation = {
        ...updatedConversation,
        id: String(updatedConversation.id),
        participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
        participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
        messages: updatedConversation.messages.map((msg) => ({
          ...msg,
          id: String(msg.id),
          senderId: String(msg.senderId),
          sender: { ...msg.sender, id: String(msg.sender.id) },
        })),
      };
      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === normalizedConversation.id);
        if (exists) {
          return prev.map((conv) =>
            conv.id === normalizedConversation.id ? normalizedConversation : conv
          );
        }
        return [normalizedConversation, ...prev];
      });
      if (selectedConversation?.id === normalizedConversation.id) {
        setSelectedConversation(normalizedConversation);
        setMessages(normalizedConversation.messages || []);
        scrollToBottom();
      }
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("Socket error:", message);
      setError(message);
      toast.error(message);
    });

    socket.on("connect_error", (err: Error) => {
      console.error("Socket connection error:", err.message);
      setError("Failed to connect to server. Please try again.");
      toast.error("Failed to connect to server");
    });

    return () => {
      socket.disconnect();
    };
  }, [adminId, selectedConversation]);

  useEffect(() => {
    if (!adminId || isNaN(parseInt(adminId, 10))) {
      setError("Invalid admin ID. Please log in again.");
      return;
    }

    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching conversations with params:", { userId: adminId, role: "ADMIN" });
        const response = await axios.get<Conversation[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
          {
            params: { userId: adminId, role: "ADMIN" },
            withCredentials: true,
          }
        );
        const normalizedConversations = response.data.map((conv) => ({
          ...conv,
          id: String(conv.id),
          participant1: { ...conv.participant1, id: String(conv.participant1.id) },
          participant2: { ...conv.participant2, id: String(conv.participant2.id) },
          messages: conv.messages.map((msg) => ({
            ...msg,
            id: String(msg.id),
            senderId: String(msg.senderId),
            sender: { ...msg.sender, id: String(msg.sender.id) },
          })),
        }));
        console.log("Conversations fetched:", normalizedConversations);
        setConversations(normalizedConversations);
        if (normalizedConversations.length > 0 && !selectedConversation) {
          setSelectedConversation(normalizedConversations[0]);
        }
      } catch (error: unknown) {
        console.error("Error fetching conversations:", error);
        let message = "Failed to fetch conversations";
        if (axios.isAxiosError(error)) {
          message = error.response?.data?.message || error.message;
          console.error("Axios error details:", error.response?.data);
        }
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [adminId, selectedConversation]);

  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      try {
        setError(null);
        const response = await axios.get<Message[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages`,
          {
            params: { conversationId: selectedConversation.id },
            withCredentials: true,
          }
        );
        const normalizedMessages = response.data.map((msg) => ({
          ...msg,
          id: String(msg.id),
          senderId: String(msg.senderId),
          sender: { ...msg.sender, id: String(msg.sender.id) },
        }));
        console.log("Fetched messages:", normalizedMessages);
        setMessages(normalizedMessages || []);
        scrollToBottom();

        if (selectedConversation.unread > 0) {
          await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations/${selectedConversation.id}/read`,
            {},
            { withCredentials: true }
          );
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === selectedConversation.id ? { ...conv, unread: 0 } : conv
            )
          );
          socketRef.current?.emit("conversation opened", { conversationId: selectedConversation.id });
        }
      } catch (error: unknown) {
        console.error("Error fetching messages:", error);
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message || "Failed to fetch messages"
          : "An unexpected error occurred";
        setError(message);
        toast.error(message);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  useEffect(() => {
    if (!searchQuery.trim() || !adminId) {
      setSearchResults([]);
      return;
    }

    const searchBackend = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [convRes, userRes] = await Promise.all([
          axios.get<Conversation[]>(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/search/conversations`,
            {
              params: { query: searchQuery, userId: adminId, role: "ADMIN" },
              withCredentials: true,
            }
          ),
          axios.get<User[]>(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/search/users`,
            {
              params: { query: searchQuery, excludeUserId: adminId },
              withCredentials: true,
            }
          ),
        ]);
        const normalizedConversations = convRes.data.map((conv) => ({
          ...conv,
          id: String(conv.id),
          participant1: { ...conv.participant1, id: String(conv.participant1.id) },
          participant2: { ...conv.participant2, id: String(conv.participant2.id) },
          messages: conv.messages.map((msg) => ({
            ...msg,
            id: String(msg.id),
            senderId: String(msg.senderId),
            sender: { ...msg.sender, id: String(msg.sender.id) },
          })),
        }));
        const normalizedUsers = userRes.data.map((user) => ({
          ...user,
          id: String(user.id),
        }));

        // Filter users to only those without existing conversations
        const conversationParticipantIds = new Set(
          normalizedConversations.flatMap((conv) => [
            conv.participant1.id,
            conv.participant2.id,
          ])
        );
        const filteredUsers = normalizedUsers.filter(
          (user) => !conversationParticipantIds.has(user.id)
        );

        // Combine results, prioritizing conversations
        setSearchResults([...normalizedConversations, ...filteredUsers]);
      } catch (error: unknown) {
        console.error("Error searching:", error);
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message || "Failed to search"
          : "An unexpected error occurred";
        setError(message);
        toast.error(message);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchBackend, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, adminId]);

  const createNewConversation = async (otherUserId: string) => {
    try {
      setIsCreating(true);
      setError(null);
      console.log("Creating conversation with:", { adminId, otherUserId });

      if (isNaN(parseInt(adminId, 10)) || isNaN(parseInt(otherUserId, 10))) {
        throw new Error("Invalid participant IDs");
      }

      const existingConversation = conversations.find(
        (conv) =>
          (conv.participant1.id === adminId && conv.participant2.id === otherUserId) ||
          (conv.participant1.id === otherUserId && conv.participant2.id === adminId)
      );

      let conversation: Conversation;
      if (existingConversation) {
        conversation = existingConversation;
      } else {
        const response = await axios.post<Conversation>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
          { participant1Id: parseInt(adminId, 10), participant2Id: parseInt(otherUserId, 10) },
          { withCredentials: true }
        );
        conversation = {
          ...response.data,
          id: String(response.data.id),
          participant1: { ...response.data.participant1, id: String(response.data.participant1.id) },
          participant2: { ...response.data.participant2, id: String(response.data.participant2.id) },
          messages: response.data.messages.map((msg) => ({
            ...msg,
            id: String(msg.id),
            senderId: String(msg.senderId),
            sender: { ...msg.sender, id: String(msg.sender.id) },
          })),
        };
        setConversations((prev) => {
          if (prev.some((conv) => conv.id === conversation.id)) {
            return prev;
          }
          return [conversation, ...prev];
        });
      }

      setSelectedConversation(conversation);
      setSearchQuery("");
      setSearchResults([]);
      toast.success("Conversation selected or started!");
    } catch (error: unknown) {
      console.error("Error creating conversation:", error);
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to create conversation"
        : "An unexpected error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !socketRef.current || !adminId) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      senderId: adminId,
      sender: { id: adminId, fullName: "Admin", email: "", role: "ADMIN" },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
    };

    const otherUserId =
      selectedConversation.participant1.id === adminId
        ? selectedConversation.participant2.id
        : selectedConversation.participant1.id;

    socketRef.current.emit("private message", {
      content: newMessage,
      to: otherUserId,
      from: adminId,
      conversationId: selectedConversation.id,
    });

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      return newMode;
    });
    setShowSettings(false);
  };

  if (error && !adminId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-100">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`h-screen w-full overflow-hidden relative ${
        isDarkMode ? "text-gray-300 bg-gray-900" : "text-gray-800 bg-gray-100"
      }`}
      style={{
        fontFamily: "sans-serif",
        backgroundImage: "url('/logo.white.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundBlendMode: isDarkMode ? "overlay" : "soft-light",
      }}
    >
      <Toaster position="top-right" />
      <div className="relative z-10 h-full flex">
        <div className="w-1/3 border-r border-gray-300 dark:border-gray-700 p-4 overflow-y-auto">
          <div
            className={`rounded-lg flex items-center pl-4 py-2 mb-4 ${
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
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
              placeholder="Search users or conversations..."
              className={`bg-transparent border-none outline-none w-full ${
                isDarkMode ? "text-gray-300 placeholder-gray-500" : "text-gray-700 placeholder-gray-400"
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading && <p className="text-center text-gray-500">Loading...</p>}
          {isCreating && <p className="text-center text-gray-500">Creating conversation...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          {searchQuery ? (
            searchResults.length > 0 ? (
              searchResults.map((result) =>
                "role" in result ? (
                  <div
                    key={`user-${result.id}`}
                    className={`p-3 hover:${
                      isDarkMode ? "bg-gray-700" : "bg-gray-200"
                    } cursor-pointer rounded-lg`}
                    onClick={() => createNewConversation(result.id)}
                  >
                    <p className="font-semibold">{result.fullName}</p>
                    <p className="text-sm text-gray-500">{result.email}</p>
                  </div>
                ) : (
                  <div
                    key={`conversation-${result.id}`}
                    className={`p-3 hover:${
                      isDarkMode ? "bg-gray-700" : "bg-gray-200"
                    } cursor-pointer rounded-lg ${
                      selectedConversation?.id === result.id ? "bg-blue-200" : ""
                    }`}
                    onClick={() => setSelectedConversation(result as Conversation)}
                  >
                    <p className="font-semibold">
                      {result.participant1.id === adminId
                        ? result.participant2.fullName
                        : result.participant1.fullName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {result.messages?.[0]?.content || "No messages yet"}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-600">
                        {new Date(result.updatedAt).toLocaleDateString()}
                      </p>
                      {result.unread > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {result.unread}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )
            ) : (
              <p className="text-center text-gray-500">No results found</p>
            )
          ) : conversations.length > 0 ? (
            conversations.map((conv) => (
              <div
                key={`conversation-${conv.id}`}
                className={`p-3 hover:${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                } cursor-pointer rounded-lg ${
                  selectedConversation?.id === conv.id ? "bg-blue-200" : ""
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <p className="font-semibold">
                  {conv.participant1.id === adminId
                    ? conv.participant2.fullName
                    : conv.participant1.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  {conv.messages?.[0]?.content || "No messages yet"}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-600">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                  {conv.unread > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No conversations available</p>
          )}
        </div>

        <div className="w-2/3 flex flex-col h-full">
          {selectedConversation ? (
            <>
              <div
                className={`p-4 border-b ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <p className="font-semibold">
                  {selectedConversation.participant1.id === adminId
                    ? selectedConversation.participant2.fullName
                    : selectedConversation.participant1.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedConversation.participant1.id === adminId
                    ? selectedConversation.participant2.email
                    : selectedConversation.participant1.email}
                </p>
              </div>
              <div
                className={`flex-1 p-4 overflow-y-auto ${
                  isDarkMode ? "bg-gray-800" : "bg-gray-50"
                }`}
              >
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500">No messages yet</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-3 flex w-full ${
                        message.senderId === adminId ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[60%] p-3 rounded-lg shadow-sm ${
                          message.senderId === adminId
                            ? "bg-green-500 text-white rounded-br-none"
                            : isDarkMode
                            ? "bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600"
                            : "bg-gray-200 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p
                          className={`text-xs mt-1 text-right ${
                            message.senderId === adminId
                              ? "text-gray-100"
                              : isDarkMode
                              ? "text-gray-400"
                              : "text-gray-600"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div
                className={`p-4 border-t ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className={`flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-200 border-gray-600"
                        : "bg-white text-gray-800 border-gray-300"
                    }`}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button
                    onClick={sendMessage}
                    className={`p-3 ${
                      isDarkMode
                        ? "text-blue-400 hover:text-blue-300"
                        : "text-blue-500 hover:text-blue-600"
                    }`}
                    disabled={!newMessage.trim()}
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">Select a conversation to start chatting</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className={`absolute top-4 right-4 p-2 rounded-full ${
            isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-200"
          }`}
        >
          <FontAwesomeIcon icon={faGear} />
        </button>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`p-6 rounded-lg shadow-xl w-80 ${
              isDarkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"
            }`}
          >
            <h3 className="text-lg font-semibold mb-4">Settings</h3>
            <div className="mb-4 flex items-center justify-between">
              <label className="block text-sm font-medium">
                {isDarkMode ? "Dark Mode" : "Light Mode"}
              </label>
              <button
                onClick={toggleDarkMode}
                className={`p-2 focus:outline-none ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <FontAwesomeIcon
                  icon={isDarkMode ? faSun : faMoon}
                  className="text-xl"
                />
              </button>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className={`w-full py-2 mt-4 rounded-md ${
                isDarkMode
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatbox;