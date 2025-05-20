"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPaperPlane, faGear, faMoon, faSun, faSearch } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import io, { Socket } from "socket.io-client";
import toast, { Toaster } from "react-hot-toast";

config.autoAddCss = false;

interface User {
  id: string;
  fullName: string;
  email?: string;
  role: "ADMIN" | "USER";
}

interface Message {
  id: string;
  content: string;
  sender: { id: string; fullName: string; role: string };
  createdAt: string;
  conversationId: string;
}

interface Conversation {
  id: string;
  participant1: { id: string; fullName: string; email?: string; role: string };
  participant2: { id: string; fullName: string; email?: string; role: string };
  messages: Message[];
  unread?: number;
  createdAt: string;
  updatedAt: string;
}

const Chatbox: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(User | Conversation)[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [showSettings, setShowSettings] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/login");
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002", {
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      socket.emit("register", { userId, role: "USER" });
    });

    socket.on("private message", (message: Message) => {
      const normalizedMessage = {
        ...message,
        id: String(message.id),
        sender: { ...message.sender, id: String(message.sender.id) },
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                messages: [
                  ...conv.messages.filter((m) => !m.id.startsWith("temp")),
                  normalizedMessage,
                ],
                unread: selectedConversation?.id === message.conversationId ? 0 : (conv.unread || 0) + 1,
                updatedAt: new Date().toISOString(),
              }
            : conv
        )
      );
      if (selectedConversation?.id === message.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages.filter((m) => !m.id.startsWith("temp")),
                  normalizedMessage,
                ],
                unread: 0,
              }
            : prev
        );
        scrollToBottom();
      }
    });

    socket.on("conversation updated", (updatedConversation: Conversation) => {
      const normalizedConversation = {
        ...updatedConversation,
        id: String(updatedConversation.id),
        participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
        participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
        messages: updatedConversation.messages.map((msg) => ({
          ...msg,
          id: String(msg.id),
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
      }
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("Socket error:", message);
      toast.error(message);
    });

    socket.on("connect_error", (err: Error) => {
      console.error("Socket connection error:", err.message);
      toast.error("Failed to connect to server");
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, selectedConversation]);

  useEffect(() => {
    if (!userId) return;

    const fetchConversations = async () => {
      try {
        const response = await axios.get<Conversation[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
          {
            params: { userId, role: "USER", tab: activeTab },
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
            sender: { ...msg.sender, id: String(msg.sender.id) },
          })),
        }));
        setConversations(normalizedConversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
      }
    };

    fetchConversations();
  }, [userId, activeTab]);

  useEffect(() => {
    if (!searchQuery.trim() || !userId) {
      setSearchResults([]);
      return;
    }

    const fetchSearch = async () => {
      try {
        const [convRes, userRes] = await Promise.all([
          axios.get<Conversation[]>(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/search/conversations`,
            {
              params: { query: searchQuery, userId, role: "USER" },
              withCredentials: true,
            }
          ),
          axios.get<User[]>(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/search/users`,
            {
              params: { query: searchQuery, excludeUserId: userId },
              withCredentials: true,
            }
          ),
        ]);
        const normalizedUsers = userRes.data.map((user) => ({
          ...user,
          id: String(user.id),
        }));
        const normalizedConversations = convRes.data.map((conv) => ({
          ...conv,
          id: String(conv.id),
          participant1: { ...conv.participant1, id: String(conv.participant1.id) },
          participant2: { ...conv.participant2, id: String(conv.participant2.id) },
          messages: conv.messages.map((msg) => ({
            ...msg,
            id: String(msg.id),
            sender: { ...msg.sender, id: String(msg.sender.id) },
          })),
        }));
        setSearchResults([...normalizedUsers, ...normalizedConversations]);
      } catch (error) {
        console.error("Error searching:", error);
        toast.error("Failed to search");
      }
    };

    const debounce = setTimeout(fetchSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, userId]);

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await axios.get<Message[]>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages`,
        {
          params: { conversationId },
          withCredentials: true,
        }
      );
      return response.data.map((msg) => ({
        ...msg,
        id: String(msg.id),
        sender: { ...msg.sender, id: String(msg.sender.id) },
      }));
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
      return [];
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    const messages = await fetchMessages(conv.id);
    const updatedConversation = { ...conv, messages };
    setSelectedConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, messages, unread: 0 } : c))
    );
    if (conv.unread && conv.unread > 0 && socketRef.current) {
      socketRef.current.emit("conversation opened", { conversationId: conv.id });
    }
    scrollToBottom();
  };

  const startConversation = async (otherUserId: string) => {
    if (!userId || isNaN(parseInt(userId, 10)) || isNaN(parseInt(otherUserId, 10))) {
      toast.error("Invalid user ID");
      return;
    }
    try {
      setIsCreating(true);
      console.log("Starting conversation with:", { userId, otherUserId });

      const existingConversation = conversations.find(
        (conv) =>
          (conv.participant1.id === userId && conv.participant2.id === otherUserId) ||
          (conv.participant1.id === otherUserId && conv.participant2.id === userId)
      );

      if (existingConversation) {
        await handleSelectConversation(existingConversation);
      } else {
        const response = await axios.post<Conversation>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
          { participant1Id: parseInt(userId, 10), participant2Id: parseInt(otherUserId, 10) },
          { withCredentials: true }
        );
        const conversation = {
          ...response.data,
          id: String(response.data.id),
          participant1: { ...response.data.participant1, id: String(response.data.participant1.id) },
          participant2: { ...response.data.participant2, id: String(response.data.participant2.id) },
          messages: response.data.messages.map((msg) => ({
            ...msg,
            id: String(msg.id),
            sender: { ...msg.sender, id: String(msg.sender.id) },
          })),
        };
        setConversations((prev) => {
          if (prev.some((conv) => conv.id === conversation.id)) {
            return prev;
          }
          return [conversation, ...prev];
        });
        await handleSelectConversation(conversation);
      }
      setSearchQuery("");
      setSearchResults([]);
      toast.success("Conversation selected or started!");
    } catch (error: unknown) {
      console.error("Error starting conversation:", error);
      let message = "Failed to start conversation";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: { data?: { message?: string } } }).response &&
        "data" in (error as { response?: { data?: unknown } }).response!
      ) {
        message =
          ((error as { response: { data?: { message?: string } } }).response.data?.message) ||
          message;
      }
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !selectedConversation || !userId || !socketRef.current) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: message,
      sender: { id: userId, fullName: "User", role: "USER" },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
    };

    const otherUserId =
      selectedConversation.participant1.id === userId
        ? selectedConversation.participant2.id
        : selectedConversation.participant1.id;

    socketRef.current.emit("private message", {
      content: message,
      to: otherUserId,
      from: userId,
      conversationId: selectedConversation.id,
    });

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, optimisticMessage],
              unread: 0,
              updatedAt: new Date().toISOString(),
            }
          : conv
      )
    );
    setSelectedConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, optimisticMessage],
            unread: 0,
            updatedAt: new Date().toISOString(),
          }
        : prev
    );
    setMessage("");
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col bg-[url('/logo.white.svg')] bg-no-repeat bg-center bg-contain">
      <Toaster position="top-right" />
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
            <button onClick={handleBack} className="text-gray-600 dark:text-gray-300">
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedConversation.participant1.id === userId
                ? selectedConversation.participant2.fullName
                : selectedConversation.participant1.fullName}
            </p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
            {selectedConversation.messages.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">Start chatting</p>
            ) : (
              selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 flex w-full ${
                    msg.sender.id === userId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[60%] p-3 rounded-lg shadow-sm ${
                      msg.sender.id === userId
                        ? "bg-green-500 text-white rounded-br-none"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 text-right ${
                        msg.sender.id === userId
                          ? "text-gray-100"
                          : theme === "dark"
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
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
          <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[#005555] bg-white dark:bg-gray-700 dark:text-gray-100"
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="p-3 text-[#005555] dark:text-[#00a1a1] hover:text-[#004444] dark:hover:text-[#008080]"
                disabled={!message.trim()}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users or conversations..."
                  className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[#005555] bg-white dark:bg-gray-700 dark:text-gray-100"
                />
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute mt-2 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10">
                  {isCreating && <p className="p-3 text-gray-500 dark:text-gray-400">Creating conversation...</p>}
                  {searchResults.map((result) =>
                    "role" in result ? (
                      <button
                        key={`user-${result.id}`}
                        onClick={() => startConversation(result.id)}
                        className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                      >
                        {result.fullName} ({result.role})
                      </button>
                    ) : (
                      <button
                        key={`conversation-${result.id}`}
                        onClick={() => handleSelectConversation(result as Conversation)}
                        className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                      >
                        {((result as Conversation).participant1.id === userId
                          ? (result as Conversation).participant2.fullName
                          : (result as Conversation).participant1.fullName) || "User"} (Conversation)
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setShowSettings(true)} className="text-gray-600 dark:text-gray-300">
              <FontAwesomeIcon icon={faGear} />
            </button>
          </div>
          <div className="flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-md text-sm font-semibold ${
                activeTab === "all"
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-4 py-2 rounded-md text-sm font-semibold ${
                activeTab === "unread"
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Unread
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900">
            {conversations.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
                Search for a user to start a conversation
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {conv.participant1.id === userId
                        ? conv.participant2.fullName
                        : conv.participant1.fullName}
                    </p>
                    {conv.messages.length > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {conv.messages[conv.messages.length - 1].content}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {conv.messages.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(conv.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {conv.unread && conv.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Settings
            </h3>
            <div className="mb-4 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                {theme === "light" ? "Light Mode" : "Dark Mode"}
              </label>
              <button
                onClick={toggleTheme}
                className="p-2 focus:outline-none text-gray-600 dark:text-gray-300"
              >
                <FontAwesomeIcon
                  icon={theme === "light" ? faMoon : faSun}
                  className="text-xl"
                />
              </button>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 mt-4 bg-[#005555] dark:bg-gray-700 text-white rounded-md hover:bg-[#004444] dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbox;