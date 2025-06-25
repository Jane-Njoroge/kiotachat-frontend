// "use client";

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faPaperPlane,
//   faMoon,
//   faSun,
//   faArrowLeft,
//   faEllipsisV,
//   faEdit,
//   faTrash,
//   faPaperclip,
// } from "@fortawesome/free-solid-svg-icons";
// import "@fortawesome/fontawesome-svg-core/styles.css";
// import { config } from "@fortawesome/fontawesome-svg-core";
// import io, { Socket } from "socket.io-client";
// import axios, { AxiosError } from "axios";
// import { Toaster, toast } from "react-hot-toast";
// import DOMPurify from "dompurify";

// config.autoAddCss = false;

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kiotachat-backend-1.onrender.com";

// interface User {
//   id: string;
//   fullName: string;
//   email: string;
//   role: "ADMIN" | "USER";
// }

// interface Message {
//   id: string;
//   content: string;
//   sender: User;
//   createdAt: string;
//   conversationId: string;
//   isEdited: boolean;
//   isDeleted?: boolean;
//   fileUrl?: string;
//   fileType?: string;
//   fileSize?: number;
//   fileName?: string;
// }

// interface Conversation {
//   id: string;
//   participant1: User;
//   participant2: User;
//   messages: Message[];
//   unread: number;
//   createdAt: string;
//   updatedAt: string;
// }

// interface SocketError {
//   message?: string;
// }

