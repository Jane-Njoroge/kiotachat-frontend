// "use client";

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faPaperPlane,
//   faMoon,
//   faSun,
//   faEllipsisV,
//   faEdit,
//   faTrash,
//   faShare,
//   faPaperclip,
// } from "@fortawesome/free-solid-svg-icons";
// import "@fortawesome/fontawesome-svg-core/styles.css";
// import { config } from "@fortawesome/fontawesome-svg-core";
// import io, { Socket } from "socket.io-client";
// import axios, { AxiosError } from "axios";
// import { Toaster, toast } from "react-hot-toast";
// import DOMPurify from "dompurify";

// config.autoAddCss = false;

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002";

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
//   isForwarded: boolean;
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

// const AdminChatbox: React.FC = () => {
//   const [conversations, setConversations] = useState<Conversation[]>([]);
//   const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
//   const [newMessage, setNewMessage] = useState("");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchResults, setSearchResults] = useState<User[]>([]);
//   const [adminId, setAdminId] = useState<string | null>(null);
//   const [role, setRole] = useState<string | null>(null);
//   const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "light" ? false : true);
//   const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
//   const [editedContent, setEditedContent] = useState("");
//   const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
//   const [forwardModalOpen, setForwardModalOpen] = useState(false);
//   const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
//   const [forwardContent, setForwardContent] = useState("");
//   const [admins, setAdmins] = useState<User[]>([]);
//   const socketRef = useRef<Socket | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const menuRef = useRef<HTMLDivElement>(null);
//   const editInputRef = useRef<HTMLInputElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const router = useRouter();

//   useEffect(() => {
//     const savedTheme = localStorage.getItem("theme") === "light";
//     setIsDarkMode(!savedTheme);
//     document.documentElement.classList.toggle("dark", !savedTheme);
//   }, []);

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const response = await axios.get(`${BACKEND_URL}/me`, { withCredentials: true });
//         const { userId, role, fullName } = response.data;
//         console.log("Fetched user:", { userId, role, fullName });

//         if (role !== "ADMIN") {
//           console.error("Role mismatch, redirecting to login");
//           toast.error("Unauthorized access");
//           router.push("/login");
//           return;
//         }

//         setAdminId(userId);
//         setRole(role);
//         localStorage.setItem("fullName", fullName);
//       } catch (error) {
//         console.error("Failed to fetch user:", error);
//         toast.error("Authentication failed");
//         router.push("/login");
//       }
//     };
//     fetchUser();
//   }, [router]);

//   const fetchConversations = useCallback(async () => {
//     if (!adminId) return;
//     try {
//       const response = await axios.get<Conversation[]>(`${BACKEND_URL}/conversations`, {
//         params: { userId: adminId, role: "ADMIN" },
//         withCredentials: true,
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
//                 isForwarded: msg.isForwarded || false,
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
//       toast.error("Failed to fetch conversations. Please try again.");
//       if (axios.isAxiosError(error) && error.response?.status === 401) {
//         router.push("/login");
//       }
//     }
//   }, [adminId, router]);

//   useEffect(() => {
//     if (!adminId || !role) return;

//     axios.defaults.withCredentials = true;
//     socketRef.current = io(BACKEND_URL, {
//       withCredentials: true,
//       query: { userId: adminId },
//       reconnection: true,
//       reconnectionAttempts: 10,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       randomizationFactor: 0.5,
//       transports: ["websocket", "polling"],
//     });

//     const socket = socketRef.current;

//     socket.on("connect", () => {
//       console.log("Socket connected, adminId:", adminId);
//       socket.emit("register", { userId: parseInt(adminId, 10), role: "ADMIN" });
//     });

//     socket.on("connect_error", (err: Error) => {
//       console.error("Socket connect error:", { message: err.message, stack: err.stack, cause: err.cause });
//       toast.error("Failed to connect to server");
//     });

//     socket.on("private message", (message: Message) => {
//       console.log("Received private message:", message);
//       const normalizedMessage: Message = {
//         ...message,
//         id: String(message.id),
//         sender: { ...message.sender, id: String(message.sender.id) },
//         conversationId: String(message.conversationId),
//         isEdited: message.isEdited || false,
//         isForwarded: message.isForwarded || false,
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
//       console.log("Received message updated:", updatedMessage);
//       const normalizedMessage: Message = {
//         ...updatedMessage,
//         id: String(updatedMessage.id),
//         sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
//         conversationId: String(updatedMessage.conversationId),
//         isEdited: true,
//         isForwarded: updatedMessage.isForwarded || false,
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
//                 messages: conv.messages.map((msg) => msg.id === normalizedMessage.id ? normalizedMessage : msg),
//               }
//             : conv
//         )
//       );
//       if (selectedConversation?.id === normalizedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.map((msg) => msg.id === normalizedMessage.id ? normalizedMessage : msg),
//               }
//             : prev
//         );
//       }
//     });

//     socket.on("message deleted", (deletedMessage: { id: string; conversationId: string; isDeleted: boolean }) => {
//       console.log("Received message deleted:", deletedMessage);
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === deletedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.filter((msg) => msg.id !== deletedMessage.id),
//               }
//             : conv
//         )
//       );
//       if (selectedConversation?.id === deletedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.filter((msg) => msg.id !== deletedMessage.id),
//               }
//             : prev
//         );
//       }
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
//           isForwarded: msg.isForwarded || false,
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
//       toast.error(error.message || "Socket error");
//       if (error.message?.includes("Invalid userId") || error.message?.includes("validation failed")) {
//         router.push("/login");
//       }
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, [adminId, role, selectedConversation, router, fetchConversations]);

