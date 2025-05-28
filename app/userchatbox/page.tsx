// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faPaperPlane, faMoon, faSun, faArrowLeft, faEllipsisV, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
// import "@fortawesome/fontawesome-svg-core/styles.css";
// import { config } from "@fortawesome/fontawesome-svg-core";
// import io, { Socket } from "socket.io-client";
// import axios from "axios";
// import { Toaster, toast } from "react-hot-toast";

// config.autoAddCss = false;

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
//   const [theme, setTheme] = useState<"light" | "dark">("dark");
//   const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
//   const [editedContent, setEditedContent] = useState("");
//   const [showChat, setShowChat] = useState(false);
//   const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
//   const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
//   const socketRef = useRef<Socket | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const menuRef = useRef<HTMLDivElement>(null);
//   const router = useRouter();

//   // Initialize user and theme
//   useEffect(() => {
//     const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
//     if (savedTheme) {
//       setTheme(savedTheme);
//       document.documentElement.classList.toggle("dark", savedTheme === "dark");
//     }
//     const storedUserId = localStorage.getItem("userId")?.trim();
//     const storedRole = localStorage.getItem("role");
//     if (!storedUserId || storedRole !== "USER" || isNaN(parseInt(storedUserId, 10))) {
//       toast.error("Session expired. Please log in again.");
//       router.push("/login");
//       return;
//     }
//     setUserId(storedUserId);
//   }, [router]);

//   // Setup socket connection
//   useEffect(() => {
//     if (!userId) return;

//     axios.defaults.withCredentials = true;
//     socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002", {
//       withCredentials: true,
//       query: { userId },
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000,
//     });

//     const socket = socketRef.current;

//     socket.on("connect", () => {
//       console.log("Socket connected, userId:", userId);
//       socket.emit("register", { userId: parseInt(userId, 10), role: "USER" });
//     });

//     socket.on("connect_error", (err: Error) => {
//       console.error("Socket connect error:", err.message);
//       toast.error("Failed to connect to server");
//     });

//     socket.on("private message", (message: Message) => {
//       const normalizedMessage: Message = {
//         ...message,
//         id: String(message.id),
//         sender: { ...message.sender, id: String(message.sender.id) },
//         conversationId: String(message.conversationId),
//         isEdited: message.isEdited || false,
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
//                 messages: [
//                   ...conv.messages.filter((m) => m.id !== normalizedMessage.id && !m.id.startsWith("temp-")),
//                   normalizedMessage,
//                 ],
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
//                 messages: [
//                   ...prev.messages.filter((m) => m.id !== normalizedMessage.id && !m.id.startsWith("temp-")),
//                   normalizedMessage,
//                 ],
//                 unread: 0,
//               }
//             : prev
//         );
//         scrollToBottom();
//       }
//     });

//     socket.on("message updated", (updatedMessage: Message) => {
//       const normalizedMessage: Message = {
//         ...updatedMessage,
//         id: String(updatedMessage.id),
//         sender: { ...updatedMessage.sender, id: String(updatedMessage.sender.id) },
//         conversationId: String(updatedMessage.conversationId),
//         isEdited: true,
//       };
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === normalizedMessage.conversationId
//             ? {
//                 ...conv,
//                 messages: conv.messages.map((msg) =>
//                   msg.id === normalizedMessage.id ? normalizedMessage : msg
//                 ),
//               }
//             : conv
//         )
//       );
//       if (selectedConversation?.id === normalizedMessage.conversationId) {
//         setSelectedConversation((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 messages: prev.messages.map((msg) =>
//                   msg.id === normalizedMessage.id ? normalizedMessage : msg
//                 ),
//               }
//             : prev
//         );
//       }
//     });

//     socket.on("conversation updated", (updatedConversation: Conversation) => {
//       const normalizedConversation: Conversation = {
//         ...updatedConversation,
//         id: String(updatedConversation.id),
//         participant1: { ...updatedConversation.participant1, id: String(updatedConversation.participant1.id) },
//         participant2: { ...updatedConversation.participant2, id: String(updatedConversation.participant2.id) },
//         messages: updatedConversation.messages.map((msg) => ({
//           ...msg,
//           id: String(msg.id),
//           sender: { ...msg.sender, id: String(msg.sender.id) },
//           isEdited: msg.isEdited || false,
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
//       toast.error(error.message || "Socket error");
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, [userId, selectedConversation]);

