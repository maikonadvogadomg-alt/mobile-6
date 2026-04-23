import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { AIProvider } from "@/context/AppContext";
import MessageRenderer from "@/components/MessageRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getEndpoint(provider: AIProvider): { url: string; headers: Record<string, string> } {
  switch (provider.type) {
    case "openai":
    case "deepseek":
    case "mistral":
      return {
        url: (provider.baseUrl || "https://api.openai.com") + "/v1/chat/completions",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
      };
    case "anthropic":
      return {
        url: (provider.baseUrl || "https://api.anthropic.com") + "/v1/messages",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": provider.apiKey,
          "anthropic-version": "2023-06-01",
        },
      };
    case "gemini":
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${provider.model || "gemini-pro"}:generateContent?key=${provider.apiKey}`,
        headers: { "Content-Type": "application/json" },
      };
    case "custom":
      return {
        url: (provider.baseUrl || "") + "/v1/chat/completions",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
      };
    default:
      return { url: "", headers: {} };
  }
}

async function callAI(
  provider: AIProvider,
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const { url, headers } = getEndpoint(provider);
  const model = provider.model || getDefaultModel(provider.type);

  let body: string;

  if (provider.type === "anthropic") {
    body = JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } else if (provider.type === "gemini") {
    body = JSON.stringify({
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });
  } else {
    body = JSON.stringify({
      model,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  const response = await fetch(url, { method: "POST", headers, body });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error ${response.status}: ${err}`);
  }

  if (provider.type === "gemini") {
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    onChunk(text);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Sem reader disponível");
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const json = JSON.parse(data);
        if (provider.type === "anthropic") {
          const text = json.delta?.text || "";
          if (text) onChunk(text);
        } else {
          const text = json.choices?.[0]?.delta?.content || "";
          if (text) onChunk(text);
        }
      } catch {}
    }
  }
}

function getDefaultModel(type: AIProvider["type"]): string {
  switch (type) {
    case "openai": return "gpt-4o-mini";
    case "anthropic": return "claude-3-5-haiku-20241022";
    case "gemini": return "gemini-pro";
    case "deepseek": return "deepseek-chat";
    case "mistral": return "mistral-small";
    default: return "gpt-4o-mini";
  }
}

export default function AIChat() {
  const colors = useColors();
  const { getActiveAIProvider, activeFile, activeProject } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async () => {
    const provider = getActiveAIProvider();
    const text = input.trim();
    if (!text || isLoading) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: generateId(), role: "user", content: text };
    const assistantId = generateId();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setInput("");
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    if (!provider) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Nenhum provedor de IA configurado. Vá em Configuracoes > IA e adicione uma chave de API.",
              }
            : m
        )
      );
      setIsLoading(false);
      return;
    }

    let systemContext = "Você é um assistente de programação especializado em ajudar desenvolvedores.";
    if (activeFile) {
      systemContext += `\n\nArquivo atual: ${activeFile.name} (${activeFile.language})\n\`\`\`\n${activeFile.content.slice(0, 2000)}\n\`\`\``;
    }
    if (activeProject) {
      systemContext += `\n\nProjeto: ${activeProject.name}`;
    }

    const allMessages: Message[] = [
      { id: "system", role: "user", content: systemContext },
      ...messages,
      userMsg,
    ];

    try {
      await callAI(provider, allMessages, (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Erro desconhecido";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Erro: ${errMsg}` } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, getActiveAIProvider, activeFile, activeProject]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          {
            backgroundColor: isUser ? colors.primary : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {!isUser && (
          <View style={styles.aiLabel}>
            <Feather name="cpu" size={10} color={colors.accent} />
            <Text style={[styles.aiLabelText, { color: colors.accent }]}>IA</Text>
          </View>
        )}
        <MessageRenderer
          content={item.content || (isLoading && item.role === "assistant" ? "Pensando..." : "")}
          isUser={isUser}
          showApply={!isUser}
        />
      </View>
    );
  };

  const provider = getActiveAIProvider();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "web" ? 84 : 80}
    >
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="cpu" size={14} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Assistente IA</Text>
        {provider ? (
          <View style={[styles.providerBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.providerText, { color: colors.mutedForeground }]}>
              {provider.name}
            </Text>
          </View>
        ) : (
          <Text style={[styles.noProvider, { color: colors.warning }]}>Sem provedor</Text>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 20 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Feather name="message-circle" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>
              Pergunte sobre código, debug, arquitetura...
            </Text>
            {activeFile && (
              <Text style={[styles.contextHint, { color: colors.primary }]}>
                Contexto: {activeFile.name}
              </Text>
            )}
          </View>
        }
      />

        <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {/* Botão Colar */}
          <TouchableOpacity
            onPress={async () => {
              try {
                const text = await Clipboard.getStringAsync();
                if (text) {
                  setInput((prev) => prev + text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              } catch {}
            }}
            style={[styles.pasteBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="clipboard" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.chatInput,
              { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Digite ou cole sua pergunta..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={isLoading || !input.trim()}
            style={[
              styles.sendButton,
              { backgroundColor: isLoading || !input.trim() ? colors.secondary : colors.primary },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Feather name="send" size={16} color={colors.primaryForeground} />
            )}
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  providerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  providerText: { fontSize: 11 },
  noProvider: { fontSize: 11 },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  userBubble: { alignSelf: "flex-end", maxWidth: "85%", borderWidth: 0 },
  aiBubble: { alignSelf: "stretch" },
  aiLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  aiLabelText: { fontSize: 10, fontWeight: "700" },
  messageText: { fontSize: 14, lineHeight: 20 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyChatText: { fontSize: 14, textAlign: "center", maxWidth: 220 },
  contextHint: { fontSize: 12, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pasteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
