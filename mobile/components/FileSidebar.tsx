import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { ProjectFile } from "@/context/AppContext";

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  typescript: { icon: "file-text", color: "#3178c6" },
  javascript: { icon: "file-text", color: "#f7df1e" },
  python: { icon: "file-text", color: "#3572A5" },
  html: { icon: "code", color: "#e34c26" },
  css: { icon: "sliders", color: "#563d7c" },
  json: { icon: "file-text", color: "#cbcb41" },
  markdown: { icon: "file-text", color: "#083fa1" },
  sql: { icon: "database", color: "#336791" },
  bash: { icon: "terminal", color: "#89e051" },
  go: { icon: "file-text", color: "#00ADD8" },
  rust: { icon: "file-text", color: "#dea584" },
  java: { icon: "file-text", color: "#b07219" },
  php: { icon: "file-text", color: "#4F5D95" },
  default: { icon: "file", color: "#8b949e" },
};

function getFileIcon(language: string): { icon: string; color: string } {
  return FILE_ICONS[language] || FILE_ICONS.default;
}

export default function FileSidebar() {
  const colors = useColors();
  const {
    activeProject,
    activeFile,
    setActiveFile,
    createFile,
    deleteFile,
    renameFile,
    settings,
  } = useApp();
  const [newFileName, setNewFileName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (!activeProject) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <Feather name="folder" size={24} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Nenhum projeto aberto
        </Text>
      </View>
    );
  }

  const handleOpenFile = (file: ProjectFile) => {
    setActiveFile(file);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const file = createFile(activeProject.id, newFileName.trim());
    setActiveFile(file);
    setNewFileName("");
    setIsCreating(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteFile = (file: ProjectFile) => {
    Alert.alert("Excluir arquivo", `Excluir "${file.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          deleteFile(activeProject.id, file.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handleStartRename = (file: ProjectFile) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
  };

  const handleConfirmRename = (file: ProjectFile) => {
    if (renameValue.trim() && renameValue !== file.name) {
      renameFile(activeProject.id, file.id, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Feather name="folder-open" size={14} color={colors.primary} />
        <Text
          style={[styles.projectName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {activeProject.name}
        </Text>
        <TouchableOpacity
          onPress={() => setIsCreating(true)}
          style={styles.addBtn}
        >
          <Feather name="plus" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 4 }}>
        {activeProject.files.map((file) => {
          const { icon, color } = getFileIcon(file.language);
          const isActive = activeFile?.id === file.id;
          return (
            <TouchableOpacity
              key={file.id}
              onPress={() => handleOpenFile(file)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(file.name, "Escolha uma ação", [
                  { text: "Renomear", onPress: () => handleStartRename(file) },
                  {
                    text: "Excluir",
                    style: "destructive",
                    onPress: () => handleDeleteFile(file),
                  },
                  { text: "Cancelar", style: "cancel" },
                ]);
              }}
              style={[
                styles.fileRow,
                isActive && { backgroundColor: colors.secondary },
              ]}
            >
              <Feather name={icon as never} size={13} color={color} />
              {renamingId === file.id ? (
                <TextInput
                  style={[
                    styles.renameInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.primary,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={renameValue}
                  onChangeText={setRenameValue}
                  onBlur={() => handleConfirmRename(file)}
                  onSubmitEditing={() => handleConfirmRename(file)}
                  autoFocus
                  selectTextOnFocus
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              ) : (
                <Text
                  style={[
                    styles.fileName,
                    { color: isActive ? colors.primary : colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {file.name}
                </Text>
              )}
              {isActive && (
                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}

        {activeProject.files.length === 0 && !isCreating && (
          <View style={styles.noFiles}>
            <Text style={[styles.noFilesText, { color: colors.mutedForeground }]}>
              Nenhum arquivo
            </Text>
            <TouchableOpacity onPress={() => setIsCreating(true)}>
              <Text style={[styles.createHint, { color: colors.primary }]}>
                + Criar arquivo
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {isCreating && (
        <View style={[styles.createRow, { borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.newFileInput,
              {
                color: colors.foreground,
                borderColor: colors.primary,
                backgroundColor: colors.background,
              },
            ]}
            value={newFileName}
            onChangeText={setNewFileName}
            placeholder="nome_arquivo.ts"
            placeholderTextColor={colors.mutedForeground}
            onSubmitEditing={handleCreateFile}
            onBlur={() => {
              if (!newFileName.trim()) setIsCreating(false);
            }}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={handleCreateFile} style={styles.confirmBtn}>
            <Feather name="check" size={14} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setIsCreating(false);
              setNewFileName("");
            }}
            style={styles.cancelBtn}
          >
            <Feather name="x" size={14} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  projectName: { flex: 1, fontSize: 12, fontWeight: "600" },
  addBtn: { padding: 2 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
  },
  fileName: { flex: 1, fontSize: 13 },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  noFiles: { padding: 16, alignItems: "center", gap: 8 },
  noFilesText: { fontSize: 12 },
  createHint: { fontSize: 13, fontWeight: "600" },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  newFileInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  renameInput: {
    flex: 1,
    height: 24,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 12,
  },
  confirmBtn: { padding: 4 },
  cancelBtn: { padding: 4 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 12 },
});