//   // Close menu on outside click
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

//   // Fetch conversations
//   useEffect(() => {
//     fetchConversations();
//   }, [userId]);

//   const fetchConversations = async () => {
//     if (!userId) return;
//     try {
//       const response = await axios.get<Conversation[]>(
//         `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
//         {
//           params: { userId, role: "USER" },
//           headers: { "x-user-id": userId },
//           withCredentials: true,
//         }
//       );
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
//   };

//   // Fetch messages
//   const fetchMessages = async (conversationId: string): Promise<Message[]> => {
//     if (!userId) return [];
//     try {
//       const response = await axios.get<Message[]>(
//         `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages`,
//         {
//           params: { conversationId },
//           headers: { "x-user-id": userId },
//           withCredentials: true,
//         }
//       );
//       return response.data.map((msg) => ({
//         ...msg,
//         id: String(msg.id),
//         sender: { ...msg.sender, id: String(msg.sender.id) },
//         conversationId: String(msg.conversationId),
//         isEdited: msg.isEdited || false,
//       }));
//     } catch (error: unknown) {
//       console.error("Failed to fetch messages:", error);
//       toast.error("Failed to fetch messages");
//       return [];
//     }
//   };

//   // Send message
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
//   };

//   // Edit message
//   const editMessage = async (messageId: string, content: string) => {
//     if (!userId || !selectedConversation || !content.trim()) return;
//     try {
//       await axios.put(
//         `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/${messageId}`,
//         { content },
//         { headers: { "x-user-id": userId }, withCredentials: true }
//       );
//       setEditingMessageId(null);
//       setEditedContent("");
//       setMenuMessageId(null);
//     } catch (error: unknown) {
//       console.error("Failed to edit message:", error);
//       toast.error("Failed to edit message");
//     }
//   };

//   // Delete message
//   const deleteMessage = async (messageId: string) => {
//     if (!userId || !selectedConversation) return;
//     try {
//       await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/${messageId}`, {
//         headers: { "x-user-id": userId },
//         withCredentials: true,
//       });
//       setConversations((prev) =>
//         prev.map((conv) =>
//           conv.id === selectedConversation.id
//             ? {
//                 ...conv,
//                 messages: conv.messages.filter((msg) => msg.id !== messageId),
//               }
//             : conv
//         )
//       );
//       setSelectedConversation((prev) =>
//         prev
//           ? {
//               ...prev,
//               messages: prev.messages.filter((msg) => msg.id !== messageId),
//             }
//           : prev
//       );
//       setMenuMessageId(null);
//     } catch (error: unknown) {
//       console.error("Failed to delete message:", error);
//       toast.error("Failed to delete message");
//     }
//   };

//   // Toggle message menu
//   const toggleMessageMenu = (messageId: string) => {
//     setMenuMessageId(menuMessageId === messageId ? null : messageId);
//     if (menuMessageId !== messageId) setEditingMessageId(null);
//   };

//   // Select conversation
//   const handleConversationSelect = async (conversation: Conversation) => {
//     const messages = await fetchMessages(conversation.id);
//     const updatedConversation = { ...conversation, messages };
//     setSelectedConversation(updatedConversation);
//     setConversations((prev) =>
//       prev.map((conv) => (conv.id === conversation.id ? updatedConversation : conv))
//     );
//     setShowChat(true);
//     setMenuMessageId(null);
//     scrollToBottom();
//   };

//   // Back to conversations
//   const handleBackToConversations = () => {
//     setSelectedConversation(null);
//     setShowChat(false);
//     setMenuMessageId(null);
//   };

//   // Scroll to bottom
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   // Toggle theme
//   const toggleTheme = () => {
//     const newTheme = theme === "light" ? "dark" : "light";
//     setTheme(newTheme);
//     localStorage.setItem("theme", newTheme);
//     document.documentElement.classList.toggle("dark", newTheme === "dark");
//   };

//   // Get partner name
//   const getPartnerName = (conv: Conversation | null): string => {
//     if (!conv || !userId) return "Unknown";
//     return conv.participant1.id === userId ? conv.participant2.fullName : conv.participant1.fullName;
//   };

//   // Filter conversations based on tab
//   const filteredConversations = tab === "ALL" ? conversations : conversations.filter((conv) => conv.unread > 0);

//   if (!userId) return null;

//   return (
//     <div className={`flex flex-col h-screen ${theme === "dark" ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gradient-to-b from-gray-100 to-gray-200"} text-gray-800 dark:text-gray-100 transition-colors duration-300`}>
//       <Toaster />
//       {!showChat ? (
//         <div className="flex-1 flex flex-col">
//           <div className={`p-4 border-b ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm`}>
//             <div className="flex justify-between items-center">
//               <h2 className="text-2xl font-semibold">Messages</h2>
//               <button
//                 onClick={toggleTheme}
//                 aria-label="Toggle theme"
//                 className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
//               >
//                 <FontAwesomeIcon icon={theme === "light" ? faMoon : faSun} className="text-lg" />
//               </button>
//             </div>
//             <div className="flex space-x-4 mt-4">
//               <button
//                 onClick={() => setTab("ALL")}
//                 className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
//                   tab === "ALL"
//                     ? "bg-blue-500 text-white"
//                     : theme === "dark"
//                     ? "bg-gray-700 text-gray-100"
//                     : "bg-gray-200 text-gray-800"
//                 }`}
//               >
//                 All
//               </button>
//               <button
//                 onClick={() => setTab("UNREAD")}
//                 className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
//                   tab === "UNREAD"
//                     ? "bg-blue-500 text-white"
//                     : theme === "dark"
//                     ? "bg-gray-700 text-gray-100"
//                     : "bg-gray-200 text-gray-800"
//                 }`}
//               >
//                 Unread
//               </button>
//             </div>
//           </div>
//           <div className="flex-1 overflow-y-auto">
//             {filteredConversations.length === 0 ? (
//               <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
//                 <p>{tab === "ALL" ? "No conversations yet" : "No unread conversations"}</p>
//               </div>
//             ) : (
//               filteredConversations.map((conv) => (
//                 <div
//                   key={conv.id}
//                   className={`p-4 border-b cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
//                     theme === "dark" ? "border-gray-700" : "border-gray-200"
//                   }`}
//                   onClick={() => handleConversationSelect(conv)}
//                 >
//                   <div className="flex justify-between items-center">
//                     <div className="flex items-center space-x-3">
//                       <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
//                         {getPartnerName(conv)[0]?.toUpperCase() || "?"}
//                       </div>
//                       <div>
//                         <span className={`font-medium ${conv.unread > 0 ? "font-bold" : ""}`}>
//                           {getPartnerName(conv)}
//                         </span>
//                         <p className="text-sm truncate text-gray-500 dark:text-gray-400 max-w-[200px]">
//                           {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
//                         </p>
//                       </div>
//                     </div>
//                     {conv.unread > 0 && (
//                       <span className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs font-semibold">
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
//         <div className="flex-1 flex flex-col">
//           <div className={`p-4 border-b flex items-center ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm`}>
//             <button
//               onClick={handleBackToConversations}
//               className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
//               aria-label="Back to conversations"
//             >
//               <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
//             </button>
//             <div className="flex items-center space-x-3">
//               <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
//                 {getPartnerName(selectedConversation)[0]?.toUpperCase() || "?"}
//               </div>
//               <span className="font-semibold text-xl">{getPartnerName(selectedConversation)}</span>
//             </div>
//           </div>
//           <div className={`flex-1 p-4 overflow-y-auto ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"} space-y-4`}>
//             {selectedConversation?.messages.map((msg) => (
//               <div
//                 key={msg.id}
//                 className={`relative flex ${msg.sender.id === userId ? "justify-end" : "justify-start"} group`}
//               >
//                 <div
//                   className={`relative p-3 rounded-2xl max-w-[70%] transition-all ${
//                     msg.sender.id === userId
//                       ? "bg-blue-500 text-white"
//                       : theme === "dark"
//                       ? "bg-gray-700 text-white"
//                       : "bg-white text-gray-800 shadow-md"
//                   } ${msg.sender.id === userId ? "hover:bg-blue-600" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
//                 >
//                   {editingMessageId === msg.id ? (
//                     <div className="flex flex-col">
//                       <input
//                         type="text"
//                         value={editedContent}
//                         onChange={(e) => setEditedContent(e.target.value)}
//                         className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//                           theme === "dark" ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-800 border-gray-300"
//                         }`}
//                       />
//                       <div className="mt-2 flex justify-end space-x-2">
//                         <button
//                           onClick={() => editMessage(msg.id, editedContent)}
//                           className="text-green-400 hover:text-green-300"
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
//                           className="text-red-400 hover:text-red-300"
//                           aria-label="Cancel edit"
//                         >
//                           Cancel
//                         </button>
//                       </div>
//                     </div>
//                   ) : (
//                     <>
//                       <p className="break-words">{msg.content}</p>
//                       <p className="text-xs mt-1 opacity-70">
//                         {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                         {msg.isEdited && " (Edited)"}
//                       </p>
//                     </>
//                   )}
//                   {msg.sender.id === userId && menuMessageId === msg.id && !editingMessageId && (
//                     <div
//                       ref={menuRef}
//                       className={`absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 border w-32 ${
//                         theme === "dark" ? "border-gray-700" : "border-gray-200"
//                       }`}
//                     >
//                       <button
//                         onClick={() => {
//                           setEditingMessageId(msg.id);
//                           setEditedContent(msg.content);
//                           setMenuMessageId(null);
//                         }}
//                         className="flex items-center w-full px-4 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
//                       >
//                         <FontAwesomeIcon icon={faEdit} className="mr-2" /> Edit
//                       </button>
//                       <button
//                         onClick={() => deleteMessage(msg.id)}
//                         className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
//                       >
//                         <FontAwesomeIcon icon={faTrash} className="mr-2" /> Delete
//                       </button>
//                     </div>
//                   )}
//                 </div>
//                 {msg.sender.id === userId && !menuMessageId && !editingMessageId && (
//                   <FontAwesomeIcon
//                     icon={faEllipsisV}
//                     className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
//                     onClick={() => toggleMessageMenu(msg.id)}
//                   />
//                 )}
//               </div>
//             ))}
//             <div ref={messagesEndRef} />
//           </div>
//           <div className={`p-4 border-t flex items-center ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-inner`}>
//             <input
//               type="text"
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               placeholder="Type a message..."
//               className={`flex-1 p-3 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
//                 theme === "dark" ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400" : "bg-gray-50 text-gray-800 border-gray-300 placeholder-gray-500"
//               }`}
//               onKeyPress={(e) => e.key === "Enter" && sendMessage()}
//             />
//             <button
//               onClick={sendMessage}
//               className="ml-3 p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
//               aria-label="Send message"
//             >
//               <FontAwesomeIcon icon={faPaperPlane} />
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Chatbox;

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faMoon, faSun, faArrowLeft, faEllipsisV, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
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