//   useEffect(() => {
//     if (editingMessageId && editInputRef.current) {
//       editInputRef.current.focus();
//     }
//   }, [editingMessageId]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
//         setMenuMessageId(null);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   useEffect(() => {
//     fetchConversations();
//   }, [adminId, fetchConversations]);

//   const fetchMessages = async (conversationId: string): Promise<Message[]> => {
//     if (!adminId) return [];
//     try {
//       const response = await axios.get<Message[]>(`${BACKEND_URL}/messages`, {
//         params: { conversationId },
//         withCredentials: true,
//       });
//       return response.data.map((msg) => ({
//         ...msg,
//         id: String(msg.id),
//         sender: { ...msg.sender, id: String(msg.sender.id) },
//         conversationId: String(msg.conversationId),
//         isEdited: msg.isEdited || false,
//         isForwarded: msg.isForwarded || false,
//         fileUrl: msg.fileUrl || undefined,
//         fileType: msg.fileType || undefined,
//         fileSize: msg.fileSize || undefined,
//         fileName: msg.fileName || undefined,
//       }));
//     } catch (error: unknown) {
//       console.error("Failed to fetch messages:", error);
//       toast.error("Failed to fetch messages");
//       return [];
//     }
//   };

//   const fetchAdmins = async () => {
//     if (!adminId) return;
//     try {
//       const response = await axios.get<User[]>(`${BACKEND_URL}/users/admins`, {
//         params: { excludeUserId: adminId },
//         withCredentials: true,
//       });
//       setAdmins(response.data.map((user) => ({ ...user, id: String(user.id) })));
//     } catch (error: unknown) {
//       console.error("Failed to fetch admins:", error);
//       toast.error("Failed to fetch admins");
//     }
//   };

//   useEffect(() => {
//     if (!searchQuery.trim() || !adminId) {
//       setSearchResults([]);
//       return;
//     }
//     const search = async () => {
//       try {
//         const response = await axios.get<User[]>(`${BACKEND_URL}/search/users`, {
//           params: { query: searchQuery, excludeUserId: adminId },
//           withCredentials: true,
//         });
//         setSearchResults(response.data.map((user) => ({ ...user, id: String(user.id) })));
//       } catch (error: unknown) {
//         console.error("Search failed:", error);
//         toast.error("Search failed");
//       }
//     };
//     const timeout = setTimeout(search, 300);
//     return () => clearTimeout(timeout);
//   }, [searchQuery, adminId]);

//   const createConversation = async (userId: string) => {
//     if (!adminId) return;
//     try {
//       const response = await axios.post<Conversation>(
//         `${BACKEND_URL}/conversations`,
//         { participant1Id: adminId, participant2Id: userId },
//         { withCredentials: true }
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
//       setSearchQuery("");
//       setSearchResults([]);
//       scrollToBottom();
//     } catch (error: unknown) {
//       console.error("Failed to create conversation:", error);
//       toast.error("Failed to create conversation");
//     }
//   };

//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file || !selectedConversation || !adminId || !socketRef.current) return;

//     const allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
//     const maxSize = 5 * 1024 * 1024; // 5MB
//     if (!allowedTypes.includes(file.type)) {
//       toast.error("Only PNG, JPEG, GIF, or PDF files are allowed");
//       return;
//     }
//     if (file.size > maxSize) {
//       toast.error("File size must be less than 5MB");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append(
//       "to",
//       selectedConversation.participant1.id === adminId
//         ? selectedConversation.participant2.id
//         : selectedConversation.participant1.id
//     );
//     formData.append("conversationId", selectedConversation.id);

//     try {
//       const response = await axios.post(`${BACKEND_URL}/upload-file`, formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//         withCredentials: true,
//       });
//       const { fileUrl, fileType, fileSize, fileName, messageId } = response.data.data || {};
//       if (!fileUrl || !messageId) {
//         throw new Error("File upload response missing fileUrl or messageId");
//       }

//       const newMessage: Message = {
//         id: messageId,
//         content: "File message",
//         sender: {
//           id: adminId,
//           fullName: localStorage.getItem("fullName") || "Admin",
//           email: localStorage.getItem("email") || "",
//           role: "ADMIN",
//         },
//         createdAt: new Date().toISOString(),
//         conversationId: selectedConversation.id,
//         isEdited: false,
//         isForwarded: false,
//         fileUrl,
//         fileType,
//         fileSize,
//         fileName,
//       };

//       socketRef.current.emit("private message", {
//         content: "File message",
//         to: selectedConversation.participant1.id === adminId ? selectedConversation.participant2.id : selectedConversation.participant1.id,
//         from: adminId,
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

//       if (fileInputRef.current) fileInputRef.current.value = "";
//     } catch (error: unknown) {
//       console.error("Failed to upload file:", error);
//       toast.error(axios.isAxiosError(error) ? error.response?.data?.message || "Failed to upload file" : "Failed to upload file");
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     }
//   };