// const Chatbox: React.FC = () => {
//   const [conversations, setConversations] = useState<Conversation[]>([]);
//   const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
//   const [message, setMessage] = useState("");
//   const [userId, setUserId] = useState<string | null>(null);
//   const [role, setRole] = useState<string | null>(null);
//   const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "light" ? false : true);
//   const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
//   const [editedContent, setEditedContent] = useState("");
//   const [showChatMessages, setShowChatMessages] = useState(false);
//   const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
//   const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchResults, setSearchResults] = useState<User[]>([]);
//   const socketRef = useRef<Socket | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const editInputRef = useRef<HTMLInputElement>(null);
//   const menuRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const router = useRouter();

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const response = await axios.get(`${BACKEND_URL}/me`, {
//           withCredentials: true,
//           timeout: 10000,
//         });
//         const { userId, role, fullName } = response.data;
//         console.log("Fetched user:", { userId, role, fullName });

//         if (role !== "USER") {
//           console.error("Role mismatch, redirecting to login");
//           toast.error("Unauthorized access", { duration: 3000 });
//           router.push("/login");
//           return;
//         }

//         setUserId(userId);
//         setRole(role);
//         localStorage.setItem("fullName", fullName);
//       } catch (error: unknown) {
//         console.error("Error fetching user:", error);
//         toast.error("Authentication failed. Please try again.", { duration: 3000 });
//         router.push("/login");
//       }
//     };
//     fetchUser();
//   }, [router]);

//   useEffect(() => {
//     const savedTheme = localStorage.getItem("theme") === "light";
//     setIsDarkMode(!savedTheme);
//     document.documentElement.classList.toggle("dark", !savedTheme);
//   }, []);

//   const fetchConversations = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const response = await axios.get<Conversation[]>(`${BACKEND_URL}/conversations`, {
//         params: { userId, role: "USER" },
//         withCredentials: true,
//         timeout: 10000,
//       });
//       const uniqueConversations = Array.from(
//         new Map(
//           response.data.map((conv) => [
//             conv.id,
//             {
//               ...conv,
//               id: String(conv.id),
//               participant1: { ...conv.participant1, id: String(conv.participant1.id) },
//               participant2: { ...conv.participant2, id: String(conv.participant2.id) },
//               messages: conv.messages.map((msg) => ({
//                 ...msg,
//                 id: String(msg.id),
//                 sender: { ...msg.sender, id: String(msg.sender.id) },
//                 conversationId: String(msg.conversationId),
//                 isEdited: msg.isEdited || false,
//                 isDeleted: msg.isDeleted || false,
//                 fileUrl: msg.fileUrl || undefined,
//                 fileType: msg.fileType || undefined,
//                 fileSize: msg.fileSize || undefined,
//                 fileName: msg.fileName || undefined,
//               })),
//               unread: conv.unread || 0,
//             },
//           ])
//         ).values()
//       ).sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
//       setConversations(uniqueConversations);
//     } catch (error: unknown) {
//       console.error("Failed to fetch conversations:", error);
//       toast.error("Failed to load chats. Please try again.", { duration: 3000 });
//       if (axios.isAxiosError(error) && error.response?.status === 401) {
//         toast.error("Session expired. Please log in.", { duration: 4000 });
//         router.push("/login");
//       }
//     }
//   }, [userId, router]);

//   useEffect(() => {
//     if (!userId || !role) return;

//     axios.defaults.withCredentials = true;
//     socketRef.current = io(BACKEND_URL, {
//       withCredentials: true,
//       query: { userId },
//       reconnection: true,
//       reconnectionAttempts: 3,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       randomizationFactor: 0.5,
//       transports: ["websocket"],
//     });

//     const socket = socketRef.current;

//     socket.on("connect", () => {
//       console.log("Socket connected, userId:", userId);
//       socket.emit("register", { userId: parseInt(userId, 10), role: "USER" });
//     });

//     socket.on("connect_error", (err: Error) => {
//       console.error("Socket connect error:", {
//         message: err.message,
//         stack: err.stack,
//         userId,
//       });
//       toast.error("Failed to connect to server", { duration: 3000 });
//     });

//     socket.on("private message", (message: Message) => {
//       console.log("Received private message:", message);
//       const normalizedMessage: Message = {
//         ...message,
//         id: String(message.id),
//         sender: { ...message.sender, id: String(message.sender.id) },
//         conversationId: String(message.conversationId),
//         isEdited: message.isEdited || false,
//         isDeleted: message.isDeleted || false,
//         fileUrl: message.fileUrl || undefined,
//         fileType: message.fileType || undefined,
//         fileSize: message.fileSize || undefined,
//         fileName: message.fileName || undefined,
//       };
//       setConversations((prev) => {
//         const exists = prev.find((conv) => conv.id === normalizedMessage.conversationId);
//         if (!exists) {
//           fetchConversations();
//           return prev;
//         }
//         return prev.map((conv) =>
//           conv.id === normalizedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.map((m) => m.id === normalizedMessage.id ? normalizedMessage : m),
//                 unread: selectedConversation?.id === conv.id ? 0 : (conv.unread || 0) + 1,
//                 updatedAt: new Date().toISOString(),
//               }
//             : conv
//         );
//       });
//       if (selectedConversation?.id === normalizedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.map((m) => m.id === normalizedMessage.id ? normalizedMessage : m),
//                 unread: 0,
//               }
//             : prev
//         );
//         scrollToBottom();
//       }
//     });

//     socket.on("message updated", (updatedMessage: Message) => {
//       console.log("Received updated message:", updatedMessage);
//       const normalizedMessage: Message = {
//         ...updatedMessage,
//         id: String(updatedMessage.id),
//         sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
//         conversationId: String(updatedMessage.conversationId),
//         isEdited: true,
//         isDeleted: updatedMessage.isDeleted || false,
//         fileUrl: updatedMessage.fileUrl || undefined,
//         fileType: updatedMessage.fileType || undefined,
//         fileSize: updatedMessage.fileSize || undefined,
//         fileName: updatedMessage.fileName || undefined,
//       };
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === normalizedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.map((msg) => (msg.id === normalizedMessage.id ? normalizedMessage : msg)),
//               }
//             : conv
//         )
//       );
//       if (selectedConversation?.id === normalizedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.map((msg) => (msg.id === normalizedMessage.id ? normalizedMessage : msg)),
//               }
//             : prev
//         );
//       }
//       setEditingMessageId(null);
//       setEditedContent("");
//       setMenuMessageId(null);
//     });

//     socket.on("message deleted", (deletedMessage: { id: string; conversationId: string; isDeleted: boolean }) => {
//       console.log("Received message deleted:", deletedMessage);
//       const normalizedDeletedMessage = {
//         ...deletedMessage,
//         id: String(deletedMessage.id),
//         conversationId: String(deletedMessage.conversationId),
//         isDeleted: deletedMessage.isDeleted || true,
//       };
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === normalizedDeletedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.filter((msg) => msg.id !== normalizedDeletedMessage.id),
//               }
//             : conv
//         )
//       );
//       if (selectedConversation?.id === normalizedDeletedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.filter((msg) => msg.id !== normalizedDeletedMessage.id),
//               }
//             : prev
//         );
//       }
//       setMenuMessageId(null);
//     });

//     socket.on("conversation updated", (updatedConversation: Conversation) => {
//       console.log("Received conversation updated:", updatedConversation);
//       const normalizedConversation: Conversation = {
//         ...updatedConversation,
//         id: String(updatedConversation.id),
//         participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
//         participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
//         messages: updatedConversation.messages.map((msg) => ({
//           ...msg,
//           id: String(msg.id),
//           sender: { ...msg.sender, id: String(msg.sender.id) },
//           conversationId: String(msg.conversationId),
//           isEdited: msg.isEdited || false,
//           isDeleted: msg.isDeleted || false,
//           fileUrl: msg.fileUrl || undefined,
//           fileType: msg.fileType || undefined,
//           fileSize: msg.fileSize || undefined,
//           fileName: msg.fileName || undefined,
//         })),
//         unread: updatedConversation.unread || 0,
//       };
//       setConversations((prev) => {
//         const filtered = prev.filter((conv) => conv.id !== normalizedConversation.id);
//         return [...filtered, normalizedConversation].sort(
//           (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//         );
//       });

//       if (selectedConversation?.id === normalizedConversation.id) {
//         setSelectedConversation(normalizedConversation);
//         scrollToBottom();
//       }
//     });

//     socket.on("error", (error: SocketError) => {
//       console.error("Socket error:", error);
//       toast.error(error.message || "Connection error", { duration: 3000 });
//       if (error.message?.includes("Invalid userId") || error.message?.includes("validation failed")) {
//         router.push("/login");
//       }
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, [userId, role, selectedConversation, router, fetchConversations]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
//         setMenuMessageId(null);
//         setEditingMessageId(null);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   useEffect(() => {
//     if (editingMessageId) {
//       editInputRef.current?.focus();
//     }
//   }, [editingMessageId]);

//   useEffect(() => {
//     if (userId) {
//       fetchConversations();
//     }
//   }, [userId, fetchConversations]);

//   useEffect(() => {
//     scrollToBottom();
//   }, [selectedConversation?.messages?.length]);

//   useEffect(() => {
//     if (!searchQuery.trim() || !userId) {
//       setSearchResults([]);
//       return;
//     }
//     const search = async () => {
//       try {
//         const response = await axios.get<User[]>(`${BACKEND_URL}/search/users`, {
//           params: { query: searchQuery, excludeUserId: userId, role: "ADMIN" },
//           withCredentials: true,
//           timeout: 10000,
//         });
//         setSearchResults(response.data.map((user) => ({ ...user, id: String(user.id) })));
//       } catch (error: unknown) {
//         console.error("Search failed:", error);
//         toast.error("Failed to find admins", { duration: 3000 });
//       }
//     };
//     const timeout = setTimeout(search, 300);
//     return () => clearTimeout(timeout);
//   }, [searchQuery, userId]);

//   const fetchMessages = async (conversationId: string): Promise<Message[]> => {
//     if (!userId) return [];
//     try {
//       const response = await axios.get<Message[]>(`${BACKEND_URL}/messages`, {
//         params: { conversationId },
//         withCredentials: true,
//         timeout: 10000,
//       });
//       return response.data.map((msg) => ({
//         ...msg,
//         id: String(msg.id),
//         sender: { ...msg.sender, id: String(msg.sender.id) },
//         conversationId: String(msg.conversationId),
//         isEdited: msg.isEdited || false,
//         isDeleted: msg.isDeleted || false,
//         fileUrl: msg.fileUrl || undefined,
//         fileType: msg.fileType || undefined,
//         fileSize: msg.fileSize || undefined,
//         fileName: msg.fileName || undefined,
//       }));
//     } catch (error: unknown) {
//       console.error("Failed to fetch messages:", error);
//       toast.error("Failed to load messages", { duration: 3000 });
//       return [];
//     }
//   };

//   const selectOrCreateConversation = async (adminId: string) => {
//     if (!userId) return;
//     try {
//       const existingConversation = conversations.find(
//         (conv) =>
//           (conv.participant1.id === userId && conv.participant2.id === adminId) ||
//           (conv.participant1.id === adminId && conv.participant2.id === userId)
//       );
//       if (existingConversation) {
//         const messages = await fetchMessages(existingConversation.id);
//         const updatedConversation = { ...existingConversation, messages, unread: 0 };
//         setSelectedConversation(updatedConversation);
//         setConversations((prev) =>
//           prev.map((conv) => (conv.id === existingConversation.id ? { ...conv, unread: 0 } : conv))
//         );
//         setShowChatMessages(true);
//         setSearchQuery("");
//         setSearchResults([]);
//         scrollToBottom();
//         try {
//           await axios.post(
//             `${BACKEND_URL}/conversations/${existingConversation.id}/read`,
//             { userId },
//             { withCredentials: true }
//           );
//         } catch (error: unknown) {
//           console.error("Failed to mark conversation as read:", error);
//           toast.error("Failed to mark as read", { duration: 3000 });
//         }
//         return;
//       }

//       const response = await axios.post<Conversation>(
//         `${BACKEND_URL}/conversations`,
//         { participant1Id: userId, participant2Id: adminId },
//         { withCredentials: true, timeout: 10000 }
//       );
//       const newConv: Conversation = {
//         ...response.data,
//         id: String(response.data.id),
//         participant1: { ...response.data.participant1, id: String(response.data.participant1.id) },
//         participant2: { ...response.data.participant2, id: String(response.data.participant2.id) },
//         messages: [],
//         unread: 0,
//         createdAt: response.data.createdAt,
//         updatedAt: response.data.updatedAt,
//       };
//       setConversations((prev) => {
//         const filtered = prev.filter((conv) => conv.id !== newConv.id);
//         return [newConv, ...filtered].sort(
//           (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//         );
//       });
//       const messages = await fetchMessages(newConv.id);
//       const updatedConv = { ...newConv, messages };
//       setSelectedConversation(updatedConv);
//       setShowChatMessages(true);
//       setSearchQuery("");
//       setSearchResults([]);
//       scrollToBottom();
//     } catch (error: unknown) {
//       console.error("Failed to start conversation:", error);
//       toast.error("Failed to start chat", { duration: 3000 });
//     }
//   };

//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file || !selectedConversation || !userId || !socketRef.current) return;

//     const allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
//     const maxSize = 5 * 1024 * 1024; // 5MB
//     if (!allowedTypes.includes(file.type)) {
//       toast.error("Only PNG, JPEG, GIF, or PDF files allowed", { duration: 3000 });
//       return;
//     }
//     if (file.size > maxSize) {
//       toast.error("File size must be less than 5MB", { duration: 3000 });
//       return;
//     }

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append(
//       "to",
//       selectedConversation.participant1.id === userId
//         ? selectedConversation.participant2.id
//         : selectedConversation.participant1.id
//     );
//     formData.append("conversationId", selectedConversation.id);

//     try {
//       const response = await axios.post(`${BACKEND_URL}/upload-file`, formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//         withCredentials: true,
//         timeout: 15000,
//       });
//       const { fileUrl, fileType, fileSize, fileName, messageId } = response.data.data || {};
//       if (!fileUrl || !messageId) {
//         throw new Error("File upload response missing fileUrl or messageId");
//       }

//       const newMessage: Message = {
//         id: messageId,
//         content: "File message",
//         sender: {
//           id: userId,
//           fullName: localStorage.getItem("fullName") || "User",
//           email: localStorage.getItem("email") || "",
//           role: "USER",
//         },
//         createdAt: new Date().toISOString(),
//         conversationId: selectedConversation.id,
//         isEdited: false,
//         isDeleted: false,
//         fileUrl,
//         fileType,
//         fileSize,
//         fileName,
//       };

//       const recipientId =
//         selectedConversation.participant1.id === userId
//           ? selectedConversation.participant2.id
//           : selectedConversation.participant1.id;
//       socketRef.current.emit("private message", {
//         content: "File message",
//         to: recipientId,
//         from: userId,
//         conversationId: selectedConversation.id,
//         fileUrl,
//         fileType,
//         fileSize,
//         fileName,
//       });

//       setSelectedConversation((prev) =>
//         prev ? { ...prev, messages: [...prev.messages, newMessage] } : prev
//       );
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === selectedConversation.id
//             ? { ...conv, messages: [...conv.messages, newMessage], updatedAt: new Date().toISOString() }
//             : conv
//         )
//       );
//       scrollToBottom();

//       if (fileInputRef.current) {
//         fileInputRef.current.value = "";
//       }
//     } catch (error: unknown) {
//       console.error("Failed to upload file:", error);
//       toast.error(
//         axios.isAxiosError(error) ? error.response?.data?.message || "Failed to upload file" : "Failed to upload file",
//         { duration: 3000 }
//       );
//       if (fileInputRef.current) {
//         fileInputRef.current.value = "";
//       }
//     }
//   };

//   const sendMessage = () => {
//     if (!message.trim() || !selectedConversation || !userId || !socketRef.current) return;

//     const recipientId =
//       selectedConversation.participant1.id === userId
//         ? selectedConversation.participant2.id
//         : selectedConversation.participant1.id;
//     const tempMessageId = `temp-${Date.now()}`;
//     const tempMessage: Message = {
//       id: tempMessageId,
//       content: message,
//       sender: {
//         id: userId,
//         fullName: localStorage.getItem("fullName") || "User",
//         email: localStorage.getItem("email") || "",
//         role: "USER",
//       },
//       createdAt: new Date().toISOString(),
//       conversationId: selectedConversation.id,
//       isEdited: false,
//       isDeleted: false,
//     };

//     socketRef.current.emit("private message", {
//       content: message,
//       to: recipientId,
//       from: userId,
//       conversationId: selectedConversation.id,
//     });

//     setSelectedConversation((prev) =>
//       prev ? { ...prev, messages: [...prev.messages, tempMessage] } : prev
//     );
//     setConversations((prev) =>
//       prev.map((conv) =>
//         conv.id === selectedConversation.id
//           ? {
//               ...conv,
//               messages: [...conv.messages, tempMessage],
//               updatedAt: new Date().toISOString(),
//             }
//           : conv
//       )
//     );

//     setMessage("");
//     scrollToBottom();
//     inputRef.current?.focus();
//   };

//   const editMessage = async () => {
//     if (!userId || !selectedConversation || !editingMessageId || !editedContent.trim()) return;
//     console.log("Editing message:", {
//       userId,
//       messageId: editingMessageId,
//       content: editedContent,
//       conversationId: selectedConversation.id,
//     });
//     try {
//       await axios.put(
//         `${BACKEND_URL}/messages/${editingMessageId}`,
//         { content: editedContent },
//         { withCredentials: true, timeout: 10000 }
//       );
//       socketRef.current?.emit("message updated", {
//         messageId: editingMessageId,
//         content: editedContent,
//         from: userId,
//         conversationId: selectedConversation.id,
//         to:
//           selectedConversation.participant1.id === userId
//             ? selectedConversation.participant2.id
//             : selectedConversation.participant1.id,
//       });
//       setEditingMessageId(null);
//       setEditedContent("");
//       setMenuMessageId(null);
//       toast.success("Message updated", { duration: 3000 });
//     } catch (error: unknown) {
//       console.error("Failed to edit message:", error);
//       toast.error("Failed to edit message", { duration: 3000 });
//     }
//   };

//   const deleteMessage = async (messageId: string) => {
//     if (!userId || !selectedConversation) return;
//     try {
//       await axios.delete(`${BACKEND_URL}/messages/${messageId}`, {
//         withCredentials: true,
//         timeout: 10000,
//       });
//       socketRef.current?.emit("message deleted", {
//         messageId,
//         from: userId,
//         conversationId: selectedConversation.id,
//         to:
//           selectedConversation.participant1.id === userId
//             ? selectedConversation.participant2.id
//             : selectedConversation.participant1.id,
//       });
//       setMenuMessageId(null);
//       toast.success("Message deleted", { duration: 3000 });
//     } catch (error: unknown) {
//       console.error("Failed to delete message:", error);
//       toast.error("Failed to delete message", { duration: 3000 });
//     }
//   };

//   const toggleMessageMenu = (messageId: string) => {
//     setMenuMessageId(menuMessageId === messageId ? null : messageId);
//     if (menuMessageId !== messageId) setEditingMessageId(null);
//   };

//   const handleConversationSelect = async (conversation: Conversation) => {
//     if (!conversation?.id || !userId) {
//       toast.error("Invalid conversation selected", { duration: 3000 });
//       return;
//     }
//     const convId = String(conversation.id);
//     if (!convId.match(/^\d+$/)) {
//       toast.error("Invalid conversation ID format", { duration: 3000 });
//       return;
//     }
//     console.log("Selecting conversation:", { convId, type: typeof convId, userId });
//     try {
//       const messages = await fetchMessages(convId);
//       const updatedConversation = { ...conversation, id: convId, messages, unread: 0 };
//       setSelectedConversation(updatedConversation);
//       setConversations((prev) =>
//         prev.map((conv) => (conv.id === convId ? { ...conv, unread: 0 } : conv))
//       );
//       setShowChatMessages(true);
//       setMenuMessageId(null);
//       setSearchQuery("");
//       setSearchResults([]);
//       scrollToBottom();
//       await axios.post(
//         `${BACKEND_URL}/conversations/${convId}/read`,
//         { userId },
//         { withCredentials: true, timeout: 10000 }
//       );
//     } catch (error: unknown) {
//       let errorMessage = "Failed to load conversation";
//       if (error instanceof AxiosError) {
//         errorMessage = error.response?.data?.message || errorMessage;
//         if (error.response?.status === 401) {
//           toast.error("Session expired. Please log in", { duration: 4000 });
//           setTimeout(() => router.push("/login"), 2000);
//           return;
//         }
//       } else if (error instanceof Error) {
//         errorMessage = error.message;
//       }
//       toast.error(errorMessage, { duration: 3000 });
//       if (process.env.NODE_ENV === "development") {
//         console.error("Error in handleConversationSelect:", error);
//       }
//       setShowChatMessages(true);
//       scrollToBottom();
//     }
//   };

//   const handleBackToConversations = () => {
//     setSelectedConversation(null);
//     setShowChatMessages(false);
//     setMenuMessageId(null);
//     setEditingMessageId(null);
//     setSearchQuery("");
//     setSearchResults([]);
//   };

//   const scrollToBottom = () => {
//     setTimeout(() => {
//       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     }, 100);
//   };

//   const toggleDarkMode = () => {
//     setIsDarkMode((prev) => {
//       const newMode = !prev;
//       localStorage.setItem("theme", newMode ? "dark" : "light");
//       document.documentElement.classList.toggle("dark", newMode);
//       return newMode;
//     });
//   };

//   const getPartnerName = (conv: Conversation | null): string => {
//     if (!conv || !userId) return "Unknown";
//     return conv.participant1.id === userId ? conv.participant2.fullName : conv.participant1.fullName;
//   };

//   const filteredConversations = tab === "ALL" ? conversations : conversations.filter((conv) => conv.unread > 0);

//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (selectedConversation?.id) {
//       timer = setTimeout(() => {
//         fetchMessages(selectedConversation.id).then((messages) => {
//           setSelectedConversation((prev) =>
//             prev ? { ...prev, messages } : prev
//           );
//           scrollToBottom();
//         });
//       }, 5000); // Refresh every 5 seconds
//     }
//     return () => clearTimeout(timer);
//   }, [selectedConversation?.id]);

//   if (!userId) return null;

//   return (
//     <div
//       className={`flex flex-col h-screen ${isDarkMode ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gray-50"} text-gray-900 dark:text-gray-100 transition-colors duration-300`}
//     >
//       <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
//       {!showChatMessages ? (
//         <div className="flex-1 flex flex-col">
//           <div
//             className={`p-4 border-b ${isDarkMode ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm`}
//           >
//             <div className="flex justify-between items-center">
//               <h2 className="text-2xl font-semibold">Chats</h2>
//               <button
//                 onClick={toggleDarkMode}
//                 aria-label="Toggle theme"
//                 className={`p-2 rounded-full ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} transition`}
//               >
//                 <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} className="w-5 h-5" />
//               </button>
//             </div>
//             <input
//               type="text"
//               placeholder="Search admins..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className={`w-full px-4 py-2 mt-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
//                 isDarkMode
//                   ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
//                   : "bg-white text-gray-900 border-gray-200 placeholder-gray-500"
//               }`}
//             />
//             {searchResults.length > 0 && (
//               <div
//                 className={`mt-2 rounded-lg shadow-lg ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"} border max-h-48 overflow-y-auto`}
//               >
//                 {searchResults.map((user) => (
//                   <div
//                     key={user.id}
//                     className={`flex items-center px-3 py-2 ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} cursor-pointer rounded-lg transition`}
//                     onClick={() => selectOrCreateConversation(user.id)}
//                   >
//                     <div className="w-8 h-8 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
//                       {user.fullName[0]?.toUpperCase() || "?"}
//                     </div>
//                     <span className="ml-2 font-medium">{user.fullName}</span>
//                   </div>
//                 ))}
//               </div>
//             )}
//             {searchQuery && searchResults.length === 0 && (
//               <div className="mt-2 text-gray-500 dark:text-gray-400 text-center">No admins found</div>
//             )}
//             <div className="flex justify-between space-x-4 mt-4">
//               <button
//                 onClick={() => setTab("ALL")}
//                 className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
//                   tab === "ALL"
//                     ? "bg-[#005555] text-white"
//                     : isDarkMode
//                     ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
//                     : "bg-gray-100 text-gray-900 hover:bg-gray-200"
//                 }`}
//               >
//                 All
//               </button>
//               <button
//                 onClick={() => setTab("UNREAD")}
//                 className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
//                   tab === "UNREAD"
//                     ? "bg-[#005555] text-white"
//                     : isDarkMode
//                     ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
//                     : "bg-gray-100 text-gray-900 hover:bg-gray-200"
//                 }`}
//               >
//                 Unread
//               </button>
//             </div>
//           </div>
//           <div className="flex-1 overflow-y-auto">
//             {filteredConversations.length === 0 && !searchQuery ? (
//               <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
//                 <p>{tab === "ALL" ? "No chats yet" : "No unread messages"}</p>
//               </div>
//             ) : (
//               filteredConversations.map((conv) => (
//                 <div
//                   key={conv.id}
//                   className={`px-4 py-3 border-b cursor-pointer ${isDarkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-100"} transition-colors`}
//                   onClick={() => handleConversationSelect(conv)}
//                 >
//                   <div className="flex justify-between items-center">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
//                         {getPartnerName(conv)[0]?.toUpperCase() || "?"}
//                       </div>
//                       <div>
//                         <h3
//                           className={`text-sm font-semibold ${conv.unread > 0 ? "text-[#005555] dark:text-[#00A3A3]" : "text-gray-900 dark:text-gray-100"}`}
//                         >
//                           {getPartnerName(conv)}
//                         </h3>
//                         <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
//                           {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
//                         </p>
//                       </div>
//                     </div>
//                     {conv.unread > 0 && (
//                       <span className="bg-[#005555] text-white text-xs font-semibold px-2 py-1 rounded-full">
//                         {conv.unread}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       ) : (
//         <div className="flex flex-col h-screen">
//           <div
//             className={`px-4 py-3 border-b sticky top-0 z-10 ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"} shadow-sm`}
//           >
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handleBackToConversations}
//                 className={`p-2 rounded-full ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"} transition-colors`}
//                 aria-label="Back to conversations"
//               >
//                 <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-gray-900 dark:text-gray-100" />
//               </button>
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
//                   {getPartnerName(selectedConversation)?.[0]?.toUpperCase() || ""}
//                 </div>
//                 <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getPartnerName(selectedConversation)}</span>
//               </div>
//             </div>
//           </div>

//           <div
//             className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} space-y-3`}
//           >
//             {selectedConversation?.messages?.map((msg) => (
//               <div
//                 key={msg.id}
//                 className={`flex ${msg.sender?.id === userId ? "justify-end" : "justify-start"} group relative`}
//               >
//                 <div
//                   className={`relative p-3 rounded-lg max-w-[70%] text-sm transition-colors ${
//                     isDarkMode
//                       ? msg.sender.id === userId
//                         ? "bg-[#005555] text-white hover:bg-[#004444]"
//                         : "bg-gray-700 text-gray-100 hover:bg-gray-600"
//                       : msg.sender.id === userId
//                       ? "bg-[#005555] text-white hover:bg-[#004444]"
//                       : "bg-white text-gray-900 hover:bg-gray-50 shadow-sm"
//                   }`}
//                 >
//                   {editingMessageId === msg.id ? (
//                     <div className="flex flex-col">
//                       <input
//                         ref={editInputRef}
//                         type="text"
//                         value={editedContent}
//                         onChange={(e) => setEditedContent(e.target.value)}
//                         className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] ${
//                           isDarkMode
//                             ? "bg-gray-700 text-gray-100 border-gray-600"
//                             : "bg-white text-gray-900 border-gray-200"
//                         }`}
//                         onKeyDown={(e) => {
//                           if (e.key === "Enter" && !e.shiftKey) {
//                             e.preventDefault();
//                             editMessage();
//                           }
//                         }}
//                       />
//                       <div className="mt-2 flex justify-between gap-x-2">
//                         <button
//                           onClick={() => editMessage()}
//                           className="text-green-500 hover:text-green-400 text-sm"
//                           aria-label="Save edit"
//                         >
//                           Save
//                         </button>
//                         <button
//                           onClick={() => {
//                             setEditingMessageId(null);
//                             setEditedContent("");
//                             setMenuMessageId(null);
//                           }}
//                           className="text-red-500 hover:text-red-600 text-sm"
//                           aria-label="Cancel edit"
//                         >
//                           Cancel
//                         </button>
//                       </div>
//                     </div>
//                   ) : (s
//                     <>
//                       {msg.fileUrl ? (
//                         <div>
//                           <p className="text-sm">{msg.content}</p>
//                           {msg.fileType?.startsWith("image/") ? (
//                             <img
//                               src={`${BACKEND_URL}${msg.fileUrl}`}
//                               alt={msg.fileName || "Uploaded image"}
//                               className="max-w-[200px] rounded-lg mt-1"
//                               onError={() => toast.error("Failed to load image", { duration: 3000 })}
//                             />
//                           ) : (
//                             <a
//                               href={`${BACKEND_URL}${msg.fileUrl}`}
//                               target="_blank"
//                               rel="noopener noreferrer"
//                               className="text-blue-300 hover:underline text-sm"
//                             >
//                               {msg.fileName || "View File"}
//                             </a>
//                           )}
//                         </div>
//                       ) : (
//                         <p
//                           dangerouslySetInnerHTML={{
//                             __html: DOMPurify.sanitize(msg.content, {
//                               ALLOWED_TAGS: ["img", "a", "p", "br"],
//                               ALLOWED_ATTR: ["src", "href", "alt", "class", "target"],
//                             }),
//                           }}
//                           className="text-sm"
//                         />
//                       )}
//                       <p className="text-xs mt-1 opacity-75 flex justify-end">
//                         {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                         {msg.isEdited && <span className="ml-2">Edited</span>}
//                       </p>
//                     </>
//                   )}
//                   {msg.sender.id === userId && (
//                     <button
//                       onClick={() => toggleMessageMenu(msg.id)}
//                       className="absolute top-2 right-2 p-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
//                       aria-label="Toggle menu"
//                     >
//                       <FontAwesomeIcon icon={faEllipsisV} className="w-4 h-4" />
//                     </button>
//                   )}
//                   {msg.sender.id === userId && menuMessageId === msg.id && !editingMessageId && (
//                     <div
//                       ref={menuRef}
//                       className={`absolute top-10 right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border ${isDarkMode ? "border-gray-600" : "border-gray-200"} z-10`}
//                     >
//                       <button
//                         onClick={() => {
//                           setEditingMessageId(msg.id);
//                           setEditedContent(msg.content);
//                           setMenuMessageId(null);
//                         }}
//                         className={`w-full px-4 py-2 text-sm flex items-center ${isDarkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-900 hover:bg-gray-100"} transition-colors`}
//                       >
//                         <FontAwesomeIcon icon={faEdit} className="mr-2 w-4 h-4" />
//                         Edit
//                       </button>
//                       <button
//                         onClick={() => deleteMessage(msg.id)}
//                         className={`w-full px-4 py-2 text-sm flex items-center ${isDarkMode ? "text-red-400 hover:bg-gray-700" : "text-red-600 hover:bg-gray-100"} transition-colors`}
//                       >
//                         <FontAwesomeIcon icon={faTrash} className="mr-2 w-4 h-4" />
//                         Delete
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ))}
//             <div ref={messagesEndRef} />
//           </div>
//           <div
//             className={`sticky bottom-0 p-4 border-t ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"} shadow-sm`}
//           >
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => fileInputRef.current?.click()}
//                 className={`p-2 rounded-full ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} transition`}
//                 aria-label="Attach file"
//               >
//                 <FontAwesomeIcon icon={faPaperclip} className="w-5 h-5 text-gray-900 dark:text-gray-100" />
//               </button>
//               <input
//                 type="file"
//                 ref={fileInputRef}
//                 onChange={handleFileChange}
//                 accept="image/png,image/jpeg,image/gif,application/pdf"
//                 className="hidden"
//               />
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 placeholder="Type a message..."
//                 className={`flex-1 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
//                   isDarkMode
//                     ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
//                     : "bg-white text-gray-900 border-gray-200 placeholder-gray-500"
//                 }`}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter" && !e.shiftKey) {
//                     e.preventDefault();
//                     sendMessage();
//                   }
//                 }}
//               />
//               <button
//                 onClick={sendMessage}
//                 className={`p-2 rounded-full ${message.trim() ? "bg-[#005555] hover:bg-[#004444]" : "bg-gray-400 cursor-not-allowed"} text-white transition`}
//                 aria-label="Send message"
//                 disabled={!message.trim()}
//               >
//                 <FontAwesomeIcon icon={faPaperPlane} className="w-5 h-5" />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Chatbox;








