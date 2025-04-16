"use client";

import React, { useState, ChangeEvent, KeyboardEvent } from "react";

interface Message {
  id: number;
  text: string;
  sender: "me" | "other";
}

const LaptopChatbox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello from laptop chat!", sender: "other" },
  ]);
  const [input, setInput] = useState("");

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: input.trim(), sender: "me" },
    ]);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex flex-col w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden border border-gray-300">
      <div className="bg-blue-600 text-white px-6 py-4 flex items-center space-x-4">
        <div className="rounded-full bg-blue-800 w-10 h-10 flex items-center justify-center font-bold text-xl">L</div>
        <div className="font-semibold text-xl">Laptop Chat</div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto h-[500px] flex flex-col space-y-3">
        {messages.map(({ id, text, sender }) => (
          <div
            key={id}
            className={`max-w-[70%] px-4 py-3 rounded-lg break-words ${
              sender === "me"
                ? "self-end bg-blue-500 text-white rounded-br-none"
                : "self-start bg-gray-200 text-gray-900 rounded-bl-none"
            }`}
          >
            {text}
          </div>
        ))}
      </div>
      <div className="border-t border-gray-300 px-6 py-4 flex items-center space-x-4">
        <input
          type="text"
          placeholder="Type your message here..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-md border border-gray-300 px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6 py-3 font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default LaptopChatbox;