//   const sendMessage = () => {
//     if (!newMessage.trim() || !selectedConversation || !socketRef.current || !adminId) return;
//     const tempId = `temp-${Date.now()}`;
//     const optimisticMessage: Message = {
//       id: tempId,
//       content: newMessage,
//       sender: {
//         id: adminId,
//         fullName: localStorage.getItem("fullName") || "Admin",
//         email: localStorage.getItem("email") || "",
//         role: "ADMIN",
//       },
//       createdAt: new Date().toISOString(),
//       conversationId: selectedConversation.id,
//       isEdited: false,
//       isForwarded: false,
//     };
//     socketRef.current.emit("private message", {
//       content: newMessage,
//       to:
//         selectedConversation.participant1.id === adminId
//           ? selectedConversation.participant2.id
//           : selectedConversation.participant1.id,
//       from: adminId,
//       conversationId: selectedConversation.id,
//     });
//     setSelectedConversation((prev) =>
//       prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev
//     );
//     setConversations((prev) =>
//       prev.map((conv) =>
//         conv.id === selectedConversation.id
//           ? {
//               ...conv,
//               messages: [...conv.messages, optimisticMessage],
//               updatedAt: new Date().toISOString(),
//             }
//           : conv
//       )
//     );
//     setNewMessage("");
//     scrollToBottom();
//   };

//   const editMessage = async (messageId: string, content: string) => {
//     if (!adminId || !selectedConversation || !content.trim()) return;
//     try {
//       await axios.put(
//         `${BACKEND_URL}/messages/${messageId}`,
//         { content },
//         { withCredentials: true }
//       );
//       socketRef.current?.emit("message updated", {
//         messageId,
//         content,
//         from: adminId,
//         conversationId: selectedConversation.id,
//         to:
//           selectedConversation.participant1.id === adminId
//             ? selectedConversation.participant2.id
//             : selectedConversation.participant1.id,
//       });
//       setEditingMessageId(null);
//       setEditedContent("");
//       setMenuMessageId(null);
//     } catch (error) {
//       console.error("Failed to edit message:", error);
//       toast.error("Failed to edit message");
//     }
//   };

//   const deleteMessage = async (messageId: string) => {
//     if (!adminId || !selectedConversation) return;
//     try {
//       await axios.delete(`${BACKEND_URL}/messages/${messageId}`, {
//         withCredentials: true,
//       });
//       socketRef.current?.emit("message deleted", {
//         messageId,
//         from: adminId,
//         conversationId: selectedConversation.id,
//         to:
//           selectedConversation.participant1.id === adminId
//             ? selectedConversation.participant2.id
//             : selectedConversation.participant1.id,
//       });
//       setMenuMessageId(null);
//     } catch (error) {
//       console.error("Failed to delete message:", error);
//       toast.error("Failed to delete message");
//     }
//   };

//   const openForwardModal = (messageId: string, content: string) => {
//     setForwardMessageId(messageId);
//     setForwardContent(content);
//     setForwardModalOpen(true);
//     fetchAdmins();
//     setMenuMessageId(null);
//   };

//   const forwardMessage = async (recipientIds: string[]) => {
//     if (!adminId || !forwardMessageId || !forwardContent || !recipientIds.length) return;
//     try {
//       await axios.post(
//         `${BACKEND_URL}/messages/forward`,
//         {
//           messageId: forwardMessageId,
//           recipientIds,
//           content: forwardContent,
//         },
//         { withCredentials: true }
//       );
//       toast.success("Message forwarded successfully");
//       setForwardModalOpen(false);
//       setForwardMessageId(null);
//       setForwardContent("");
//       setAdmins([]);
//       fetchConversations();
//     } catch (error) {
//       console.error("Failed to forward message:", error);
//       toast.error("Failed to forward message");
//     }
//   };

//   const toggleMessageMenu = (messageId: string) => {
//     setMenuMessageId(menuMessageId === messageId ? null : messageId);
//   };

//   const selectConversation = async (conv: Conversation) => {
//     if (!conv?.id || !adminId) {
//       toast.error("Invalid conversation selected.", { duration: 3000 });
//       return;
//     }
//     try {
//       const messages = await fetchMessages(conv.id);
//       const updatedConversation = { ...conv, messages, unread: 0 };
//       setSelectedConversation(updatedConversation);
//       setConversations((prev) =>
//         prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
//       );
//       setMenuMessageId(null);
//       scrollToBottom();
//       await axios.post(
//         `${BACKEND_URL}/conversations/${conv.id}/read`,
//         { userId: adminId },
//         { withCredentials: true }
//       );
//     } catch (error: unknown) {
//       let errorMessage = "Failed to load conversation.";
//       if (error instanceof AxiosError) {
//         errorMessage = error.response?.data?.message || errorMessage;
//         if (error.response?.status === 401) {
//           toast.error("Session expired. Please log in.", { duration: 4000 });
//           setTimeout(() => router.push("/login"), 2000);
//           return;
//         }
//       } else if (error instanceof Error) {
//         errorMessage = error.message;
//       }
//       toast.error(errorMessage, { duration: 3000 });
//       if (process.env.NODE_ENV === "development") {
//         console.error("Error in selectConversation:", error);
//       }
//       scrollToBottom();
//     }
//   };

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
//     if (!conv || !adminId) return "Unknown";
//     return conv.participant1.id === adminId ? conv.participant2.fullName : conv.participant1.fullName;
//   };

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

//   if (!adminId) return null;

//   return (
//     <div
//       className={`h-screen flex ${
//         isDarkMode ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gradient-to-b from-gray-100 to-gray-200"
//       } text-black dark:text-white transition-colors duration-300`}
//     >
//       <Toaster />
//       <div
//         className={`w-1/3 border-r p-4 overflow-y-auto ${
//           isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
//         } shadow-inner`}
//       >
//         <input
//           type="text"
//           placeholder="Search users..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           className={`w-full p-3 mb-4 border rounded-full focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
//             isDarkMode
//               ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
//               : "bg-gray-50 text-black border-gray-300 placeholder-gray-400"
//           }`}
//         />
//         {searchResults.length > 0 ? (
//           searchResults.map((result) => (
//             <div
//               key={result.id}
//               className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition flex items-center space-x-3"
//               onClick={() => createConversation(result.id)}
//             >
//               <div
//                 className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
//               >
//                 {result.fullName[0]?.toUpperCase() || "?"}
//               </div>
//               <span>{result.fullName}</span>
//             </div>
//           ))
//         ) : (
//           conversations.map((conv) => (
//             <div
//               key={conv.id}
//               className={`p-3 cursor-pointer rounded-lg transition flex items-center space-x-3 ${
//                 selectedConversation?.id === conv.id
//                   ? isDarkMode
//                     ? "bg-[#005555]"
//                     : "bg-[#007575]"
//                   : "hover:bg-gray-100 dark:hover:bg-gray-700"
//               }`}
//               onClick={() => selectConversation(conv)}
//             >
//               <div
//                 className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
//               >
//                 {getPartnerName(conv)[0]?.toUpperCase() || "?"}
//               </div>
//               <div className="flex-1">
//                 <span
//                   className={`font-medium ${conv.unread > 0 ? "font-bold text-[#005555] dark:text-[#005555]" : ""}`}
//                 >
//                   {getPartnerName(conv)}
//                 </span>
//                 <p className="text-sm truncate text-gray-500 dark:text-gray-400 max-w-[200px]">
//                   {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
//                 </p>
//               </div>
//               {conv.unread > 0 && (
//                 <span className="bg-[#005555] text-white rounded-full px-2 py-1 text-xs font-semibold">
//                   {conv.unread}
//                 </span>
//               )}
//             </div>
//           ))
//         )}
//       </div>
//       <div className="flex-1 flex flex-col">
//         {selectedConversation ? (
//           <>
//             <div
//               className={`p-4 border-b ${
//                 isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
//               } shadow-sm flex items-center space-x-3`}
//             >
//               <div
//                 className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
//               >
//                 {getPartnerName(selectedConversation)[0]?.toUpperCase() || "?"}
//               </div>
//               <h2 className="text-xl font-semibold">{getPartnerName(selectedConversation)}</h2>
//             </div>
//             <div
//               className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} space-y-4`}
//             >
//               {selectedConversation.messages.map((msg) => (
//                 <div
//                   key={msg.id}
//                   className={`relative flex ${msg.sender.id === adminId ? "justify-end" : "justify-start"} group`}
//                 >
//                   <div
//                     className={`relative p-3 rounded-2xl max-w-[70%] transition-all ${
//                       msg.sender.id === adminId
//                         ? "bg-[#005555] text-white"
//                         : isDarkMode
//                         ? "bg-gray-700 text-white"
//                         : "bg-white text-black shadow-md"
//                     } ${msg.sender.id === adminId ? "hover:bg-[#007575]" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
//                   >
//                     {editingMessageId === msg.id ? (
//                       <div className="flex flex-col">
//                         <input
//                           ref={editInputRef}
//                           type="text"
//                           value={editedContent}
//                           onChange={(e) => setEditedContent(e.target.value)}
//                           onKeyPress={(e) => {
//                             if (e.key === "Enter") {
//                               editMessage(msg.id, editedContent);
//                             }
//                           }}
//                           className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] ${
//                             isDarkMode
//                               ? "bg-gray-800 text-white border-gray-600"
//                               : "bg-white text-black border-gray-300"
//                           }`}
//                         />
//                         <div className="mt-2 flex justify-end space-x-2">
//                           <button
//                             onClick={() => editMessage(msg.id, editedContent)}
//                             className="text-green-400 hover:text-green-300"
//                             aria-label="Save edit"
//                           >
//                             Save
//                           </button>
//                           <button
//                             onClick={() => {
//                               setEditingMessageId(null);
//                               setEditedContent("");
//                               setMenuMessageId(null);
//                             }}
//                             className="text-red-400 hover:text-red-300"
//                             aria-label="Cancel edit"
//                           >
//                             Cancel
//                           </button>
//                         </div>
//                       </div>
//                     ) : (
//                       <>
//                         {msg.fileUrl ? (
//                           <div>
//                             <p>{msg.content}</p>
//                             {msg.fileType?.startsWith("image/") ? (
//                               // eslint-disable-next-line @next/next/no-img-element
//                               <img
//                                 src={`${BACKEND_URL}${msg.fileUrl}`}
//                                 alt={msg.fileName || "Uploaded image"}
//                                 className="max-w-[200px] rounded-lg"
//                                 onError={() => toast.error("Failed to load image")}
//                               />
//                             ) : (
//                               <a
//                                 href={`${BACKEND_URL}${msg.fileUrl}`}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="text-blue-300 hover:underline"
//                               >
//                                 {msg.fileName || "View File"}
//                               </a>
//                             )}
//                           </div>
//                         ) : (
//                           <p
//                             dangerouslySetInnerHTML={{
//                               __html: DOMPurify.sanitize(msg.content, {
//                                 ALLOWED_TAGS: ["img", "a", "p", "br"],
//                                 ALLOWED_ATTR: ["src", "href", "alt", "class", "target"],
//                               }),
//                             }}
//                           />
//                         )}
//                         <p className="text-xs mt-1 opacity-70">
//                           {new Date(msg.createdAt).toLocaleTimeString("en-US", {
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })}
//                           {msg.isEdited && " (Edited)"}
//                           {msg.isForwarded && " (Forwarded)"}
//                         </p>
//                       </>
//                     )}
//                     {msg.sender.id === adminId && (
//                       <button
//                         onClick={() => toggleMessageMenu(msg.id)}
//                         className="absolute top-2 right-2 p-1 text-gray-200 hover:text-gray-300"
//                         aria-label="Toggle menu"
//                       >
//                         <FontAwesomeIcon icon={faEllipsisV} />
//                       </button>
//                     )}
//                     {msg.sender.id === adminId && menuMessageId === msg.id && !editingMessageId && (
//                       <div
//                         ref={menuRef}
//                         className={`absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 border w-32 ${
//                           isDarkMode ? "border-gray-700" : "border-gray-200"
//                         }`}
//                       >
//                         <button
//                           onClick={() => {
//                             setEditingMessageId(msg.id);
//                             setEditedContent(msg.content);
//                             setMenuMessageId(null);
//                           }}
//                           className="flex items-center w-full px-4 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
//                         >
//                           <FontAwesomeIcon icon={faEdit} className="mr-2" /> Edit
//                         </button>
//                         <button
//                           onClick={() => deleteMessage(msg.id)}
//                           className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
//                         >
//                           <FontAwesomeIcon icon={faTrash} className="mr-2" /> Delete
//                         </button>
//                         <button
//                           onClick={() => openForwardModal(msg.id, msg.content)}
//                           className="flex items-center w-full px-4 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
//                         >
//                           <FontAwesomeIcon icon={faShare} className="mr-2" /> Forward
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               ))}
//               <div ref={messagesEndRef} />
//             </div>
//             <div
//               className={`p-4 border-t flex items-center ${
//                 isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
//               } shadow-inner`}
//             >
//               <button
//                 onClick={() => fileInputRef.current?.click()}
//                 className="p-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
//                 aria-label="Attach file"
//               >
//                 <FontAwesomeIcon icon={faPaperclip} />
//               </button>
//               <input
//                 type="file"
//                 ref={fileInputRef}
//                 onChange={handleFileChange}
//                 accept="image/png,image/jpeg,image/gif,application/pdf"
//                 className="hidden"
//               />
//               <input
//                 type="text"
//                 value={newMessage}
//                 onChange={(e) => setNewMessage(e.target.value)}
//                 placeholder="Type a message..."
//                 className={`flex-1 mx-3 p-3 rounded-full border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
//                   isDarkMode
//                     ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
//                     : "bg-gray-50 text-black border-gray-300 placeholder-gray-400"
//                 }`}
//                 onKeyPress={(e) => e.key === "Enter" && sendMessage()}
//               />
//               <button
//                 onClick={sendMessage}
//                 className="p-3 bg-[#005555] text-white rounded-full hover:bg-[#007575] transition"
//                 aria-label="Send message"
//               >
//                 <FontAwesomeIcon icon={faPaperPlane} />
//               </button>
//             </div>
//           </>
//         ) : (
//           <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
//             <p>Select a conversation to start chatting</p>
//           </div>
//         )}
//       </div>
//       {forwardModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
//           <div
//             className={`p-6 rounded-lg shadow-lg ${
//               isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
//             } max-w-md w-full`}
//           >
//             <h3 className="text-lg font-semibold mb-4">Forward Message To</h3>
//             {admins.length > 0 ? (
//               <div className="max-h-60 overflow-y-auto">
//                 {admins.map((admin) => (
//                   <div
//                     key={admin.id}
//                     className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg flex items-center space-x-3"
//                     onClick={() => forwardMessage([admin.id])}
//                   >
//                     <div
//                       className="w-8 h-8 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
//                     >
//                       {admin.fullName[0]?.toUpperCase() || "?"}
//                     </div>
//                     <span>{admin.fullName}</span>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-500 dark:text-gray-400">No other admins found</p>
//             )}
//             <div className="mt-4 flex justify-end space-x-2">
//               <button
//                 onClick={() => {
//                   setForwardModalOpen(false);
//                   setForwardMessageId(null);
//                   setForwardContent("");
//                   setAdmins([]);
//                 }}
//                 className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//       <button
//         onClick={toggleDarkMode}
//         className={`absolute top-4 right-4 p-3 rounded-full ${
//           isDarkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-black hover:bg-gray-300"
//         } transition`}
//         aria-label="Toggle theme"
//       >
//         <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
//       </button>
//     </div>
//   );
// };