// "use client";

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faPaperPlane,
//   faMoon,
//   faSun,
//   faArrowLeft,
//   faEllipsisV,
//   faEdit,
//   faTrash,
//   faPaperclip,
// } from "@fortawesome/free-solid-svg-icons";
// import "@fortawesome/fontawesome-svg-core/styles.css";
// import { config } from "@fortawesome/fontawesome-svg-core";
// import io, { Socket } from "socket.io-client";
// import axios, { AxiosError } from "axios";
// import { Toaster, toast } from "react-hot-toast";
// import DOMPurify from "dompurify";
// import Image from "next/image"; // Added for image optimization

// config.autoAddCss = false;

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kiotachat-backend-1.onrender.com";

// interface User {
//   id: string;
//   fullName: string;
//   email: string;
//   role: "ADMIN" | "USER";
// }

// interface Message {
//   id: string;
//   content: string;
//   sender: User;
//   createdAt: string;
//   conversationId: string;
//   isEdited: boolean;
//   isDeleted?: boolean;
//   fileUrl?: string;
//   fileType?: string;
//   fileSize?: number;
//   fileName?: string;
//   tempId?: string;
// }

// interface Conversation {
//   id: string;
//   participant1: User;
//   participant2: User;
//   messages: Message[];
//   unread: number;
//   createdAt: string;
//   updatedAt: string;
// }

