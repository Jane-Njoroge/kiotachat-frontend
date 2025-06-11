// app/userchatbox/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faMoon,
  faSun,
  faArrowLeft,
  faEllipsisV,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import io, { Socket } from "socket.io-client";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import DOMPurify from "dompurify";

config.autoAddCss = false;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002";

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
  isDeleted?: boolean;
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

const Chatbox: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [showChatMessages, setShowChatMessages] = useState(false);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch user data from /me endpoint
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/me`, {
          withCredentials: true,
        });
        const { userId, role, fullName } = response.data;
        console.log("Fetched user:", { userId, role, fullName });

        if (role !== "USER") {
          console.error("Role mismatch, redirecting to login");
          toast.error("Unauthorized access");
          router.push("/login");
          return;
        }

        setUserId(userId);
        setRole(role);
        localStorage.setItem("fullName", fullName);
      } catch (error: unknown) {
        console.error("Error fetching user:", error);
        toast.error("Authentication failed");
        router.push("/login");
      }
    };
    fetchUser();
  }, [router]);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") === "dark";
    setIsDarkMode(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme);
  }, []);

  // Define fetchConversations before socket useEffect
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get<Conversation[]>(`${BACKEND_URL}/conversations`, {
        params: { userId, role: "USER" },
        headers: { "x-user-id": userId },
        withCredentials: true,
      });
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
                isDeleted: msg.isDeleted || false,
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
  }, [userId, router]);

  // Setup socket connection
  useEffect(() => {
    if (!userId || !role) return;

    axios.defaults.withCredentials = true;
    socketRef.current = io(BACKEND_URL, {
      withCredentials: true,
      query: { userId },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      transports: ["websocket", "polling"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected, userId:", userId);
      socket.emit("register", { userId: parseInt(userId, 10), role: "USER" });
    });

    socket.on("connect_error", (err: Error) => {
      console.error("Socket connect error:", {
        message: err.message,
        stack: err.stack,
        cause: err.cause,
        type: err.name,
        context: err,
      });
      toast.error("Failed to connect to server");
    });

    socket.on("private message", (message: Message) => {
      console.log("Received private message:", message);
      const normalizedMessage: Message = {
        ...message,
        id: String(message.id),
        sender: { ...message.sender, id: String(message.sender.id) },
        conversationId: String(message.conversationId),
        isEdited: message.isEdited || false,
        isDeleted: message.isDeleted || false,
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
      console.log("Received message updated:", updatedMessage);
      const normalizedMessage: Message = {
        ...updatedMessage,
        id: String(updatedMessage.id),
        sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
        conversationId: String(updatedMessage.conversationId),
        isEdited: true,
        isDeleted: updatedMessage.isDeleted || false,
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === normalizedMessage.conversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg) => (msg.id === normalizedMessage.id ? normalizedMessage : msg)),
              }
            : conv
        )
      );
      if (selectedConversation?.id === normalizedMessage.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((msg) => (msg.id === normalizedMessage.id ? normalizedMessage : msg)),
              }
            : prev
        );
      }
      setEditingMessageId(null);
      setEditedContent("");
      setMenuMessageId(null);
    });

    socket.on("message deleted", (deletedMessage: { id: string; conversationId: string; isDeleted: boolean }) => {
      console.log("Received message deleted:", deletedMessage);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === deletedMessage.conversationId
            ? {
                ...conv,
                messages: conv.messages.filter((msg) => msg.id !== deletedMessage.id),
              }
            : conv
        )
      );
      if (selectedConversation?.id === deletedMessage.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((msg) => msg.id !== deletedMessage.id),
              }
            : prev
        );
      }
      setMenuMessageId(null);
    });

    socket.on("conversation updated", (updatedConversation: Conversation) => {
      console.log("Received conversation updated:", updatedConversation);
      const normalizedConversation: Conversation = {
        ...updatedConversation,
        id: String(updatedConversation.id),
        participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
        participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
        messages: updatedConversation.messages.map((msg) => ({
          ...msg,
          id: String(msg.id),
          sender: { ...msg.sender, id: String(msg.sender.id) },
          conversationId: String(msg.conversationId),
          isEdited: msg.isEdited || false,
          isDeleted: msg.isDeleted || false,
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
      console.error("Socket error:", error);
      toast.error(error.message || "Socket error");
      if (error.message?.includes("Invalid userId") || error.message?.includes("validation failed")) {
        router.push("/login");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, role, selectedConversation, router, fetchConversations]);

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

  // Focus edit input when editing
  useEffect(() => {
    if (editingMessageId) {
      editInputRef.current?.focus();
    }
  }, [editingMessageId]);

  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId, fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages?.length]);

  // Search admins
  useEffect(() => {
    if (!searchQuery.trim() || !userId) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      try {
        const response = await axios.get<User[]>(`${BACKEND_URL}/search/users`, {
          params: { query: searchQuery, excludeUserId: userId, role: "ADMIN" },
          headers: { "x-user-id": userId },
          withCredentials: true,
        });
        setSearchResults(response.data.map((user) => ({ ...user, id: String(user.id) })));
      } catch (error: unknown) {
        console.error("Search failed:", error);
        toast.error("Failed to search admins");
      }
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, userId]);

  const fetchMessages = async (conversationId: string): Promise<Message[]> => {
    if (!userId) return [];
    try {
      const response = await axios.get<Message[]>(`${BACKEND_URL}/messages`, {
        params: { conversationId },
        headers: { "x-user-id": userId },
        withCredentials: true,
      });
      return response.data.map((msg) => ({
        ...msg,
        id: String(msg.id),
        sender: { ...msg.sender, id: String(msg.sender.id) },
        conversationId: String(msg.conversationId),
        isEdited: msg.isEdited || false,
        isDeleted: msg.isDeleted || false,
      }));
    } catch (error: unknown) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to fetch messages");
      return [];
    }
  };

  const selectOrCreateConversation = async (adminId: string) => {
    if (!userId) return;
    try {
      const existingConversation = conversations.find(
        (conv) =>
          (conv.participant1.id === userId && conv.participant2.id === adminId) ||
          (conv.participant1.id === adminId && conv.participant2.id === userId)
      );
      if (existingConversation) {
        const messages = await fetchMessages(existingConversation.id);
        const updatedConversation = { ...existingConversation, messages, unread: 0 };
        setSelectedConversation(updatedConversation);
        setConversations((prev) =>
          prev.map((conv) => (conv.id === existingConversation.id ? { ...conv, unread: 0 } : conv))
        );
        setShowChatMessages(true);
        setSearchQuery("");
        setSearchResults([]);
        scrollToBottom();
        try {
          await axios.post(
            `${BACKEND_URL}/conversations/${existingConversation.id}/read`,
            {},
            { withCredentials: true }
          );
        } catch (error) {
          console.error("Failed to mark conversation as read:", error);
        }
        return;
      }

      const response = await axios.post<Conversation>(
        `${BACKEND_URL}/conversations`,
        { participant1Id: userId, participant2Id: adminId },
        { headers: { "x-user-id": userId }, withCredentials: true }
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
      setShowChatMessages(true);
      setSearchQuery("");
      setSearchResults([]);
      scrollToBottom();
    } catch (error: unknown) {
      console.error("Failed to create or select conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !selectedConversation || !userId || !socketRef.current) return;

    const recipientId =
      selectedConversation.participant1.id === userId
        ? selectedConversation.participant2.id
        : selectedConversation.participant1.id;
    const tempMessageId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempMessageId,
      content: message,
      sender: {
        id: userId,
        fullName: localStorage.getItem("fullName") || "User",
        email: localStorage.getItem("email") || "",
        role: "USER",
      },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
      isEdited: false,
      isDeleted: false,
    };

    socketRef.current.emit("private message", {
      content: message,
      to: recipientId,
      from: userId,
      conversationId: selectedConversation.id,
    });

    setSelectedConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, tempMessage] } : prev
    );
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, tempMessage],
              updatedAt: new Date().toISOString(),
            }
          : conv
      )
    );

    setMessage("");
    scrollToBottom();
    inputRef.current?.focus();
  };

  const editMessage = async () => {
    if (!userId || !selectedConversation || !editingMessageId || !editedContent.trim()) return;
    console.log("Editing message:", {
      userId,
      messageId: editingMessageId,
      content: editedContent,
      conversationId: selectedConversation.id,
    });
    try {
      await axios.put(
        `${BACKEND_URL}/messages/${editingMessageId}`,
        { content: editedContent },
        { headers: { "x-user-id": userId }, withCredentials: true }
      );
      socketRef.current?.emit("message updated", {
        messageId: editingMessageId,
        content: editedContent,
        from: userId,
        conversationId: selectedConversation.id,
        to:
          selectedConversation.participant1.id === userId
            ? selectedConversation.participant2.id
            : selectedConversation.participant1.id,
      });
      setEditingMessageId(null);
      setEditedContent("");
      setMenuMessageId(null);
      toast.success("Message updated");
    } catch (error: unknown) {
      console.error("Failed to edit message:", error);
      toast.error("Failed to edit message");
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!userId || !selectedConversation) return;
    try {
      await axios.delete(`${BACKEND_URL}/messages/${messageId}`, {
        headers: { "x-user-id": userId },
        withCredentials: true,
      });
      socketRef.current?.emit("message deleted", {
        messageId,
        from: userId,
        conversationId: selectedConversation.id,
        to:
          selectedConversation.participant1.id === userId
            ? selectedConversation.participant2.id
            : selectedConversation.participant1.id,
      });
      setMenuMessageId(null);
      toast.success("Message deleted");
    } catch (error: unknown) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  const toggleMessageMenu = (messageId: string) => {
    setMenuMessageId(menuMessageId === messageId ? null : messageId);
    if (menuMessageId !== messageId) setEditingMessageId(null);
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    const messages = await fetchMessages(conversation.id);
    const updatedConversation = { ...conversation, messages, unread: 0 };
    setSelectedConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((conv) => (conv.id === conversation.id ? { ...conv, unread: 0 } : conv))
    );
    setShowChatMessages(true);
    setMenuMessageId(null);
    setSearchQuery("");
    setSearchResults([]);
    scrollToBottom();
    try {
      await axios.post(
        `${BACKEND_URL}/conversations/${conversation.id}/read`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
    }
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setShowChatMessages(false);
    setMenuMessageId(null);
    setEditingMessageId(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDarkMode);
  };

  const getPartnerName = (conv: Conversation | null): string => {
    if (!conv || !userId) return "Unknown";
    return conv.participant1.id === userId ? conv.participant2.fullName : conv.participant1.fullName;
  };

  const filteredConversations = tab === "ALL" ? conversations : conversations.filter((conv) => conv.unread > 0);

  if (!userId) return null;

  return (
    <div
      className={`flex flex-col h-screen ${isDarkMode ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gray-50"} text-gray-900 dark:text-gray-100 transition-colors duration-300`}
    >
      <Toaster />
      {!showChatMessages ? (
        <div className="flex-1 flex flex-col">
          <div
            className={`p-4 border-b ${isDarkMode ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm`}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Chats</h2>
              <button
                onClick={toggleDarkMode}
                aria-label="Toggle theme"
                className={`p-2 rounded-full ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"} transition`}
              >
                <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search admins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-2 mt-3 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                isDarkMode
                  ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
                  : "bg-white text-gray-900 border-gray-200 placeholder-gray-500"
              }`}
            />
            {searchResults.length > 0 && (
              <div
                className={`mt-2 rounded-lg shadow-lg ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"} border max-h-48 overflow-y-auto`}
              >
                {searchResults.map((admin) => (
                  <div
                    key={admin.id}
                    className={`flex items-center px-3 py-2 ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} cursor-pointer rounded-lg transition`}
                    onClick={() => selectOrCreateConversation(admin.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {admin.fullName[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="ml-2">{admin.fullName}</span>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div className="mt-2 text-gray-500 dark:text-gray-400 text-center">No admins found.</div>
            )}
            <div className="flex justify-between space-x-4 mt-4">
              <button
                onClick={() => setTab("ALL")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
                  tab === "ALL"
                    ? "bg-blue-500 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab("UNREAD")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
                  tab === "UNREAD"
                    ? "bg-blue-500 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Unread
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && !searchQuery ? (
              <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
                <p>{tab === "ALL" ? "No chats yet" : "No unread messages"}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`px-4 py-3 border-b cursor-pointer ${isDarkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-100"} transition-colors`}
                  onClick={() => handleConversationSelect(conv)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {getPartnerName(conv)[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h3
                          className={`text-sm font-semibold ${conv.unread > 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}
                        >
                          {getPartnerName(conv)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
                        </p>
                      </div>
                    </div>
                    {conv.unread > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen">
          <div
            className={`px-4 py-3 border-b sticky top-0 z-10 ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToConversations}
                className="p-2 rounded-full hover:bg-gray-600 dark:hover:bg-gray-200 transition-colors"
                aria-label="Back to conversations"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {getPartnerName(selectedConversation)?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-lg font-semibold">{getPartnerName(selectedConversation)}</span>
              </div>
            </div>
          </div>

          <div
            className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} space-y-2`}
          >
            {selectedConversation?.messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender.id === userId ? "justify-end" : "justify-start"} group relative`}
              >
                <div
                  className={`relative p-3 rounded-lg max-w-[70%] text-sm transition-colors ${
                    isDarkMode
                      ? msg.sender.id === userId
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                      : msg.sender.id === userId
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-white hover:bg-gray-200 shadow-sm"
                  }`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                          isDarkMode
                            ? "bg-gray-700 text-white border-gray-600"
                            : "bg-white text-gray-900 border-gray-200"
                        }`}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            editMessage();
                          }
                        }}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => editMessage()}
                          className="text-green-500 hover:text-green-600 text-sm"
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
                          className="text-red-500 hover:text-red-600 text-sm"
                          aria-label="Cancel edit"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(msg.content),
                        }}
                      />
                      <p className="text-xs mt-1 opacity-75 flex justify-end">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.isEdited && <span className="ml-2">Edited</span>}
                      </p>
                    </>
                  )}
                </div>
                {msg.sender.id === userId && (
                  <button
                    onClick={() => toggleMessageMenu(msg.id)}
                    className="absolute top-2 right-2 p-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-colors cursor-pointer"
                    aria-label="Toggle menu"
                  >
                    <FontAwesomeIcon icon={faEllipsisV} className="w-4 h-4" />
                  </button>
                )}
                {msg.sender.id === userId && menuMessageId === msg.id && !editingMessageId && (
                  <div
                    ref={menuRef}
                    className={`absolute top-full right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border ${
                      isDarkMode ? "border-gray-600" : "border-gray-200"
                    } z-10`}
                  >
                    <button
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setEditedContent(msg.content);
                        setMenuMessageId(null);
                      }}
                      className={`w-full px-4 py-2 text-sm flex items-center ${
                        isDarkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                      } transition-colors`}
                    >
                      <FontAwesomeIcon icon={faEdit} className="mr-2 w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className={`w-full px-4 py-2 text-sm flex items-center ${
                        isDarkMode ? "text-red-400 hover:bg-gray-700" : "text-red-600 hover:bg-gray-100"
                      } transition-colors`}
                    >
                      <FontAwesomeIcon icon={faTrash} className="mr-2 w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div
            className={`sticky bottom-0 p-4 border-t ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className={`flex-1 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  isDarkMode
                    ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
                    : "bg-white text-gray-900 border-gray-200 placeholder-gray-500"
                }`}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                aria-label="Send message"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbox;