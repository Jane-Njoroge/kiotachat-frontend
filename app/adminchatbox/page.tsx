
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faMoon, faSun, faEllipsisV, faEdit, faTrash, faShare } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import io, { Socket } from "socket.io-client";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

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
  sender: User;
  createdAt: string;
  conversationId: string;
  isEdited: boolean;
}

interface Conversation {
  id: string;
  participant1: User;
  participant2: User;
  messages: Message[];
  unread: number;
  createdAt: string;
  updatedAt: string;
}

interface SocketError {
  message?: string;
}

const AdminChatbox: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initialize admin
  useEffect(() => {
    const storedAdminId = localStorage.getItem("userId")?.trim();
    const storedRole = localStorage.getItem("role");
    if (!storedAdminId || storedRole !== "ADMIN" || isNaN(parseInt(storedAdminId, 10))) {
      toast.error("Session expired. Please log in again.");
      router.push("/login");
      return;
    }
    setAdminId(storedAdminId);
  }, [router]);

  // Setup socket
  useEffect(() => {
    if (!adminId) return;

    axios.defaults.withCredentials = true;
    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002", {
      withCredentials: true,
      query: { userId: adminId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected, adminId:", adminId);
      socket.emit("register", { userId: parseInt(adminId, 10), role: "ADMIN" });
    });

    socket.on("connect_error", (err: Error) => {
      console.error("Socket connect error:", err.message);
      toast.error("Failed to connect to server");
    });

    socket.on("private message", (message: Message) => {
      const normalizedMessage: Message = {
        ...message,
        id: String(message.id),
        sender: { ...message.sender, id: String(message.sender.id) },
        conversationId: String(message.conversationId),
        isEdited: message.isEdited || false,
      };
      setConversations((prev) => {
        const exists = prev.find((conv) => conv.id === normalizedMessage.conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }
        return prev.map((conv) =>
          conv.id === normalizedMessage.conversationId
            ? {
                ...conv,
                messages: [
                  ...conv.messages.filter((m) => m.id !== normalizedMessage.id && !m.id.startsWith("temp-")),
                  normalizedMessage,
                ],
                unread: selectedConversation?.id === conv.id ? 0 : (conv.unread || 0) + 1,
                updatedAt: new Date().toISOString(),
              }
            : conv
        );
      });
      if (selectedConversation?.id === normalizedMessage.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages.filter((m) => m.id !== normalizedMessage.id && !m.id.startsWith("temp-")),
                  normalizedMessage,
                ],
                unread: 0,
              }
            : prev
        );
        scrollToBottom();
      }
    });

    socket.on("message updated", (updatedMessage: Message) => {
      const normalizedMessage: Message = {
        ...updatedMessage,
        id: String(updatedMessage.id),
        sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
        conversationId: String(updatedMessage.conversationId),
        isEdited: true,
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === normalizedMessage.conversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === normalizedMessage.id ? normalizedMessage : msg
                ),
              }
            : conv
        )
      );
      if (selectedConversation?.id === normalizedMessage.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === normalizedMessage.id ? normalizedMessage : msg
                ),
              }
            : prev
        );
      }
    });

    socket.on("conversation updated", (updatedConversation: Conversation) => {
      const normalizedConversation: Conversation = {
        ...updatedConversation,
        id: String(updatedConversation.id),
        participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
        participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
        messages: updatedConversation.messages.map((msg) => ({
          ...msg,
          id: String(msg.id),
          sender: { ...msg.sender, id: String(msg.sender.id) },
          isEdited: msg.isEdited || false,
        })),
        unread: updatedConversation.unread || 0,
      };
      setConversations((prev) => {
        const filtered = prev.filter((conv) => conv.id !== normalizedConversation.id);
        return [...filtered, normalizedConversation].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
      if (selectedConversation?.id === normalizedConversation.id) {
        setSelectedConversation(normalizedConversation);
        scrollToBottom();
      }
    });

    socket.on("error", (error: SocketError) => {
      toast.error(error.message || "Socket error");
    });

    return () => {
      socket.disconnect();
    };
  }, [adminId, selectedConversation]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuMessageId(null);
        setEditingMessageId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, [adminId]);

  const fetchConversations = async () => {
    if (!adminId) return;
    try {
      const response = await axios.get<Conversation[]>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        {
          params: { userId: adminId, role: "ADMIN" },
          headers: { "x-user-id": adminId },
          withCredentials: true,
        }
      );
      const uniqueConversations = Array.from(
        new Map(
          response.data.map((conv) => [
            conv.id,
            {
              ...conv,
              id: String(conv.id),
              participant1: { ...conv.participant1, id: String(conv.participant1.id) },
              participant2: { ...conv.participant2, id: String(conv.participant2.id) },
              messages: conv.messages.map((msg) => ({
                ...msg,
                id: String(msg.id),
                sender: { ...msg.sender, id: String(msg.sender.id) },
                conversationId: String(msg.conversationId),
                isEdited: msg.isEdited || false,
              })),
              unread: conv.unread || 0,
            },
          ])
        ).values()
      ).sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(uniqueConversations);
    } catch (error: unknown) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to fetch conversations. Please try again.");
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login");
      }
    }
  };

  // Fetch messages
  const fetchMessages = async (conversationId: string): Promise<Message[]> => {
    if (!adminId) return [];
    try {
      const response = await axios.get<Message[]>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages`,
        {
          params: { conversationId },
          headers: { "x-user-id": adminId },
          withCredentials: true,
        }
      );
      return response.data.map((msg) => ({
        ...msg,
        id: String(msg.id),
        sender: { ...msg.sender, id: String(msg.sender.id) },
        conversationId: String(msg.conversationId),
        isEdited: msg.isEdited || false,
      }));
    } catch (error: unknown) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to fetch messages");
      return [];
    }
  };

  // Search users
  useEffect(() => {
    if (!searchQuery.trim() || !adminId) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      try {
        const response = await axios.get<User[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/search/users`,
          {
            params: { query: searchQuery, excludeUserId: adminId },
            headers: { "x-user-id": adminId },
            withCredentials: true,
          }
        );
        setSearchResults(response.data.map((user) => ({ ...user, id: String(user.id) })));
      } catch (error: unknown) {
        console.error("Search failed:", error);
        toast.error("Search failed");
      }
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, adminId]);

  // Create conversation
  const createConversation = async (userId: string) => {
    if (!adminId) return;
    try {
      const response = await axios.post<Conversation>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        { participant1Id: adminId, participant2Id: userId },
        { headers: { "x-user-id": adminId }, withCredentials: true }
      );
      const newConv: Conversation = {
        ...response.data,
        id: String(response.data.id),
        participant1: { ...response.data.participant1, id: String(response.data.participant1.id) },
        participant2: { ...response.data.participant2, id: String(response.data.participant2.id) },
        messages: [],
        unread: 0,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
      };
      setConversations((prev) => {
        const filtered = prev.filter((conv) => conv.id !== newConv.id);
        return [newConv, ...filtered].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
      const messages = await fetchMessages(newConv.id);
      const updatedConv = { ...newConv, messages };
      setSelectedConversation(updatedConv);
      setSearchQuery("");
      setSearchResults([]);
      scrollToBottom();
    } catch (error: unknown) {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !socketRef.current || !adminId) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: newMessage,
      sender: {
        id: adminId,
        fullName: localStorage.getItem("fullName") || "Admin",
        email: localStorage.getItem("email") || "",
        role: "ADMIN",
      },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
      isEdited: false,
    };
    socketRef.current.emit("private message", {
      content: newMessage,
      to:
        selectedConversation.participant1.id === adminId
          ? selectedConversation.participant2.id
          : selectedConversation.participant1.id,
      from: adminId,
      conversationId: selectedConversation.id,
    });
    setSelectedConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev
    );
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, optimisticMessage],
              updatedAt: new Date().toISOString(),
            }
          : conv
      )
    );
    setNewMessage("");
    scrollToBottom();
  };

  // Edit message
  const editMessage = async (messageId: string, content: string) => {
    if (!adminId || !selectedConversation || !content.trim()) return;
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/${messageId}`,
        { content },
        { headers: { "x-user-id": adminId }, withCredentials: true }
      );
      setEditingMessageId(null);
      setEditedContent("");
      setMenuMessageId(null);
    } catch (error: unknown) {
      console.error("Failed to edit message:", error);
      toast.error("Failed to edit message");
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    if (!adminId || !selectedConversation) return;
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/${messageId}`, {
        headers: { "x-user-id": adminId },
        withCredentials: true,
      });
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                messages: conv.messages.filter((msg) => msg.id !== messageId),
              }
            : conv
        )
      );
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((msg) => msg.id !== messageId),
            }
          : prev
      );
      setMenuMessageId(null);
    } catch (error: unknown) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  // Forward message (placeholder)
  const forwardMessage = (messageId: string, content: string) => {
    console.log(`Forwarding message ${messageId}: ${content}`);
    toast.success("Forward functionality not implemented yet");
    setMenuMessageId(null);
  };

  // Toggle message menu
  const toggleMessageMenu = (messageId: string) => {
    setMenuMessageId(menuMessageId === messageId ? null : messageId);
    if (menuMessageId !== messageId) setEditingMessageId(null);
  };

  // Select conversation
  const selectConversation = async (conv: Conversation) => {
    const messages = await fetchMessages(conv.id);
    const updatedConversation = { ...conv, messages };
    setSelectedConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? updatedConversation : c))
    );
    setMenuMessageId(null);
    scrollToBottom();
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Toggle theme
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    localStorage.setItem("theme", !isDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  // Get partner name
  const getPartnerName = (conv: Conversation | null): string => {
    if (!conv || !adminId) return "Unknown";
    return conv.participant1.id === adminId ? conv.participant2.fullName : conv.participant1.fullName;
  };

  if (!adminId) return null;

  return (
    <div className={`h-screen flex ${isDarkMode ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gradient-to-b from-gray-100 to-gray-200"} text-gray-800 dark:text-gray-100 transition-colors duration-300`}>
      <Toaster />
      <div className={`w-1/3 border-r p-4 overflow-y-auto ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-inner`}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full p-3 mb-4 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            isDarkMode ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400" : "bg-gray-50 text-gray-800 border-gray-300 placeholder-gray-500"
          }`}
        />
        {searchResults.length > 0 ? (
          searchResults.map((result) => (
            <div
              key={result.id}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition flex items-center space-x-3"
              onClick={() => createConversation(result.id)}
            >
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                {result.fullName[0]?.toUpperCase() || "?"}
              </div>
              <span>{result.fullName}</span>
            </div>
          ))
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 cursor-pointer rounded-lg transition flex items-center space-x-3 ${
                selectedConversation?.id === conv.id
                  ? isDarkMode
                    ? "bg-blue-900"
                    : "bg-blue-100"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => selectConversation(conv)}
            >
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                {getPartnerName(conv)[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <span className={`font-medium ${conv.unread > 0 ? "font-bold" : ""}`}>
                  {getPartnerName(conv)}
                </span>
                <p className="text-sm truncate text-gray-500 dark:text-gray-400 max-w-[200px]">
                  {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
                </p>
              </div>
              {conv.unread > 0 && (
                <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs font-semibold">
                  {conv.unread}
                </span>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className={`p-4 border-b ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm flex items-center space-x-3`}>
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                {getPartnerName(selectedConversation)[0]?.toUpperCase() || "?"}
              </div>
              <h2 className="text-xl font-semibold">{getPartnerName(selectedConversation)}</h2>
            </div>
            <div className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} space-y-4`}>
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`relative flex ${msg.sender.id === adminId ? "justify-end" : "justify-start"} group`}
                  onClick={(e) => {
                    if (msg.sender.id === adminId && !menuRef.current?.contains(e.target as Node)) {
                      toggleMessageMenu(msg.id);
                    }
                  }}
                >
                  <div
                    className={`relative p-3 rounded-2xl max-w-[70%] transition-all ${
                      msg.sender.id === adminId
                        ? "bg-green-500 text-white"
                        : isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-white text-gray-800 shadow-md"
                    } ${msg.sender.id === adminId ? "hover:bg-green-600" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                  >
                    {editingMessageId === msg.id ? (
                      <div className="flex flex-col">
                        <input
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-800 border-gray-300"
                          }`}
                        />
                        <div className="mt-2 flex justify-end space-x-2">
                          <button
                            onClick={() => editMessage(msg.id, editedContent)}
                            className="text-green-400 hover:text-green-300"
                            aria-label="Save edit"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditedContent("");
                              setMenuMessageId(null);
                            }}
                            className="text-red-400 hover:text-red-300"
                            aria-label="Cancel edit"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="break-words">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {msg.isEdited && " (Edited)"}
                        </p>
                      </>
                    )}
                    {msg.sender.id === adminId && menuMessageId === msg.id && !editingMessageId && (
                      <div
                        ref={menuRef}
                        className={`absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 border w-32 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                      >
                        <button
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditedContent(msg.content);
                            setMenuMessageId(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <FontAwesomeIcon icon={faEdit} className="mr-2" /> Edit
                        </button>
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <FontAwesomeIcon icon={faTrash} className="mr-2" /> Delete
                        </button>
                        <button
                          onClick={() => forwardMessage(msg.id, msg.content)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <FontAwesomeIcon icon={faShare} className="mr-2" /> Forward
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.sender.id === adminId && !menuMessageId && !editingMessageId && (
                    <FontAwesomeIcon
                      icon={faEllipsisV}
                      className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100 transition"
                    />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className={`p-4 border-t flex items-center ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-inner`}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className={`flex-1 p-3 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  isDarkMode ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400" : "bg-gray-50 text-gray-800 border-gray-300 placeholder-gray-500"
                }`}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="ml-3 p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                aria-label="Send message"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-3 rounded-full ${isDarkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-gray-800 hover:bg-gray-300"} transition`}
        aria-label="Toggle theme"
      >
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
    </div>
  );
};

export default AdminChatbox;