// const Chatbox: React.FC = () => {
//   const [conversations, setConversations] = useState<Conversation[]>([]);
//   const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
//   const [message, setMessage] = useState("");
//   const [userId, setUserId] = useState<string | null>(null);
//   const [role, setRole] = useState<string | null>(null);
//   const [isDarkMode, setIsDarkMode] = useState(() => {
//     if (typeof window !== "undefined") {
//       return localStorage.getItem("theme") !== "light";
//     }
//     return true; // Default to dark mode on server
//   });
//   const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
//   const [editedContent, setEditedContent] = useState("");
//   const [showChatMessages, setShowChatMessages] = useState(false);
//   const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
//   const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchResults, setSearchResults] = useState<User[]>([]);
//   const socketRef = useRef<Socket | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const editInputRef = useRef<HTMLInputElement>(null);
//   const menuRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const router = useRouter();

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const response = await axios.get(`${BACKEND_URL}/me`, {
//           withCredentials: true,
//           timeout: 10000,
//         });
//         const { userId, role, fullName } = response.data;
//         console.log("Fetched user:", { userId, role, fullName });

//         if (role !== "USER") {
//           console.error("Role mismatch, redirecting to login");
//           toast.error("Unauthorized access", { duration: 3000 });
//           router.push("/login");
//           return;
//         }

//         setUserId(userId);
//         setRole(role);
//         if (typeof window !== "undefined") {
//           localStorage.setItem("fullName", fullName);
//         }
//       } catch (error) {
//         console.error("Error fetching user:", error);
//         toast.error("Authentication failed. Please try again.", { duration: 3000 });
//         router.push("/login");
//       }
//     };
//     fetchUser();
//   }, [router]);

//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const savedTheme = localStorage.getItem("theme") === "light";
//       setIsDarkMode(!savedTheme);
//       document.documentElement.classList.toggle("dark", !savedTheme);
//     }
//   }, []);

//   const fetchConversations = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const response = await axios.get<Conversation[]>(`${BACKEND_URL}/conversations`, {
//         params: { userId, role: "USER" },
//         withCredentials: true,
//         timeout: 10000,
//       });
//       const uniqueConversations = Array.from(
//         new Map(
//           response.data.map((conv) => [
//             conv.id,
//             {
//               ...conv,
//               id: String(conv.id),
//               participant1: { ...conv.participant1, id: String(conv.participant1.id) },
//               participant2: { ...conv.participant2, id: String(conv.participant2.id) },
//               messages: conv.messages.map((msg) => ({
//                 ...msg,
//                 id: String(msg.id),
//                 sender: { ...msg.sender, id: String(msg.sender.id) },
//                 conversationId: String(msg.conversationId),
//                 isEdited: msg.isEdited || false,
//                 isDeleted: msg.isDeleted || false,
//                 fileUrl: msg.fileUrl || undefined,
//                 fileType: msg.fileType || undefined,
//                 fileSize: msg.fileSize || undefined,
//                 fileName: msg.fileName || undefined,
//                 tempId: msg.tempId || undefined,
//               })),
//               unread: conv.unread || 0,
//             },
//           ])
//         ).values()
//       ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
//       setConversations(uniqueConversations);
//     } catch (error) {
//       console.error("Failed to fetch conversations:", error);
//       toast.error("Failed to load chats. Please try again.", { duration: 3000 });
//       if (axios.isAxiosError(error) && error.response?.status === 401) {
//         toast.error("Session expired. Please log in.", { duration: 4000 });
//         router.push("/login");
//       }
//     }
//   }, [userId, router]);

//   useEffect(() => {
//     if (!userId || !role) return;

//     axios.defaults.withCredentials = true;
//     socketRef.current = io(BACKEND_URL, {
//       withCredentials: true,
//       query: { userId },
//       reconnection: true,
//       reconnectionAttempts: 3,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       randomizationFactor: 0.5,
//       transports: ["websocket"],
//     });

//     const socket = socketRef.current;

//     socket.on("connect", () => {
//       console.log("Socket connected, userId:", userId);
//       socket.emit("register", { userId: parseInt(userId, 10), role: "USER" });
//     });

//     socket.on("connect_error", (err) => {
//       console.error("Socket connect error:", {
//         message: err.message,
//         stack: err.stack,
//         userId,
//       });
//       toast.error("Failed to connect to server", { duration: 3000 });
//     });

//     socket.on("private message", (message) => {
//       console.log("Received private message:", message);
//       const normalizedMessage: Message = {
//         ...message,
//         id: String(message.id),
//         sender: { ...message.sender, id: String(message.sender.id) },
//         conversationId: String(message.conversationId),
//         isEdited: message.isEdited || false,
//         isDeleted: message.isDeleted || false,
//         fileUrl: message.fileUrl || undefined,
//         fileType: message.fileType || undefined,
//         fileSize: message.fileSize || undefined,
//         fileName: message.fileName || undefined,
//         tempId: message.tempId || undefined,
//       };
//       setConversations((prev) => {
//         const exists = prev.find((conv) => conv.id === normalizedMessage.conversationId);
//         if (!exists) {
//           fetchConversations();
//           return prev;
//         }
//         return prev.map((conv) =>
//           conv.id === normalizedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.some(
//                   (m) => m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
//                 )
//                   ? conv.messages.map((m) =>
//                       m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
//                         ? normalizedMessage
//                         : m
//                     )
//                   : [...conv.messages, normalizedMessage],
//                 unread: selectedConversation?.id === conv.id ? 0 : (conv.unread || 0) + 1,
//                 updatedAt: new Date().toISOString(),
//               }
//             : conv
//         ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
//       });
//       if (selectedConversation?.id === normalizedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.some(
//                   (m) => m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
//                 )
//                   ? prev.messages.map((m) =>
//                       m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
//                         ? normalizedMessage
//                         : m
//                     )
//                   : [...prev.messages, normalizedMessage],
//                 unread: 0,
//               }
//             : prev
//         );
//         scrollToBottom();
//       }
//     });

//     socket.on("message updated", (updatedMessage) => {
//       console.log("Received updated message:", updatedMessage);
//       const normalizedMessage: Message = {
//         ...updatedMessage,
//         id: String(updatedMessage.id),
//         sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
//         conversationId: String(updatedMessage.conversationId),
//         isEdited: true,
//         isDeleted: updatedMessage.isDeleted || false,
//         fileUrl: updatedMessage.fileUrl || undefined,
//         fileType: updatedMessage.fileType || undefined,
//         fileSize: updatedMessage.fileSize || undefined,
//         fileName: updatedMessage.fileName || undefined,
//         tempId: updatedMessage.tempId || undefined,
//       };
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === normalizedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.map((msg) => (msg.id === normalizedMessage.id ? normalizedMessage : msg)),
//               }
//             : conv
//         )
//       );
//       if (selectedConversation?.id === normalizedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.map((msg) => (msg.id === normalizedMessage.id ? normalizedMessage : msg)),
//               }
//             : prev
//         );
//       }
//       setEditingMessageId(null);
//       setEditedContent("");
//       setMenuMessageId(null);
//     });

//     socket.on("message deleted", (deletedMessage) => {
//       console.log("Received message deleted:", deletedMessage);
//       const normalizedDeletedMessage = {
//         ...deletedMessage,
//         id: String(deletedMessage.id),
//         conversationId: String(deletedMessage.conversationId),
//         isDeleted: deletedMessage.isDeleted || true,
//       };
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === normalizedDeletedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.filter((msg) => msg.id !== normalizedDeletedMessage.id),
//               }
//             : conv
//         )
//       );
//       if (selectedConversation?.id === normalizedDeletedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.filter((msg) => msg.id !== normalizedDeletedMessage.id),
//               }
//             : prev
//         );
//       }
//       setMenuMessageId(null);
//     });

//     socket.on("conversation updated", (updatedConversation) => {
//       console.log("Received conversation updated:", updatedConversation);
//       const normalizedConversation: Conversation = {
//         ...updatedConversation,
//         id: String(updatedConversation.id),
//         participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
//         participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
//         messages: updatedConversation.messages.map((msg: { id: unknown; sender: { id: unknown; }; conversationId: unknown; isEdited: unknown; isDeleted: unknown; fileUrl: unknown; fileType: unknown; fileSize: unknown; fileName: unknown; tempId: unknown; }) => ({
//           ...msg,
//           id: String(msg.id),
//           sender: { ...msg.sender, id: String(msg.sender.id) },
//           conversationId: String(msg.conversationId),
//           isEdited: msg.isEdited || false,
//           isDeleted: msg.isDeleted || false,
//           fileUrl: msg.fileUrl || undefined,
//           fileType: msg.fileType || undefined,
//           fileSize: msg.fileSize || undefined,
//           fileName: msg.fileName || undefined,
//           tempId: msg.tempId || undefined,
//         })),
//         unread: updatedConversation.unread || 0,
//       };
//       setConversations((prev) => {
//         const filtered = prev.filter((conv) => conv.id !== normalizedConversation.id);
//         return [...filtered, normalizedConversation].sort(
//           (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//         );
//       });

//       if (selectedConversation?.id === normalizedConversation.id) {
//         setSelectedConversation(normalizedConversation);
//         scrollToBottom();
//       }
//     });

//     socket.on("error", (error) => {
//       console.error("Socket error:", error);
//       toast.error(error.message || "Connection error", { duration: 3000 });
//       if (error.message?.includes("Invalid userId") || error.message?.includes("validation failed")) {
//         router.push("/login");
//       }
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, [userId, role, selectedConversation, router, fetchConversations]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
//         setMenuMessageId(null);
//         setEditingMessageId(null);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   useEffect(() => {
//     if (editingMessageId) {
//       editInputRef.current?.focus();
//     }
//   }, [editingMessageId]);

//   useEffect(() => {
//     if (userId) {
//       fetchConversations();
//     }
//   }, [userId, fetchConversations]);

//   useEffect(() => {
//     scrollToBottom();
//   }, [selectedConversation?.messages?.length]);

//   useEffect(() => {
//     if (!searchQuery.trim() || !userId) {
//       setSearchResults([]);
//       return;
//     }
//     const search = async () => {
//       try {
//         const response = await axios.get<User[]>(`${BACKEND_URL}/search/users`, {
//           params: { query: searchQuery, excludeUserId: userId, role: "ADMIN" },
//           withCredentials: true,
//           timeout: 10000,
//         });
//         setSearchResults(response.data.map((user) => ({ ...user, id: String(user.id) })));
//       } catch (error) {
//         console.error("Search failed:", error);
//         toast.error("Failed to find admins", { duration: 3000 });
//       }
//     };
//     const timeout = setTimeout(search, 300);
//     return () => clearTimeout(timeout);
//   }, [searchQuery, userId]);

//   const fetchMessages = async (conversationId: string): Promise<Message[]> => {
//     if (!userId) return [];
//     try {
//       const response = await axios.get<Message[]>(`${BACKEND_URL}/messages`, {
//         params: { conversationId },
//         withCredentials: true,
//         timeout: 10000,
//       });
//       return response.data.map((msg) => ({
//         ...msg,
//         id: String(msg.id),
//         sender: { ...msg.sender, id: String(msg.sender.id) },
//         conversationId: String(msg.conversationId),
//         isEdited: msg.isEdited || false,
//         isDeleted: msg.isDeleted || false,
//         fileUrl: msg.fileUrl || undefined,
//         fileType: msg.fileType || undefined,
//         fileSize: msg.fileSize || undefined,
//         fileName: msg.fileName || undefined,
//         tempId: msg.tempId || undefined,
//       }));
//     } catch (error) {
//       console.error("Failed to fetch messages:", error);
//       toast.error("Failed to load messages", { duration: 3000 });
//       return [];
//     }
//   };

//   const selectOrCreateConversation = async (adminId: string) => {
//     if (!userId) return;
//     try {
//       const existingConversation = conversations.find(
//         (conv) =>
//           (conv.participant1.id === userId && conv.participant2.id === adminId) ||
//           (conv.participant1.id === adminId && conv.participant2.id === userId)
//       );
//       if (existingConversation) {
//         const messages = await fetchMessages(existingConversation.id);
//         const updatedConversation = { ...existingConversation, messages, unread: 0 };
//         setSelectedConversation(updatedConversation);
//         setConversations((prev) =>
//           prev.map((conv) => (conv.id === existingConversation.id ? { ...conv, unread: 0 } : conv))
//         );
//         setShowChatMessages(true);
//         setSearchQuery("");
//         setSearchResults([]);
//         scrollToBottom();
//         try {
//           await axios.post(
//             `${BACKEND_URL}/conversations/${existingConversation.id}/read`,
//             { userId },
//             { withCredentials: true }
//           );
//         } catch (error) {
//           console.error("Failed to mark conversation as read:", error);
//           toast.error("Failed to mark as read", { duration: 3000 });
//         }
//         return;
//       }

//       const response = await axios.post<Conversation>(
//         `${BACKEND_URL}/conversations`,
//         { participant1Id: userId, participant2Id: adminId },
//         { withCredentials: true, timeout: 10000 }
//       );
//       const newConv: Conversation = {
//         ...response.data,
//         id: String(response.data.id),
//         participant1: { ...response.data.participant1, id: String(response.data.participant1.id) },
//         participant2: { ...response.data.participant2, id: String(response.data.participant2.id) },
//         messages: [],
//         unread: 0,
//         createdAt: response.data.createdAt,
//         updatedAt: response.data.updatedAt,
//       };
//       setConversations((prev) => {
//         const filtered = prev.filter((conv) => conv.id !== newConv.id);
//         return [newConv, ...filtered].sort(
//           (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//         );
//       });
//       const messages = await fetchMessages(newConv.id);
//       const updatedConv = { ...newConv, messages };
//       setSelectedConversation(updatedConv);
//       setShowChatMessages(true);
//       setSearchQuery("");
//       setSearchResults([]);
//       scrollToBottom();
//     } catch (error) {
//       console.error("Failed to start conversation:", error);
//       toast.error("Failed to start chat", { duration: 3000 });
//     }
//   };

//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file || !selectedConversation || !userId || !socketRef.current) return;

//     const allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
//     const maxSize = 5 * 1024 * 1024;
//     if (!allowedTypes.includes(file.type)) {
//       toast.error("Only PNG, JPEG, GIF, or PDF files allowed", { duration: 3000 });
//       return;
//     }
//     if (file.size > maxSize) {
//       toast.error("File size must be less than 5MB", { duration: 3000 });
//       return;
//     }

//     const tempId = `temp-${Date.now()}-${Math.random()}`;
//     const tempMessage: Message = {
//       id: tempId,
//       tempId,
//       content: "Uploading file...",
//       sender: {
//         id: userId,
//         fullName: typeof window !== "undefined" ? localStorage.getItem("fullName") || "User" : "User",
//         email: typeof window !== "undefined" ? localStorage.getItem("email") || "" : "",
//         role: "USER",
//       },
//       createdAt: new Date().toISOString(),
//       conversationId: selectedConversation.id,
//       isEdited: false,
//       isDeleted: false,
//       fileUrl: URL.createObjectURL(file),
//       fileType: file.type,
//       fileSize: file.size,
//       fileName: file.name,
//     };

//     setSelectedConversation((prev) =>
//       prev ? { ...prev, messages: [...prev.messages, tempMessage] } : prev
//     );
//     setConversations((prev) =>
//       prev.map((conv) =>
//         conv.id === selectedConversation.id
//           ? { ...conv, messages: [...conv.messages, tempMessage], updatedAt: new Date().toISOString() }
//           : conv
//       ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
//     );
//     scrollToBottom();

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append(
//       "to",
//       selectedConversation.participant1.id === userId
//         ? selectedConversation.participant2.id
//         : selectedConversation.participant1.id
//     );
//     formData.append("conversationId", selectedConversation.id);
//     formData.append("tempId", tempId);

//     try {
//       const timeoutId = setTimeout(() => {
//         setSelectedConversation((prev) =>
//           prev
//             ? { ...prev, messages: prev.messages.filter((m) => m.tempId !== tempId) }
//             : prev
//         );
//         setConversations((prev) =>
//           prev.map((conv) =>
//             conv.id === selectedConversation.id
//               ? { ...conv, messages: conv.messages.filter((m) => m.tempId !== tempId) }
//               : conv
//           )
//         );
//         toast.error("File upload timed out", { duration: 3000 });
//       }, 10000);

//       const response = await axios.post(`${BACKEND_URL}/upload-file`, formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//         withCredentials: true,
//         timeout: 15000,
//       });

//       clearTimeout(timeoutId);

//       const { fileUrl, messageId } = response.data.data || {};
//       if (!fileUrl || !messageId) {
//         throw new Error("File upload response missing fileUrl or messageId");
//       }

//       if (fileInputRef.current) fileInputRef.current.value = "";
//     } catch (error) {
//       console.error("Failed to upload file:", error);
//       toast.error(
//         axios.isAxiosError(error) ? error.response?.data?.message || "Failed to upload file" : "Failed to upload file",
//         { duration: 3000 }
//       );
//       setSelectedConversation((prev) =>
//         prev
//           ? { ...prev, messages: prev.messages.filter((m) => m.tempId !== tempId) }
//           : prev
//       );
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === selectedConversation.id
//             ? { ...conv, messages: conv.messages.filter((m) => m.tempId !== tempId) }
//             : conv
//         )
//       );
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     }
//   };

//   const sendMessage = () => {
//     if (!message.trim() || !selectedConversation || !userId || !socketRef.current) return;

//     const recipientId =
//       selectedConversation.participant1.id === userId
//         ? selectedConversation.participant2.id
//         : selectedConversation.participant1.id;
//     const tempId = `temp-${Date.now()}-${Math.random()}`;
//     const tempMessage: Message = {
//       id: tempId,
//       tempId,
//       content: DOMPurify.sanitize(message),
//       sender: {
//         id: userId,
//         fullName: typeof window !== "undefined" ? localStorage.getItem("fullName") || "User" : "User",
//         email: typeof window !== "undefined" ? localStorage.getItem("email") || "" : "",
//         role: "USER",
//       },
//       createdAt: new Date().toISOString(),
//       conversationId: selectedConversation.id,
//       isEdited: false,
//       isDeleted: false,
//     };

//     socketRef.current.emit("private message", {
//       content: DOMPurify.sanitize(message),
//       to: recipientId,
//       from: userId,
//       conversationId: selectedConversation.id,
//       tempId,
//     });

//     setSelectedConversation((prev) =>
//       prev ? { ...prev, messages: [...prev.messages, tempMessage], unread: 0 } : prev
//     );
//     setConversations((prev) =>
//       prev.map((conv) =>
//         conv.id === selectedConversation.id
//           ? {
//               ...conv,
//               messages: [...conv.messages, tempMessage],
//               unread: 0,
//               updatedAt: new Date().toISOString(),
//             }
//           : conv
//       ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
//     );

//     setMessage("");
//     scrollToBottom();
//     inputRef.current?.focus();
//   };

//   const editMessage = async () => {
//     if (!userId || !selectedConversation || !editingMessageId || !editedContent.trim()) return;
//     console.log("Editing message:", {
//       userId,
//       messageId: editingMessageId,
//       content: editedContent,
//       conversationId: selectedConversation.id,
//     });
//     try {
//       await axios.put(
//         `${BACKEND_URL}/messages/${editingMessageId}`,
//         { content: editedContent },
//         { withCredentials: true, timeout: 10000 }
//       );
//       socketRef.current?.emit("message updated", {
//         messageId: editingMessageId,
//         content: DOMPurify.sanitize(editedContent),
//         from: userId,
//         conversationId: selectedConversation.id,
//         to:
//           selectedConversation.participant1.id === userId
//             ? selectedConversation.participant2.id
//             : selectedConversation.participant1.id,
//       });
//       setEditingMessageId(null);
//       setEditedContent("");
//       setMenuMessageId(null);
//       toast.success("Message updated", { duration: 3000 });
//     } catch (error) {
//       console.error("Failed to edit message:", error);
//       toast.error("Failed to edit message", { duration: 3000 });
//     }
//   };

//   const deleteMessage = async (messageId: string) => {
//     if (!userId || !selectedConversation) return;
//     try {
//       await axios.delete(`${BACKEND_URL}/messages/${messageId}`, {
//         withCredentials: true,
//         timeout: 10000,
//       });
//       socketRef.current?.emit("message deleted", {
//         messageId,
//         from: userId,
//         conversationId: selectedConversation.id,
//         to:
//           selectedConversation.participant1.id === userId
//             ? selectedConversation.participant2.id
//             : selectedConversation.participant1.id,
//       });
//       setMenuMessageId(null);
//       toast.success("Message deleted", { duration: 3000 });
//     } catch (error) {
//       console.error("Failed to delete message:", error);
//       toast.error("Failed to delete message", { duration: 3000 });
//     }
//   };

//   const toggleMessageMenu = (messageId: string) => {
//     setMenuMessageId(menuMessageId === messageId ? null : messageId);
//     if (menuMessageId !== messageId) setEditingMessageId(null);
//   };

//   const handleConversationSelect = async (conversation: Conversation) => {
//     if (!conversation?.id || !userId) {
//       toast.error("Invalid conversation selected", { duration: 3000 });
//       return;
//     }
//     const convId = String(conversation.id);
//     if (!convId.match(/^\d+$/)) {
//       toast.error("Invalid conversation ID format", { duration: 3000 });
//       return;
//     }
//     console.log("Selecting conversation:", { convId, type: typeof convId, userId });
//     try {
//       const messages = await fetchMessages(convId);
//       const updatedConversation = { ...conversation, id: convId, messages, unread: 0 };
//       setSelectedConversation(updatedConversation);
//       setConversations((prev) =>
//         prev.map((conv) => (conv.id === convId ? { ...conv, unread: 0 } : conv))
//       );
//       setShowChatMessages(true);
//       setMenuMessageId(null);
//       setSearchQuery("");
//       setSearchResults([]);
//       scrollToBottom();
//       await axios.post(
//         `${BACKEND_URL}/conversations/${convId}/read`,
//         { userId },
//         { withCredentials: true, timeout: 10000 }
//       );
//     } catch (error) {
//       let errorMessage = "Failed to load conversation";
//       if (error instanceof AxiosError) {
//         errorMessage = error.response?.data?.message || errorMessage;
//         if (error.response?.status === 401) {
//           toast.error("Session expired. Please log in", { duration: 4000 });
//           setTimeout(() => router.push("/login"), 2000);
//           return;
//         }
//       } else if (error instanceof Error) {
//         errorMessage = error.message;
//       }
//       toast.error(errorMessage, { duration: 3000 });
//       if (process.env.NODE_ENV === "development") {
//         console.error("Error in handleConversationSelect:", error);
//       }
//       setShowChatMessages(true);
//       scrollToBottom();
//     }
//   };

//   const handleBackToConversations = () => {
//     setSelectedConversation(null);
//     setShowChatMessages(false);
//     setMenuMessageId(null);
//     setEditingMessageId(null);
//     setSearchQuery("");
//     setSearchResults([]);
//   };

//   const scrollToBottom = () => {
//     setTimeout(() => {
//       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     }, 100);
//   };

//   const toggleDarkMode = () => {
//     setIsDarkMode((prev) => {
//       const newMode = !prev;
//       if (typeof window !== "undefined") {
//         localStorage.setItem("theme", newMode ? "dark" : "light");
//       }
//       document.documentElement.classList.toggle("dark", newMode);
//       return newMode;
//     });
//   };

//   const getPartnerName = (conv: Conversation | null): string => {
//     if (!conv || !userId) return "Unknown";
//     return conv.participant1.id === userId ? conv.participant2.fullName : conv.participant1.fullName;
//   };

//   const filteredConversations = tab === "ALL" ? conversations : conversations.filter((conv) => conv.unread > 0);

//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (selectedConversation?.id) {
//       timer = setTimeout(() => {
//         fetchMessages(selectedConversation.id).then((messages) => {
//           setSelectedConversation((prev) =>
//             prev ? { ...prev, messages } : prev
//           );
//           scrollToBottom();
//         });
//       }, 5000);
//     }
//     return () => clearTimeout(timer);
//   }, [selectedConversation?.id]);

//   if (!userId) return null;

//   return (
//     <div
//       className={`flex flex-col h-screen ${isDarkMode ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gray-50"} ${isDarkMode ? "text-gray-100" : "text-black"} transition-colors duration-300`}
//     >
//       <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
//       {!showChatMessages ? (
//         <div className="flex-1 flex flex-col">
//           <div
//             className={`p-4 border-b ${isDarkMode ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm`}
//           >
//             <div className="flex justify-between items-center">
//               <h2 className={`text-2xl font-semibold ${isDarkMode ? "text-gray-100" : "text-black"}`}>Chats</h2>
//               <button
//                 onClick={toggleDarkMode}
//                 aria-label="Toggle theme"
//                 className={`p-2 rounded-full ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} transition`}
//               >
//                 <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} className="w-5 h-5" />
//               </button>
//             </div>
//             <input
//               type="text"
//               placeholder="Search admins..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className={`w-full px-4 py-2 mt-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
//                 isDarkMode
//                   ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
//                   : "bg-white text-black border-gray-200 placeholder-gray-500"
//               }`}
//             />
//             {searchResults.length > 0 && (
//               <div
//                 className={`mt-2 rounded-lg shadow-lg ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"} border max-h-48 overflow-y-auto`}
//               >
//                 {searchResults.map((user) => (
//                   <div
//                     key={user.id}
//                     className={`flex items-center px-3 py-2 ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} cursor-pointer rounded-lg transition`}
//                     onClick={() => selectOrCreateConversation(user.id)}
//                   >
//                     <div className="w-8 h-8 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
//                       {user.fullName[0]?.toUpperCase() || "?"}
//                     </div>
//                     <span className={`ml-2 font-medium ${isDarkMode ? "text-gray-100" : "text-black"}`}>{user.fullName}</span>
//                   </div>
//                 ))}
//               </div>
//             )}
//             {searchQuery && searchResults.length === 0 && (
//               <div className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-black"} text-center`}>No admins found</div>
//             )}
//             <div className="flex justify-between space-x-4 mt-4">
//               <button
//                 onClick={() => setTab("ALL")}
//                 className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
//                   tab === "ALL"
//                     ? "bg-[#005555] text-white"
//                     : isDarkMode
//                     ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
//                     : "bg-gray-100 text-black hover:bg-gray-200"
//                 }`}
//               >
//                 All
//               </button>
//               <button
//                 onClick={() => setTab("UNREAD")}
//                 className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
//                   tab === "UNREAD"
//                     ? "bg-[#005555] text-white"
//                     : isDarkMode
//                     ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
//                     : "bg-gray-100 text-black hover:bg-gray-200"
//                 }`}
//               >
//                 Unread
//               </button>
//             </div>
//           </div>
//           <div className="flex-1 overflow-y-auto">
//             {filteredConversations.length === 0 && !searchQuery ? (
//               <div className={`flex items-center justify-center h-full ${isDarkMode ? "text-gray-400" : "text-black"}`}>
//                 <p>{tab === "ALL" ? "No chats yet" : "No unread messages"}</p>
//               </div>
//             ) : (
//               filteredConversations.map((conv) => (
//                 <div
//                   key={conv.id}
//                   className={`px-4 py-3 border-b cursor-pointer ${isDarkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-100"} transition-colors`}
//                   onClick={() => handleConversationSelect(conv)}
//                 >
//                   <div className="flex justify-between items-center">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
//                         {getPartnerName(conv)[0]?.toUpperCase() || "?"}
//                       </div>
//                       <div>
//                         <h3
//                           className={`text-sm font-semibold ${conv.unread > 0 ? "text-[#005555] dark:text-[#00A3A3]" : isDarkMode ? "text-gray-100" : "text-black"}`}
//                         >
//                           {getPartnerName(conv)}
//                         </h3>
//                         <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-black"} truncate max-w-[200px]`}>
//                           {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
//                         </p>
//                       </div>
//                     </div>
//                     {conv.unread > 0 && (
//                       <span className="bg-[#005555] text-white text-xs font-semibold px-2 py-1 rounded-full">
//                         {conv.unread}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       ) : (
//         <div className="flex flex-col h-screen">
//           <div
//             className={`px-4 py-3 border-b sticky top-0 z-10 ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"} shadow-sm`}
//           >
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handleBackToConversations}
//                 className={`p-2 rounded-full ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"} transition-colors`}
//                 aria-label="Back to conversations"
//               >
//                 <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-gray-900 dark:text-gray-100" />
//               </button>
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
//                   {getPartnerName(selectedConversation)?.[0]?.toUpperCase() || ""}
//                 </div>
//                 <span className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-black"}`}>{getPartnerName(selectedConversation)}</span>
//               </div>
//             </div>
//           </div>

//           <div
//             className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} space-y-3`}
//           >
//             {selectedConversation?.messages?.map((msg) => (
//               <div
//                 key={msg.id || msg.tempId}
//                 className={`flex ${msg.sender?.id === userId ? "justify-end" : "justify-start"} group relative`}
//               >
//                 <div
//                   className={`relative p-3 rounded-lg max-w-[70%] text-sm transition-colors ${
//                     isDarkMode
//                       ? msg.sender.id === userId
//                         ? "bg-[#005555] text-white hover:bg-[#004444]"
//                         : "bg-gray-700 text-gray-100 hover:bg-gray-600"
//                       : msg.sender.id === userId
//                       ? "bg-[#005555] text-white hover:bg-[#004444]"
//                       : "bg-white text-black hover:bg-gray-50 shadow-sm"
//                   }`}
//                 >
//                   {editingMessageId === msg.id ? (
//                     <div className="flex flex-col">
//                       <input
//                         ref={editInputRef}
//                         type="text"
//                         value={editedContent}
//                         onChange={(e) => setEditedContent(e.target.value)}
//                         className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] ${
//                           isDarkMode
//                             ? "bg-gray-700 text-gray-100 border-gray-600"
//                             : "bg-white text-black border-gray-200"
//                         }`}
//                         onKeyDown={(e) => {
//                           if (e.key === "Enter" && !e.shiftKey) {
//                             e.preventDefault();
//                             editMessage();
//                           }
//                         }}
//                       />
//                       <div className="mt-2 flex justify-between gap-x-2">
//                         <button
//                           onClick={() => editMessage()}
//                           className="text-green-500 hover:text-green-400 text-sm"
//                           aria-label="Save edit"
//                         >
//                           Save
//                         </button>
//                         <button
//                           onClick={() => {
//                             setEditingMessageId(null);
//                             setEditedContent("");
//                             setMenuMessageId(null);
//                           }}
//                           className="text-red-500 hover:text-red-600 text-sm"
//                           aria-label="Cancel edit"
//                         >
//                           Cancel
//                         </button>
//                       </div>
//                     </div>
//                   ) : (
//                     <>
//                       {msg.fileUrl ? (
//                         <div>
//                           {msg.content !== "File message" && <p className="text-sm">{msg.content}</p>}
//                           {msg.fileType?.startsWith("image/") ? (
//                             <div>
//                               <Image
//                                 src={msg.fileUrl}
//                                 alt={msg.fileName || "Uploaded image"}
//                                 width={200}
//                                 height={200}
//                                 className="max-w-[200px] rounded-lg mt-1"
//                                 onError={() => {
//                                   toast.error("Image optimization failed", { duration: 3000 });
//                                   return (
//                                     <img
//                                       src={msg.fileUrl}
//                                       alt={msg.fileName || "Uploaded image"}
//                                       style={{ maxWidth: "200px", borderRadius: "8px" }}
//                                     />
//                                   );
//                                 }}
//                               />
//                             </div>
//                           ) : (
//                             <a
//                               href={msg.fileUrl}
//                               target="_blank"
//                               rel="noopener noreferrer"
//                               className="text-blue-300 hover:underline text-sm"
//                             >
//                               {msg.fileName || "View File"}
//                             </a>
//                           )}
//                         </div>
//                       ) : (
//                         <p
//                           dangerouslySetInnerHTML={{
//                             __html: DOMPurify.sanitize(msg.content, {
//                               ALLOWED_TAGS: ["img", "a", "p", "br"],
//                               ALLOWED_ATTR: ["src", "href", "alt", "class", "target"],
//                             }),
//                           }}
//                           className="text-sm"
//                         />
//                       )}
//                       <p className="text-xs mt-1 opacity-75 flex justify-end">
//                         {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                         {msg.isEdited && <span className="ml-2">Edited</span>}
//                       </p>
//                     </>
//                   )}
//                   {msg.sender.id === userId && !msg.tempId && (
//                     <button
//                       onClick={() => toggleMessageMenu(msg.id)}
//                       className="absolute top-2 right-2 p-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
//                       aria-label="Toggle menu"
//                     >
//                       <FontAwesomeIcon icon={faEllipsisV} className="w-4 h-4" />
//                     </button>
//                   )}
//                   {msg.sender.id === userId && menuMessageId === msg.id && !editingMessageId && (
//                     <div
//                       ref={menuRef}
//                       className={`absolute top-10 right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border ${isDarkMode ? "border-gray-600" : "border-gray-200"} z-10`}
//                     >
//                       <button
//                         onClick={() => {
//                           setEditingMessageId(msg.id);
//                           setEditedContent(msg.content);
//                           setMenuMessageId(null);
//                         }}
//                         className={`w-full px-4 py-2 text-sm flex items-center ${isDarkMode ? "text-gray-200 hover:bg-gray-700" : "text-black hover:bg-gray-100"} transition-colors`}
//                       >
//                         <FontAwesomeIcon icon={faEdit} className="mr-2 w-4 h-4" />
//                         Edit
//                       </button>
//                       <button
//                         onClick={() => deleteMessage(msg.id)}
//                         className={`w-full px-4 py-2 text-sm flex items-center ${isDarkMode ? "text-red-400 hover:bg-gray-700" : "text-red-600 hover:bg-gray-100"} transition-colors`}
//                       >
//                         <FontAwesomeIcon icon={faTrash} className="mr-2 w-4 h-4" />
//                         Delete
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ))}
//             <div ref={messagesEndRef} />
//           </div>
//           <div
//             className={`sticky bottom-0 p-4 border-t ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"} shadow-sm`}
//           >
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => fileInputRef.current?.click()}
//                 className={`p-2 rounded-full ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} transition`}
//                 aria-label="Attach file"
//               >
//                 <FontAwesomeIcon icon={faPaperclip} className="w-5 h-5 text-gray-900 dark:text-gray-100" />
//               </button>
//               <input
//                 type="file"
//                 ref={fileInputRef}
//                 onChange={handleFileChange}
//                 accept="image/png,image/jpeg,image/gif,application/pdf"
//                 className="hidden"
//               />
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 placeholder="Type a message..."
//                 className={`flex-1 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
//                   isDarkMode
//                     ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
//                     : "bg-white text-black border-gray-200 placeholder-gray-500"
//                 }`}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter" && !e.shiftKey) {
//                     e.preventDefault();
//                     sendMessage();
//                   }
//                 }}
//               />
//               <button
//                 onClick={sendMessage}
//                 className={`p-2 rounded-full ${message.trim() ? "bg-[#005555] hover:bg-[#004444]" : "bg-gray-400 cursor-not-allowed"} text-white transition`}
//                 aria-label="Send message"
//                 disabled={!message.trim()}
//               >
//                 <FontAwesomeIcon icon={faPaperPlane} className="w-5 h-5" />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Chatbox;




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
  faShare,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import io, { Socket } from "socket.io-client";
import axios, { AxiosError } from "axios";
import { Toaster, toast } from "react-hot-toast";
import DOMPurify from "dompurify";
import Image from "next/image";

config.autoAddCss = false;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kiotachat-backend-1.onrender.com";

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
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  fileName?: string;
  tempId?: string;
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

const Chatbox: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") !== "light";
    }
    return true;
  });
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [showChatMessages, setShowChatMessages] = useState(false);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [forwardContent, setForwardContent] = useState("");
  const [admins, setAdmins] = useState<User[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/me`, {
          withCredentials: true,
          timeout: 10000,
        });
        const { userId, role, fullName } = response.data;
        console.log("Fetched user:", { userId, role, fullName });

        if (role !== "USER") {
          console.error("Role mismatch, redirecting to login");
          toast.error("Unauthorized access", { duration: 3000 });
          router.push("/login");
          return;
        }

        setUserId(userId);
        setRole(role);
        if (typeof window !== "undefined") {
          localStorage.setItem("fullName", fullName);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Authentication failed. Please try again.", { duration: 3000 });
        router.push("/login");
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") === "light";
      setIsDarkMode(!savedTheme);
      document.documentElement.classList.toggle("dark", !savedTheme);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get<Conversation[]>(`${BACKEND_URL}/conversations`, {
        params: { userId, role: "USER" },
        withCredentials: true,
        timeout: 10000,
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
                fileUrl: msg.fileUrl || undefined,
                fileType: msg.fileType || undefined,
                fileSize: msg.fileSize || undefined,
                fileName: msg.fileName || undefined,
                tempId: msg.tempId || undefined,
              })),
              unread: conv.unread || 0,
            },
          ])
        ).values()
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(uniqueConversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to load chats. Please try again.", { duration: 3000 });
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Session expired. Please log in.", { duration: 4000 });
        router.push("/login");
      }
    }
  }, [userId, router]);

  useEffect(() => {
    if (!userId || !role) return;

    axios.defaults.withCredentials = true;
    socketRef.current = io(BACKEND_URL, {
      withCredentials: true,
      query: { userId },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected, userId:", userId);
      socket.emit("register", { userId: parseInt(userId, 10), role: "USER" });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", {
        message: err.message,
        stack: err.stack,
        userId,
      });
      toast.error("Failed to connect to server", { duration: 3000 });
    });

    socket.on("private message", (message) => {
      console.log("Received private message:", message);
      const normalizedMessage: Message = {
        ...message,
        id: String(message.id),
        sender: { ...message.sender, id: String(message.sender.id) },
        conversationId: String(message.conversationId),
        isEdited: message.isEdited || false,
        isDeleted: message.isDeleted || false,
        fileUrl: message.fileUrl || undefined,
        fileType: message.fileType || undefined,
        fileSize: message.fileSize || undefined,
        fileName: message.fileName || undefined,
        tempId: message.tempId || undefined,
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
                messages: conv.messages.some(
                  (m) => m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
                )
                  ? conv.messages.map((m) =>
                      m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
                        ? normalizedMessage
                        : m
                    )
                  : [...conv.messages, normalizedMessage],
                unread: selectedConversation?.id === conv.id ? 0 : (conv.unread || 0) + 1,
                updatedAt: new Date().toISOString(),
              }
            : conv
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      if (selectedConversation?.id === normalizedMessage.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.some(
                  (m) => m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
                )
                  ? prev.messages.map((m) =>
                      m.id === normalizedMessage.id || m.tempId === normalizedMessage.tempId
                        ? normalizedMessage
                        : m
                    )
                  : [...prev.messages, normalizedMessage],
                unread: 0,
              }
            : prev
        );
        scrollToBottom();
      }
    });

    socket.on("message updated", (updatedMessage) => {
      console.log("Received updated message:", updatedMessage);
      const normalizedMessage: Message = {
        ...updatedMessage,
        id: String(updatedMessage.id),
        sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
        conversationId: String(updatedMessage.conversationId),
        isEdited: true,
        isDeleted: updatedMessage.isDeleted || false,
        fileUrl: updatedMessage.fileUrl || undefined,
        fileType: updatedMessage.fileType || undefined,
        fileSize: updatedMessage.fileSize || undefined,
        fileName: updatedMessage.fileName || undefined,
        tempId: updatedMessage.tempId || undefined,
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

    socket.on("message deleted", (deletedMessage) => {
      console.log("Received message deleted:", deletedMessage);
      const normalizedDeletedMessage = {
        ...deletedMessage,
        id: String(deletedMessage.id),
        conversationId: String(deletedMessage.conversationId),
        isDeleted: deletedMessage.isDeleted || true,
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === normalizedDeletedMessage.conversationId
            ? {
                ...conv,
                messages: conv.messages.filter((msg) => msg.id !== normalizedDeletedMessage.id),
              }
            : conv
        )
      );
      if (selectedConversation?.id === normalizedDeletedMessage.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((msg) => msg.id !== normalizedDeletedMessage.id),
              }
            : prev
        );
      }
      setMenuMessageId(null);
    });

    socket.on("conversation updated", (updatedConversation) => {
      console.log("Received conversation updated:", updatedConversation);
      const normalizedConversation: Conversation = {
        ...updatedConversation,
        id: String(updatedConversation.id),
        participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
        participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
        messages: updatedConversation.messages.map((msg: { id: unknown; sender: { id: unknown; }; conversationId: unknown; isEdited: unknown; isDeleted: unknown; fileUrl: unknown; fileType: unknown; fileSize: unknown; fileName: unknown; tempId: unknown; }) => ({
          ...msg,
          id: String(msg.id),
          sender: { ...msg.sender, id: String(msg.sender.id) },
          conversationId: String(msg.conversationId),
          isEdited: msg.isEdited || false,
          isDeleted: msg.isDeleted || false,
          fileUrl: msg.fileUrl || undefined,
          fileType: msg.fileType || undefined,
          fileSize: msg.fileSize || undefined,
          fileName: msg.fileName || undefined,
          tempId: msg.tempId || undefined,
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

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      toast.error(error.message || "Connection error", { duration: 3000 });
      if (error.message?.includes("Invalid userId") || error.message?.includes("validation failed")) {
        router.push("/login");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, role, selectedConversation, router, fetchConversations]);

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

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages?.length]);

  useEffect(() => {
    if (!searchQuery.trim() || !userId) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      try {
        const response = await axios.get<User[]>(`${BACKEND_URL}/search/users`, {
          params: { query: searchQuery, excludeUserId: userId, role: "ADMIN" },
          withCredentials: true,
          timeout: 10000,
        });
        setSearchResults(response.data.map((user) => ({ ...user, id: String(user.id) })));
      } catch (error) {
        console.error("Search failed:", error);
        toast.error("Failed to find admins", { duration: 3000 });
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
        withCredentials: true,
        timeout: 10000,
      });
      return response.data.map((msg) => ({
        ...msg,
        id: String(msg.id),
        sender: { ...msg.sender, id: String(msg.sender.id) },
        conversationId: String(msg.conversationId),
        isEdited: msg.isEdited || false,
        isDeleted: msg.isDeleted || false,
        fileUrl: msg.fileUrl || undefined,
        fileType: msg.fileType || undefined,
        fileSize: msg.fileSize || undefined,
        fileName: msg.fileName || undefined,
        tempId: msg.tempId || undefined,
      }));
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to load messages", { duration: 3000 });
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
            { userId },
            { withCredentials: true }
          );
        } catch (error) {
          console.error("Failed to mark conversation as read:", error);
          toast.error("Failed to mark as read", { duration: 3000 });
        }
        return;
      }

      const response = await axios.post<Conversation>(
        `${BACKEND_URL}/conversations`,
        { participant1Id: userId, participant2Id: adminId },
        { withCredentials: true, timeout: 10000 }
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
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Failed to start chat", { duration: 3000 });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !userId || !socketRef.current) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
    const maxSize = 5 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PNG, JPEG, GIF, or PDF files allowed", { duration: 3000 });
      return;
    }
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB", { duration: 3000 });
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMessage: Message = {
      id: tempId,
      tempId,
      content: "Uploading file...",
      sender: {
        id: userId,
        fullName: typeof window !== "undefined" ? localStorage.getItem("fullName") || "User" : "User",
        email: typeof window !== "undefined" ? localStorage.getItem("email") || "" : "",
        role: "USER",
      },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
      isEdited: false,
      isDeleted: false,
      fileUrl: URL.createObjectURL(file),
      fileType: file.type,
      fileSize: file.size,
      fileName: file.name,
    };

    setSelectedConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, tempMessage] } : prev
    );
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? { ...conv, messages: [...conv.messages, tempMessage], updatedAt: new Date().toISOString() }
          : conv
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
    scrollToBottom();

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "to",
      selectedConversation.participant1.id === userId
        ? selectedConversation.participant2.id
        : selectedConversation.participant1.id
    );
    formData.append("conversationId", selectedConversation.id);
    formData.append("tempId", tempId);

    try {
      const timeoutId = setTimeout(() => {
        setSelectedConversation((prev) =>
          prev
            ? { ...prev, messages: prev.messages.filter((m) => m.tempId !== tempId) }
            : prev
        );
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id
              ? { ...conv, messages: conv.messages.filter((m) => m.tempId !== tempId) }
              : conv
          )
        );
        toast.error("File upload timed out", { duration: 3000 });
      }, 10000);

      const response = await axios.post(`${BACKEND_URL}/upload-file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        timeout: 15000,
      });

      clearTimeout(timeoutId);

      const { fileUrl, messageId } = response.data.data || {};
      if (!fileUrl || !messageId) {
        throw new Error("File upload response missing fileUrl or messageId");
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error(
        axios.isAxiosError(error) ? error.response?.data?.message || "Failed to upload file" : "Failed to upload file",
        { duration: 3000 }
      );
      setSelectedConversation((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.tempId !== tempId) }
          : prev
      );
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, messages: conv.messages.filter((m) => m.tempId !== tempId) }
            : conv
        )
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !selectedConversation || !userId || !socketRef.current) return;

    const recipientId =
      selectedConversation.participant1.id === userId
        ? selectedConversation.participant2.id
        : selectedConversation.participant1.id;
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMessage: Message = {
      id: tempId,
      tempId,
      content: DOMPurify.sanitize(message),
      sender: {
        id: userId,
        fullName: typeof window !== "undefined" ? localStorage.getItem("fullName") || "User" : "User",
        email: typeof window !== "undefined" ? localStorage.getItem("email") || "" : "",
        role: "USER",
      },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
      isEdited: false,
      isDeleted: false,
    };

    socketRef.current.emit("private message", {
      content: DOMPurify.sanitize(message),
      to: recipientId,
      from: userId,
      conversationId: selectedConversation.id,
      tempId,
    });

    setSelectedConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, tempMessage], unread: 0 } : prev
    );
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, tempMessage],
              unread: 0,
              updatedAt: new Date().toISOString(),
            }
          : conv
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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
        { withCredentials: true, timeout: 10000 }
      );
      socketRef.current?.emit("message updated", {
        messageId: editingMessageId,
        content: DOMPurify.sanitize(editedContent),
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
      toast.success("Message updated", { duration: 3000 });
    } catch (error) {
      console.error("Failed to edit message:", error);
      toast.error("Failed to edit message", { duration: 3000 });
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!userId || !selectedConversation) return;
    try {
      await axios.delete(`${BACKEND_URL}/messages/${messageId}`, {
        withCredentials: true,
        timeout: 10000,
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
      toast.success("Message deleted", { duration: 3000 });
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message", { duration: 3000 });
    }
  };

  const fetchAdmins = async () => {
    if (!userId) return;
    try {
      const response = await axios.get<User[]>(`${BACKEND_URL}/search/users`, {
        params: { query: "", excludeUserId: userId, role: "ADMIN" },
        withCredentials: true,
        timeout: 10000,
      });
      setAdmins(response.data.map((user) => ({ ...user, id: String(user.id) })));
    } catch (error) {
      console.error("Failed to fetch admins:", error);
      toast.error("Failed to fetch admins", { duration: 3000 });
    }
  };

  const forwardMessage = async (recipientIds: string[]) => {
    if (!userId || !forwardMessageId || !forwardContent || !recipientIds.length) return;
    try {
      await axios.post(
        `${BACKEND_URL}/messages/forward`,
        {
          messageId: forwardMessageId,
          recipientIds,
          content: forwardContent,
        },
        { withCredentials: true, timeout: 10000 }
      );
      toast.success("Message forwarded successfully", { duration: 3000 });
      setForwardModalOpen(false);
      setForwardMessageId(null);
      setForwardContent("");
      setAdmins([]);
    } catch (error) {
      console.error("Failed to forward message:", error);
      toast.error("Failed to forward message", { duration: 3000 });
    }
  };

  const openForwardModal = (messageId: string, content: string) => {
    setForwardMessageId(messageId);
    setForwardContent(content);
    setForwardModalOpen(true);
    fetchAdmins();
    setMenuMessageId(null);
  };

  const toggleMessageMenu = (messageId: string) => {
    setMenuMessageId(menuMessageId === messageId ? null : messageId);
    if (menuMessageId !== messageId) setEditingMessageId(null);
  };

  const renderMessageMenu = (msg: Message) => (
    <div
      ref={menuRef}
      className={`absolute top-10 right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border ${
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
          isDarkMode ? "text-gray-200 hover:bg-gray-700" : "text-black hover:bg-gray-100"
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
      <button
        onClick={() => openForwardModal(msg.id, msg.content)}
        className={`w-full px-4 py-2 text-sm flex items-center ${
          isDarkMode ? "text-gray-200 hover:bg-gray-700" : "text-black hover:bg-gray-100"
        } transition-colors`}
      >
        <FontAwesomeIcon icon={faShare} className="mr-2 w-4 h-4" />
        Forward
      </button>
    </div>
  );

  const handleConversationSelect = async (conversation: Conversation) => {
    if (!conversation?.id || !userId) {
      toast.error("Invalid conversation selected", { duration: 3000 });
      return;
    }
    const convId = String(conversation.id);
    if (!convId.match(/^\d+$/)) {
      toast.error("Invalid conversation ID format", { duration: 3000 });
      return;
    }
    console.log("Selecting conversation:", { convId, type: typeof convId, userId });
    try {
      const messages = await fetchMessages(convId);
      const updatedConversation = { ...conversation, id: convId, messages, unread: 0 };
      setSelectedConversation(updatedConversation);
      setConversations((prev) =>
        prev.map((conv) => (conv.id === convId ? { ...conv, unread: 0 } : conv))
      );
      setShowChatMessages(true);
      setMenuMessageId(null);
      setSearchQuery("");
      setSearchResults([]);
      scrollToBottom();
      await axios.post(
        `${BACKEND_URL}/conversations/${convId}/read`,
        { userId },
        { withCredentials: true, timeout: 10000 }
      );
    } catch (error) {
      let errorMessage = "Failed to load conversation";
      if (error instanceof AxiosError) {
        errorMessage = error.response?.data?.message || errorMessage;
        if (error.response?.status === 401) {
          toast.error("Session expired. Please log in", { duration: 4000 });
          setTimeout(() => router.push("/login"), 2000);
          return;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { duration: 3000 });
      if (process.env.NODE_ENV === "development") {
        console.error("Error in handleConversationSelect:", error);
      }
      setShowChatMessages(true);
      scrollToBottom();
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
    setIsDarkMode((prev) => {
      const newMode = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newMode ? "dark" : "light");
      }
      document.documentElement.classList.toggle("dark", newMode);
      return newMode;
    });
  };

  const getPartnerName = (conv: Conversation | null): string => {
    if (!conv || !userId) return "Unknown";
    return conv.participant1.id === userId ? conv.participant2.fullName : conv.participant1.fullName;
  };

  const filteredConversations = tab === "ALL" ? conversations : conversations.filter((conv) => conv.unread > 0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedConversation?.id) {
      timer = setTimeout(() => {
        fetchMessages(selectedConversation.id).then((messages) => {
          setSelectedConversation((prev) =>
            prev ? { ...prev, messages } : prev
          );
          scrollToBottom();
        });
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [selectedConversation?.id]);

  if (!userId) return null;

  return (
    <div
      className={`flex flex-col h-screen ${
        isDarkMode ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gray-50"
      } ${isDarkMode ? "text-gray-100" : "text-black"} transition-colors duration-300`}
    >
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {!showChatMessages ? (
        <div className="flex-1 flex flex-col">
          <div
            className={`p-4 border-b ${
              isDarkMode ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white"
            } shadow-sm`}
          >
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-semibold ${
                isDarkMode ? "text-gray-100" : "text-black"
              }`}>Chats</h2>
              <button
                onClick={toggleDarkMode}
                aria-label="Toggle theme"
                className={`p-2 rounded-full ${
                  isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
                } transition`}
              >
                <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search admins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-2 mt-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
                isDarkMode
                  ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
                  : "bg-white text-black border-gray-200 placeholder-gray-500"
              }`}
            />
            {searchResults.length > 0 && (
              <div
                className={`mt-2 rounded-lg shadow-lg ${
                  isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
                } border max-h-48 overflow-y-auto`}
              >
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center px-3 py-2 ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    } cursor-pointer rounded-lg transition`}
                    onClick={() => selectOrCreateConversation(user.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
                      {user.fullName[0]?.toUpperCase() || "?"}
                    </div>
                    <span className={`ml-2 font-medium ${
                      isDarkMode ? "text-gray-100" : "text-black"
                    }`}>{user.fullName}</span>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div className={`mt-2 ${
                isDarkMode ? "text-gray-400" : "text-black"
              } text-center`}>No admins found</div>
            )}
            <div className="flex justify-between space-x-4 mt-4">
              <button
                onClick={() => setTab("ALL")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
                  tab === "ALL"
                    ? "bg-[#005555] text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab("UNREAD")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
                  tab === "UNREAD"
                    ? "bg-[#005555] text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }`}
              >
                Unread
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && !searchQuery ? (
              <div className={`flex items-center justify-center h-full ${
                isDarkMode ? "text-gray-400" : "text-black"
              }`}>
                <p>{tab === "ALL" ? "No chats yet" : "No unread messages"}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`px-4 py-3 border-b cursor-pointer ${
                    isDarkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-100"
                  } transition-colors`}
                  onClick={() => handleConversationSelect(conv)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
                        {getPartnerName(conv)[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h3
                          className={`text-sm font-semibold ${
                            conv.unread > 0 ? "text-[#005555] dark:text-[#00A3A3]" : isDarkMode ? "text-gray-100" : "text-black"
                          }`}
                        >
                          {getPartnerName(conv)}
                        </h3>
                        <p className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-black"
                        } truncate max-w-[200px]`}>
                          {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
                        </p>
                      </div>
                    </div>
                    {conv.unread > 0 && (
                      <span className="bg-[#005555] text-white text-xs font-semibold px-2 py-1 rounded-full">
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
            className={`px-4 py-3 border-b sticky top-0 z-10 ${
              isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
            } shadow-sm`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToConversations}
                className={`p-2 rounded-full ${
                  isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"
                } transition-colors`}
                aria-label="Back to conversations"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-gray-900 dark:text-gray-100" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold">
                  {getPartnerName(selectedConversation)?.[0]?.toUpperCase() || ""}
                </div>
                <span className={`text-lg font-semibold ${
                  isDarkMode ? "text-gray-100" : "text-black"
                }`}>{getPartnerName(selectedConversation)}</span>
              </div>
            </div>
          </div>

          <div
            className={`flex-1 p-4 overflow-y-auto ${
              isDarkMode ? "bg-gray-900" : "bg-gray-100"
            } space-y-3`}
          >
            {selectedConversation?.messages?.map((msg) => (
              <div
                key={msg.id || msg.tempId}
                className={`flex ${
                  msg.sender?.id === userId ? "justify-end" : "justify-start"
                } group relative`}
              >
                <div
                  className={`relative p-3 rounded-lg max-w-[70%] text-sm transition-colors ${
                    isDarkMode
                      ? msg.sender.id === userId
                        ? "bg-[#005555] text-white hover:bg-[#004444]"
                        : "bg-gray-700 text-gray-100 hover:bg-gray-600"
                      : msg.sender.id === userId
                      ? "bg-[#005555] text-white hover:bg-[#004444]"
                      : "bg-white text-black hover:bg-gray-50 shadow-sm"
                  }`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] ${
                          isDarkMode
                            ? "bg-gray-700 text-gray-100 border-gray-600"
                            : "bg-white text-black border-gray-200"
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            editMessage();
                          }
                        }}
                      />
                      <div className="mt-2 flex justify-between gap-x-2">
                        <button
                          onClick={() => editMessage()}
                          className="text-green-500 hover:text-green-400 text-sm"
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
                      {msg.fileUrl ? (
                        <div>
                          {msg.content !== "File message" && <p className="text-sm">{msg.content}</p>}
                          {msg.fileType?.startsWith("image/") ? (
                            <div>
                              <Image
                                src={msg.fileUrl}
                                alt={msg.fileName || "Uploaded image"}
                                width={200}
                                height={200}
                                className="max-w-[200px] rounded-lg mt-1"
                                onError={() => {
                                  toast.error("Image optimization failed", { duration: 3000 });
                                  return (
                                    <img
                                      src={msg.fileUrl}
                                      alt={msg.fileName || "Uploaded image"}
                                      style={{ maxWidth: "200px", borderRadius: "8px" }}
                                    />
                                  );
                                }}
                              />
                            </div>
                          ) : (
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:underline text-sm"
                            >
                              {msg.fileName || "View File"}
                            </a>
                          )}
                        </div>
                      ) : (
                        <p
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(msg.content, {
                              ALLOWED_TAGS: ["img", "a", "p", "br"],
                              ALLOWED_ATTR: ["src", "href", "alt", "class", "target"],
                            }),
                          }}
                          className="text-sm"
                        />
                      )}
                      <p className="text-xs mt-1 opacity-75 flex justify-end">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.isEdited && <span className="ml-2">Edited</span>}
                      </p>
                    </>
                  )}
                  {msg.sender.id === userId && !msg.tempId && (
                    <button
                      onClick={() => toggleMessageMenu(msg.id)}
                      className="absolute top-2 right-2 p-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Toggle menu"
                    >
                      <FontAwesomeIcon icon={faEllipsisV} className="w-4 h-4" />
                    </button>
                  )}
                  {msg.sender.id === userId && menuMessageId === msg.id && !editingMessageId && renderMessageMenu(msg)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div
            className={`sticky bottom-0 p-4 border-t ${
              isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
            } shadow-sm`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full ${
                  isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                } transition`}
                aria-label="Attach file"
              >
                <FontAwesomeIcon icon={faPaperclip} className="w-5 h-5 text-gray-900 dark:text-gray-100" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/gif,application/pdf"
                className="hidden"
              />
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className={`flex-1 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
                    : "bg-white text-black border-gray-200 placeholder-gray-500"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                className={`p-2 rounded-full ${
                  message.trim() ? "bg-[#005555] hover:bg-[#004444]" : "bg-gray-400 cursor-not-allowed"
                } text-white transition`}
                aria-label="Send message"
                disabled={!message.trim()}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {forwardModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div
            className={`p-6 rounded-lg shadow-lg ${
              isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
            } max-w-md w-full`}
          >
            <h3 className="text-lg font-semibold mb-4">Forward Message To</h3>
            {admins.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg flex items-center space-x-3`}
                    onClick={() => forwardMessage([admin.id])} // Ensured array is passed
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
                    >
                      {admin.fullName[0]?.toUpperCase() || "?"}
                    </div>
                    <span>{admin.fullName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No admins found</p>
            )}
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setForwardModalOpen(false);
                  setForwardMessageId(null);
                  setForwardContent("");
                  setAdmins([]);
                }}
                className={`px-4 py-2 rounded ${
                  isDarkMode ? "bg-gray-600 text-white hover:bg-gray-500" : "bg-gray-300 text-black hover:bg-gray-400"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbox;