// export default AdminChatbox;



"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faMoon,
  faSun,
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
  isForwarded: boolean;
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
  const [role, setRole] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "light" ? false : true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [forwardContent, setForwardContent] = useState("");
  const [admins, setAdmins] = useState<User[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") === "light";
    setIsDarkMode(!savedTheme);
    document.documentElement.classList.toggle("dark", !savedTheme);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/me`, { withCredentials: true });
        const { userId, role, fullName } = response.data;
        console.log("Fetched user:", { userId, role, fullName });

        if (role !== "ADMIN") {
          console.error("Role mismatch, redirecting to login");
          toast.error("Unauthorized access");
          router.push("/login");
          return;
        }

        setAdminId(userId);
        setRole(role);
        localStorage.setItem("fullName", fullName);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        toast.error("Authentication failed");
        router.push("/login");
      }
    };
    fetchUser();
  }, [router]);

  const fetchConversations = useCallback(async () => {
    if (!adminId) return;
    try {
      const response = await axios.get<Conversation[]>(`${BACKEND_URL}/conversations`, {
        params: { userId: adminId, role: "ADMIN" },
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
                isForwarded: msg.isForwarded || false,
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
      ).sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(uniqueConversations);
    } catch (error: unknown) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to fetch conversations. Please try again.");
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login");
      }
    }
  }, [adminId, router]);

  useEffect(() => {
    if (!adminId || !role) return;

    axios.defaults.withCredentials = true;
    socketRef.current = io(BACKEND_URL, {
      withCredentials: true,
      query: { userId: adminId },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      transports: ["websocket", "polling"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected, adminId:", adminId);
      socket.emit("register", { userId: parseInt(adminId, 10), role: "ADMIN" });
    });

    socket.on("connect_error", (err: Error) => {
      console.error("Socket connect error:", { message: err.message, stack: err.stack, cause: err.cause });
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
        isForwarded: message.isForwarded || false,
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

    socket.on("message updated", (updatedMessage: Message) => {
      console.log("Received message updated:", updatedMessage);
      const normalizedMessage: Message = {
        ...updatedMessage,
        id: String(updatedMessage.id),
        sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
        conversationId: String(updatedMessage.conversationId),
        isEdited: true,
        isForwarded: updatedMessage.isForwarded || false,
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
          isForwarded: msg.isForwarded || false,
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
  }, [adminId, role, selectedConversation, router, fetchConversations]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuMessageId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [adminId, fetchConversations]);

  const fetchMessages = async (conversationId: string): Promise<Message[]> => {
    if (!adminId) return [];
    try {
      const response = await axios.get<Message[]>(`${BACKEND_URL}/messages`, {
        params: { conversationId },
        withCredentials: true,
      });
      return response.data.map((msg) => ({
        ...msg,
        id: String(msg.id),
        sender: { ...msg.sender, id: String(msg.sender.id) },
        conversationId: String(msg.conversationId),
        isEdited: msg.isEdited || false,
        isForwarded: msg.isForwarded || false,
        fileUrl: msg.fileUrl || undefined,
        fileType: msg.fileType || undefined,
        fileSize: msg.fileSize || undefined,
        fileName: msg.fileName || undefined,
        tempId: msg.tempId || undefined,
      }));
    } catch (error: unknown) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to fetch messages");
      return [];
    }
  };

  const fetchAdmins = async () => {
    if (!adminId) return;
    try {
      const response = await axios.get<User[]>(`${BACKEND_URL}/users/admins`, {
        params: { excludeUserId: adminId },
        withCredentials: true,
      });
      setAdmins(response.data.map((user) => ({ ...user, id: String(user.id) })));
    } catch (error: unknown) {
      console.error("Failed to fetch admins:", error);
      toast.error("Failed to fetch admins");
    }
  };

  useEffect(() => {
    if (!searchQuery.trim() || !adminId) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      try {
        const response = await axios.get<User[]>(`${BACKEND_URL}/search/users`, {
          params: { query: searchQuery, excludeUserId: adminId },
          withCredentials: true,
        });
        setSearchResults(response.data.map((user) => ({ ...user, id: String(user.id) })));
      } catch (error: unknown) {
        console.error("Search failed:", error);
        toast.error("Search failed");
      }
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, adminId]);

  const createConversation = async (userId: string) => {
    if (!adminId) return;
    try {
      const response = await axios.post<Conversation>(
        `${BACKEND_URL}/conversations`,
        { participant1Id: adminId, participant2Id: userId },
        { withCredentials: true }
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !adminId || !socketRef.current) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PNG, JPEG, GIF, or PDF files are allowed");
      return;
    }
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`; // Generate unique tempId
    const tempMessage: Message = {
      id: tempId,
      tempId,
      content: "Uploading file...",
      sender: {
        id: adminId,
        fullName: localStorage.getItem("fullName") || "Admin",
        email: localStorage.getItem("email") || "",
        role: "ADMIN",
      },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
      isEdited: false,
      isForwarded: false,
      fileUrl: URL.createObjectURL(file), // Temporary local URL for optimistic rendering
      fileType: file.type,
      fileSize: file.size,
      fileName: file.name,
    };

    // Add temporary message to UI
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
      selectedConversation.participant1.id === adminId
        ? selectedConversation.participant2.id
        : selectedConversation.participant1.id
    );
    formData.append("conversationId", selectedConversation.id);
    formData.append("tempId", tempId); // Include tempId in payload

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
        toast.error("File upload timed out");
      }, 10000); // 10-second timeout

      const response = await axios.post(`${BACKEND_URL}/upload-file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        timeout: 90000,
      });

      clearTimeout(timeoutId); // Clear timeout on success

      const { fileUrl, messageId } = response.data.data || {};
      if (!fileUrl || !messageId) {
        throw new Error("File upload response missing fileUrl or messageId");
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: unknown) {
      console.error("Failed to upload file:", error);
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || "Failed to upload file" : "Failed to upload file");
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
    if (!newMessage.trim() || !selectedConversation || !socketRef.current || !adminId) return;
    const tempId = `temp-${Date.now()}-${Math.random()}`; // Generate unique tempId
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      content: DOMPurify.sanitize(newMessage),
      sender: {
        id: adminId,
        fullName: localStorage.getItem("fullName") || "Admin",
        email: localStorage.getItem("email") || "",
        role: "ADMIN",
      },
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation.id,
      isEdited: false,
      isForwarded: false,
    };
    socketRef.current.emit("private message", {
      content: DOMPurify.sanitize(newMessage),
      to:
        selectedConversation.participant1.id === adminId
          ? selectedConversation.participant2.id
          : selectedConversation.participant1.id,
      from: adminId,
      conversationId: selectedConversation.id,
      tempId, // Include tempId in socket emission
    });
    setSelectedConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMessage], unread: 0 } : prev
    );
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
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
    setNewMessage("");
    scrollToBottom();
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!adminId || !selectedConversation || !content.trim()) return;
    try {
      await axios.put(
        `${BACKEND_URL}/messages/${messageId}`,
        { content },
        { withCredentials: true }
      );
      socketRef.current?.emit("message updated", {
        messageId,
        content,
        from: adminId,
        conversationId: selectedConversation.id,
        to:
          selectedConversation.participant1.id === adminId
            ? selectedConversation.participant2.id
            : selectedConversation.participant1.id,
      });
      setEditingMessageId(null);
      setEditedContent("");
      setMenuMessageId(null);
    } catch (error) {
      console.error("Failed to edit message:", error);
      toast.error("Failed to edit message");
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!adminId || !selectedConversation) return;
    try {
      await axios.delete(`${BACKEND_URL}/messages/${messageId}`, {
        withCredentials: true,
      });
      socketRef.current?.emit("message deleted", {
        messageId,
        from: adminId,
        conversationId: selectedConversation.id,
        to:
          selectedConversation.participant1.id === adminId
            ? selectedConversation.participant2.id
            : selectedConversation.participant1.id,
      });
      setMenuMessageId(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  const openForwardModal = (messageId: string, content: string) => {
    setForwardMessageId(messageId);
    setForwardContent(content);
    setForwardModalOpen(true);
    fetchAdmins();
    setMenuMessageId(null);
  };

  const forwardMessage = async (recipientIds: string[]) => {
    if (!adminId || !forwardMessageId || !forwardContent || !recipientIds.length) return;
    try {
      await axios.post(
        `${BACKEND_URL}/messages/forward`,
        {
          messageId: forwardMessageId,
          recipientIds,
          content: forwardContent,
        },
        { withCredentials: true }
      );
      toast.success("Message forwarded successfully");
      setForwardModalOpen(false);
      setForwardMessageId(null);
      setForwardContent("");
      setAdmins([]);
      fetchConversations();
    } catch (error) {
      console.error("Failed to forward message:", error);
      toast.error("Failed to forward message");
    }
  };

  const toggleMessageMenu = (messageId: string) => {
    setMenuMessageId(menuMessageId === messageId ? null : messageId);
  };

  const selectConversation = async (conv: Conversation) => {
    if (!conv?.id || !adminId) {
      toast.error("Invalid conversation selected.", { duration: 3000 });
      return;
    }
    try {
      const messages = await fetchMessages(conv.id);
      const updatedConversation = { ...conv, messages, unread: 0 };
      setSelectedConversation(updatedConversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
      );
      setMenuMessageId(null);
      scrollToBottom();
      await axios.post(
        `${BACKEND_URL}/conversations/${conv.id}/read`,
        { userId: adminId },
        { withCredentials: true }
      );
    } catch (error: unknown) {
      let errorMessage = "Failed to load conversation.";
      if (error instanceof AxiosError) {
        errorMessage = error.response?.data?.message || errorMessage;
        if (error.response?.status === 401) {
          toast.error("Session expired. Please log in.", { duration: 4000 });
          setTimeout(() => router.push("/login"), 2000);
          return;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { duration: 3000 });
      if (process.env.NODE_ENV === "development") {
        console.error("Error in selectConversation:", error);
      }
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      document.documentElement.classList.toggle("dark", newMode);
      return newMode;
    });
  };

  const getPartnerName = (conv: Conversation | null): string => {
    if (!conv || !adminId) return "Unknown";
    return conv.participant1.id === adminId ? conv.participant2.fullName : conv.participant1.fullName;
  };

  return (
    <div
      className={`h-screen flex ${
        isDarkMode ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gradient-to-b from-gray-100 to-gray-200"
      } text-black dark:text-white transition-colors duration-300`}
    >
      <Toaster />
      <div
        className={`w-1/3 border-r p-4 overflow-y-auto ${
          isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
        } shadow-inner`}
      >
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full p-3 mb-4 border rounded-full focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
            isDarkMode
              ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
              : "bg-gray-50 text-black border-gray-300 placeholder-gray-400"
          }`}
        />
        {searchResults.length > 0 ? (
          searchResults.map((result) => (
            <div
              key={result.id}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition flex items-center space-x-3"
              onClick={() => createConversation(result.id)}
            >
              <div
                className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
              >
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
                    ? "bg-[#005555]"
                    : "bg-[#007575]"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => selectConversation(conv)}
            >
              <div
                className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
              >
                {getPartnerName(conv)[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <span
                  className={`font-medium ${conv.unread > 0 ? "font-bold text-[#005555] dark:text-[#005555]" : ""}`}
                >
                  {getPartnerName(conv)}
                </span>
                <p className="text-sm truncate text-gray-500 dark:text-gray-400 max-w-[200px]">
                  {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
                </p>
              </div>
              {conv.unread > 0 && (
                <span className="bg-[#005555] text-white rounded-full px-2 py-1 text-xs font-semibold">
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
            <div
              className={`p-4 border-b ${
                isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
              } shadow-sm flex items-center space-x-3`}
            >
              <div
                className="w-10 h-10 rounded-full bg-[#005555] flex items-center justify-center text-white font-semibold"
              >
                {getPartnerName(selectedConversation)[0]?.toUpperCase() || "?"}
              </div>
              <h2 className="text-xl font-semibold">{getPartnerName(selectedConversation)}</h2>
            </div>
            <div
              className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} space-y-4`}
            >
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id || msg.tempId}
                  className={`relative flex ${msg.sender.id === adminId ? "justify-end" : "justify-start"} group`}
                >
                  <div
                    className={`relative p-3 rounded-2xl max-w-[70%] transition-all ${
                      msg.sender.id === adminId
                        ? "bg-[#005555] text-white"
                        : isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-white text-black shadow-md" // Changed to text-black for better contrast
                    } ${msg.sender.id === adminId ? "hover:bg-[#007575]" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                  >
                    {editingMessageId === msg.id ? (
                      <div className="flex flex-col">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              editMessage(msg.id, editedContent);
                            }
                          }}
                          className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#005555] ${
                            isDarkMode
                              ? "bg-gray-800 text-white border-gray-600"
                              : "bg-white text-black border-gray-300" // Ensured text is black in light mode
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
                        {msg.fileUrl ? (
                          <div>
                            {msg.content !== "File message" && <p className="text-sm">{msg.content}</p>}
                            {msg.fileType?.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={msg.fileUrl}
                                alt={msg.fileName || "Uploaded image"}
                                className="max-w-[200px] rounded-lg"
                                onError={() => toast.error(`Failed to load image: ${msg.fileName || "Unknown"}`)}
                              />
                            ) : (
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-300 hover:underline text-sm"
                                onClick={(e) => {
                                  if (!msg.fileUrl) {
                                    e.preventDefault();
                                    toast.error(`Failed to load file: ${msg.fileName || "Unknown"}`);
                                  }
                                }}
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
                            className="text-sm" // Added class for consistent text color
                          />
                        )}
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {msg.isEdited && " (Edited)"}
                          {msg.isForwarded && " (Forwarded)"}
                        </p>
                      </>
                    )}
                    {msg.sender.id === adminId && !msg.tempId && (
                      <button
                        onClick={() => toggleMessageMenu(msg.id)}
                        className="absolute top-2 right-2 p-1 text-gray-200 hover:text-gray-300"
                        aria-label="Toggle menu"
                      >
                        <FontAwesomeIcon icon={faEllipsisV} />
                      </button>
                    )}
                    {msg.sender.id === adminId && menuMessageId === msg.id && !editingMessageId && (
                      <div
                        ref={menuRef}
                        className={`absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 border w-32 ${
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        }`}
                      >
                        <button
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditedContent(msg.content);
                            setMenuMessageId(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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
                          onClick={() => openForwardModal(msg.id, msg.content)}
                          className="flex items-center w-full px-4 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <FontAwesomeIcon icon={faShare} className="mr-2" /> Forward
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div
              className={`p-4 border-t flex items-center ${
                isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
              } shadow-inner`}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
                aria-label="Attach file"
              >
                <FontAwesomeIcon icon={faPaperclip} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/gif,application/pdf"
                className="hidden"
              />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className={`flex-1 mx-3 p-3 rounded-full border focus:outline-none focus:ring-2 focus:ring-[#005555] transition ${
                  isDarkMode
                    ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
                    : "bg-white text-black border-gray-300 placeholder-gray-400" // Changed bg-gray-50 to bg-white and ensured text-black
                }`}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="p-3 bg-[#005555] text-white rounded-full hover:bg-[#007575] transition"
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
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg flex items-center space-x-3"
                    onClick={() => forwardMessage([admin.id])}
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
              <p className="text-gray-500 dark:text-gray-400">No other admins found</p>
            )}
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setForwardModalOpen(false);
                  setForwardMessageId(null);
                  setForwardContent("");
                  setAdmins([]);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-3 rounded-full ${
          isDarkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-black hover:bg-gray-300"
        } transition`}
        aria-label="Toggle theme"
      >
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
    </div>
  );
};
export default AdminChatbox;