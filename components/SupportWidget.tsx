"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";

type SupportForm = {
    name: string;
    contact: string;
    message: string;
};

type ChatMessage = {
    id: string;
    sender: "user" | "admin";
    text: string;
    timestamp: number;
};

export function SupportWidget() {
    const [isWidgetVisible, setIsWidgetVisible] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Chat state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasSentInitial, setHasSentInitial] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Показываем кнопку с небольшой задержкой после загрузки
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsWidgetVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Session initialization
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                let storedId = localStorage.getItem("passion_support_session");
                if (!storedId) {
                    storedId = (typeof crypto !== "undefined" && crypto.randomUUID)
                        ? crypto.randomUUID()
                        : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                    localStorage.setItem("passion_support_session", storedId);
                }
                setSessionId(storedId);
            } catch (e) {
                console.error("Local storage error:", e);
                // Fallback for strict privacy modes
                setSessionId(Math.random().toString(36).substring(2, 15));
            }
        }
    }, [isOpen]);

    // Polling messages
    useEffect(() => {
        if (!isOpen || !sessionId) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/support?sessionId=${sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.messages && data.messages.length > 0) {
                        setMessages(data.messages);
                        setHasSentInitial(true);
                    }
                }
            } catch (error) {
                // Ошибки сети или блокировщиков рекламы игнорируем, чтобы не 
                // спамить overlay в dev-режиме каждые 5 секунд.
            }
        };

        fetchMessages(); // initial fetch on open
        const interval = setInterval(fetchMessages, 5000); // 5 sec poll
        return () => clearInterval(interval);
    }, [isOpen, sessionId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<SupportForm>();

    const onSubmit = async (data: SupportForm) => {
        if (!sessionId) return;

        const textMessage = data.message?.trim();
        if (!textMessage) return;

        // Optimistic UI update
        const tempId = (typeof crypto !== "undefined" && crypto.randomUUID)
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15);

        setMessages((prev) => [
            ...(Array.isArray(prev) ? prev : []),
            { id: tempId, sender: "user", text: textMessage, timestamp: Date.now() },
        ]);

        try {
            const res = await fetch("/api/support", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    sessionId,
                    // If we already sent initial details, don't spam admin with name/contact again (unless requested)
                    // But backend handles it fine if we just pass it all the time.
                }),
            });

            if (res.ok) {
                setHasSentInitial(true);
                // optionally we could replace the temp id with backend real id, but polling will fix it.
            } else {
                console.error("Failed to submit support request:", res.status);
            }
        } catch (e) {
            console.error("Error submitting support form:", e);
        }

        // Only clear the message field, keep name and contact if user wants to send more
        reset((formValues) => ({
            ...formValues,
            message: "",
        }));
    };

    const closeChat = () => {
        setIsOpen(false);
    };

    return (
        <>
            {/* Плавающая кнопка (FAB) */}
            <div
                className={`fixed bottom-6 right-6 z-40 transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${isWidgetVisible && !isOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0 pointer-events-none"
                    }`}
            >
                <button
                    onClick={() => setIsOpen(true)}
                    title="Служба поддержки"
                    className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform duration-300 hover:scale-110 hover:shadow-xl active:scale-95"
                >
                    <span className="absolute -inset-2 animate-ping rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <ChatIcon className="h-6 w-6 relative z-10" />
                </button>
            </div>

            {/* Окно чата */}
            <div
                className={`fixed bottom-6 right-6 z-50 flex w-[calc(100%-48px)] max-w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] origin-bottom-right ${isOpen
                    ? "scale-100 opacity-100"
                    : "scale-90 opacity-0 pointer-events-none"
                    }`}
            >
                {/* Шапка чата */}
                <div className="flex items-center justify-between bg-black px-4 py-3 text-white">
                    <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-neutral-800">
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                                P
                            </div>
                            {/* Зеленая точка онлайн */}
                            <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-black"></div>
                        </div>
                        <div>
                            <div className="text-sm font-semibold">Служба поддержки</div>
                            <div className="text-xs text-white/70">Мы онлайн</div>
                        </div>
                    </div>
                    <button
                        onClick={closeChat}
                        className="rounded-full p-2 transition-colors hover:bg-white/20"
                        aria-label="Закрыть чат"
                    >
                        <CloseIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Тело чата */}
                <div className="flex h-[450px] flex-col bg-[#fbf7f3]">
                    {/* Сообщения */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex items-end gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold">
                                P
                            </div>
                            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white p-3 text-sm shadow-sm text-neutral-800">
                                Здравствуйте! Возникли вопросы по продуктам или доставке? Оставьте контакты, и мы поможем.
                            </div>
                        </div>

                        {(Array.isArray(messages) ? messages : []).map((msg, i) => {
                            if (!msg) return null;
                            const sender = msg.sender === "admin" ? "admin" : "user";
                            const text = msg.text || "";

                            return (
                                <div key={msg.id || i} className={`flex items-end gap-2 ${sender === "user" ? "flex-row-reverse" : ""}`}>
                                    {sender === "admin" && (
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold">
                                            P
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${sender === "user" ? "bg-black text-white rounded-br-sm" : "bg-white text-neutral-800 rounded-bl-sm"}`}>
                                        {text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Форма */}
                    <div className="border-t border-black/5 bg-white p-3">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
                            {!hasSentInitial && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <input
                                            {...register("name", { required: "Введите имя" })}
                                            placeholder="Ваше имя"
                                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            {...register("contact", { required: "Добавьте телефон/email" })}
                                            placeholder="Контакт"
                                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <textarea
                                    {...register("message", { required: true })}
                                    placeholder="Ваше сообщение..."
                                    className="min-h-[60px] max-h-[120px] w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 pr-12 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white"
                                    disabled={isSubmitting}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(onSubmit)();
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="absolute bottom-2 right-2 p-1.5 text-white bg-black rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

function ChatIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}