const Chatbox: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initialize user and theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
    const storedUserId = localStorage.getItem("userId")?.trim();
    const storedRole = localStorage.getItem("role");
    if (!storedUserId || storedRole !== "USER" || isNaN(parseInt(storedUserId, 10))) {
      toast.error("Session expired. Please log in again.");
      router.push("/login");
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  // Setup socket connection
  useEffect(() => {
    if (!userId) return;

    axios.defaults.withCredentials = true;
    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002", {
      withCredentials: true,
      query: { userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected, userId:", userId);
      socket.emit("register", { userId: parseInt(userId, 10), role: "USER" });
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
  }, [userId, selectedConversation]);

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
  }, [userId]);

  const fetchConversations = async () => {
    if (!userId) return;
    try {
      const response = await axios.get<Conversation[]>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        {
          params: { userId, role: "USER" },
          headers: { "x-user-id": userId },
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
    if (!userId) return [];
    try {
      const response = await axios.get<Message[]>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages`,
        {
          params: { conversationId },
          headers: { "x-user-id": userId },
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

  // Send message
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
  };

  // Edit message
  const editMessage = async (messageId: string, content: string) => {
    if (!userId || !selectedConversation || !content.trim()) return;
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/${messageId}`,
        { content },
        { headers: { "x-user-id": userId }, withCredentials: true }
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
    if (!userId || !selectedConversation) return;
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/${messageId}`, {
        headers: { "x-user-id": userId },
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

  // Toggle message menu
  const toggleMessageMenu = (messageId: string) => {
    setMenuMessageId(menuMessageId === messageId ? null : messageId);
    if (menuMessageId !== messageId) setEditingMessageId(null);
  };

  // Select conversation
  const handleConversationSelect = async (conversation: Conversation) => {
    const messages = await fetchMessages(conversation.id);
    const updatedConversation = { ...conversation, messages };
    setSelectedConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((conv) => (conv.id === conversation.id ? updatedConversation : conv))
    );
    setShowChat(true);
    setMenuMessageId(null);
    scrollToBottom();
  };

  // Back to conversations
  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setShowChat(false);
    setMenuMessageId(null);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Get partner name
  const getPartnerName = (conv: Conversation | null): string => {
    if (!conv || !userId) return "Unknown";
    return conv.participant1.id === userId ? conv.participant2.fullName : conv.participant1.fullName;
  };

  // Filter conversations based on tab
  const filteredConversations = tab === "ALL" ? conversations : conversations.filter((conv) => conv.unread > 0);

  if (!userId) return null;

  return (
    <div className={`flex flex-col h-screen ${theme === "dark" ? "bg-gradient-to-b from-gray-800 to-gray-900" : "bg-gradient-to-b from-gray-100 to-gray-200"} text-gray-800 dark:text-gray-100 transition-colors duration-300`}>
      <Toaster />
      {!showChat ? (
        <div className="flex-1 flex flex-col">
          <div className={`p-4 border-b ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm`}>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Chats</h2>
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <FontAwesomeIcon icon={theme === "light" ? faMoon : faSun} className="text-lg" />
              </button>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <button
                onClick={() => setTab("ALL")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  tab === "ALL"
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-gray-700 text-gray-100"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab("UNREAD")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  tab === "UNREAD"
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-gray-700 text-gray-100"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                Unread
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>{tab === "ALL" ? "No chats yet" : "No unread chats"}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}
                  onClick={() => handleConversationSelect(conv)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {getPartnerName(conv)[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <span className={`font-medium ${conv.unread > 0 ? "font-bold" : ""}`}>
                          {getPartnerName(conv)}
                        </span>
                        <p className="text-sm truncate text-gray-500 dark:text-gray-400 max-w-[200px]">
                          {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
                        </p>
                      </div>
                    </div>
                    {conv.unread > 0 && (
                      <span className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs font-semibold">
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
        <div className="flex-1 flex flex-col">
          <div className={`p-4 border-b flex items-center ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-sm`}>
            <button
              onClick={handleBackToConversations}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              aria-label="Back to conversations"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {getPartnerName(selectedConversation)[0]?.toUpperCase() || "?"}
              </div>
              <span className="font-semibold text-xl">{getPartnerName(selectedConversation)}</span>
            </div>
          </div>
          <div className={`flex-1 p-4 overflow-y-auto ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"} space-y-4`}>
            {selectedConversation?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`relative flex ${msg.sender.id === userId ? "justify-end" : "justify-start"} group`}
              >
                <div
                  className={`relative p-3 rounded-2xl max-w-[70%] transition-all ${
                    msg.sender.id === userId
                      ? "bg-blue-500 text-white"
                      : theme === "dark"
                      ? "bg-gray-700 text-white"
                      : "bg-white text-gray-800 shadow-md"
                  } ${msg.sender.id === userId ? "hover:bg-blue-600" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          theme === "dark" ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-800 border-gray-300"
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
                  {msg.sender.id === userId && menuMessageId === msg.id && !editingMessageId && (
                    <div
                      ref={menuRef}
                      className={`absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 border w-32 ${
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      }`}
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
                    </div>
                  )}
                </div>
                {msg.sender.id === userId && !menuMessageId && !editingMessageId && (
                  <FontAwesomeIcon
                    icon={faEllipsisV}
                    className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    onClick={() => toggleMessageMenu(msg.id)}
                  />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className={`p-4 border-t flex items-center ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} shadow-inner`}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className={`flex-1 p-3 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                theme === "dark" ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400" : "bg-gray-50 text-gray-800 border-gray-300 placeholder-gray-500"
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
        </div>
      )}
    </div>
  );
};

export default Chatbox;
