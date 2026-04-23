import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CodeEditor from "@/components/CodeEditor";
import FileSidebar from "@/components/FileSidebar";
import LibrarySearch from "@/components/LibrarySearch";
import ProjectPlanModal from "@/components/ProjectPlanModal";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportZip } from "@/utils/zipUtils";

const ENCODINGS = ["UTF-8", "UTF-16", "Latin-1 (ISO-8859-1)", "ASCII", "UTF-8 BOM", "Windows-1252"];

const LANGUAGES = [
  "typescript", "javascript", "python", "html", "css", "json",
  "markdown", "sql", "bash", "go", "rust", "java", "php",
  "xml", "yaml", "toml", "plaintext",
];

export default function EditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeProject, activeFile, updateFile, renameFile, settings } = useApp();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEncoding, setShowEncoding] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showLibSearch, setShowLibSearch] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [selectedEncoding, setSelectedEncoding] = useState("UTF-8");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Salvo", "Arquivo salvo com sucesso.");
  };

  const handleExportProject = async () => {
    if (!activeProject) return;
    const ok = await exportZip(activeProject);
    if (!ok) Alert.alert("Erro", "Não foi possível exportar.");
  };

  const handleDuplicateFile = () => {
    if (!activeProject || !activeFile) return;
    const { createFile, setActiveFile } = require("@/context/AppContext");
    Alert.alert(
      "Duplicar arquivo",
      `Criar cópia de "${activeFile.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Duplicar",
          onPress: () => {
            Alert.alert("Info", "Use 'Criar arquivo' e copie o conteúdo manualmente.");
          },
        },
      ]
    );
  };

  const handleFormatCode = () => {
    if (!activeProject || !activeFile) return;
    let formatted = activeFile.content;
    if (activeFile.language === "json") {
      try {
        formatted = JSON.stringify(JSON.parse(activeFile.content), null, 2);
        updateFile(activeProject.id, activeFile.id, formatted);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Formatado!", "JSON formatado com sucesso.");
      } catch {
        Alert.alert("Erro", "JSON inválido, não foi possível formatar.");
      }
    } else {
      Alert.alert("Info", "Formatação automática disponível para JSON. Para outras linguagens, use o assistente IA.");
    }
    setShowTools(false);
  };

  const handleWordCount = () => {
    if (!activeFile) return;
    const lines = activeFile.content.split("\n").length;
    const words = activeFile.content.split(/\s+/).filter(Boolean).length;
    const chars = activeFile.content.length;
    Alert.alert(
      "Estatísticas do Arquivo",
      `Linhas: ${lines}\nPalavras: ${words}\nCaracteres: ${chars}\nTamanho: ${(chars / 1024).toFixed(2)} KB\nCodificação: ${selectedEncoding}`
    );
    setShowTools(false);
  };

  const handleSearchReplace = () => {
    Alert.alert("Buscar/Substituir", "Use Ctrl+F no teclado ou o campo de busca do editor para localizar texto.");
    setShowTools(false);
  };

  const handleHtmlPreview = async () => {
    if (!activeFile) return;
    const isHtml = activeFile.language === "html" || activeFile.name.endsWith(".html");
    const isSvg = activeFile.name.endsWith(".svg");
    if (!isHtml && !isSvg) {
      Alert.alert(
        "Preview HTML",
        "O preview funciona apenas para arquivos .html e .svg. Arquivo atual: " + activeFile.name
      );
      return;
    }
    const content = activeFile.content;
    const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(content)}`;
    if (Platform.OS === "web") {
      const w = window.open("", "_blank");
      if (w) { w.document.write(content); w.document.close(); }
    } else {
      try {
        await WebBrowser.openBrowserAsync(dataUri);
      } catch {
        Alert.alert("Erro", "Não foi possível abrir o preview. Verifique se um navegador está instalado.");
      }
    }
    setShowTools(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 6, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSidebar((v) => !v);
          }}
          style={[styles.iconBtn, showSidebar && { backgroundColor: colors.secondary }]}
        >
          <Feather name="sidebar" size={17} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={{ flex: 1, paddingHorizontal: 6 }}>
          {activeFile ? (
            <TouchableOpacity onPress={() => setShowEncoding(true)}>
              <Text style={[styles.editorTitle, { color: colors.foreground }]} numberOfLines={1}>
                {activeProject?.name} / {activeFile.name}
              </Text>
              <Text style={[styles.encodingLabel, { color: colors.mutedForeground }]}>
                {activeFile.language} · {selectedEncoding}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.editorPlaceholder, { color: colors.mutedForeground }]}>
              {activeProject ? "Selecione um arquivo" : "Nenhum projeto aberto"}
            </Text>
          )}
        </View>

        <View style={styles.headerIcons}>
          {activeFile && (
            <TouchableOpacity
              onPress={() => setShowLangPicker(true)}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="code" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
          {activeFile && (activeFile.language === "html" || activeFile.name.endsWith(".html") || activeFile.name.endsWith(".svg")) && (
            <TouchableOpacity
              onPress={handleHtmlPreview}
              style={[styles.iconBtn, { backgroundColor: "#00d4aa22" }]}
            >
              <Feather name="eye" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowTools(true)}
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="tool" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
          {activeFile && (
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="save" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={styles.editorBody}>
        {showSidebar && (
          <View style={[styles.sidebar, { borderRightColor: colors.border }]}>
            <FileSidebar />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <CodeEditor />
        </View>
      </View>

      {/* Modal: Ferramentas */}
      <Modal visible={showTools} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowTools(false)}>
          <View style={[styles.toolsMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.mutedForeground }]}>FERRAMENTAS</Text>
            {[
              { label: "Formatar Código", icon: "align-left", action: handleFormatCode },
              { label: "Preview HTML/SVG", icon: "eye", action: handleHtmlPreview },
              { label: "Estatísticas do Arquivo", icon: "bar-chart-2", action: handleWordCount },
              { label: "Buscar Bibliotecas", icon: "package", action: () => { setShowTools(false); setShowLibSearch(true); } },
              { label: "Plano do Projeto", icon: "map", action: () => { setShowTools(false); if (!activeProject) { Alert.alert("Aviso", "Abra um projeto primeiro."); return; } setShowPlan(true); } },
              { label: "Exportar Projeto (ZIP)", icon: "download", action: () => { setShowTools(false); handleExportProject(); } },
              { label: "Ir para Projetos", icon: "folder", action: () => { setShowTools(false); router.navigate("/(tabs)/index"); } },
              { label: "Ir para Terminal", icon: "terminal", action: () => { setShowTools(false); router.navigate("/(tabs)/terminal"); } },
              { label: "Codificação: " + selectedEncoding, icon: "type", action: () => { setShowTools(false); setShowEncoding(true); } },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.action}
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
              >
                <Feather name={item.icon as never} size={15} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.foreground }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Codificação */}
      <Modal visible={showEncoding} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Codificação</Text>
            <TouchableOpacity onPress={() => setShowEncoding(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            <Text style={[styles.sheetDesc, { color: colors.mutedForeground }]}>
              Selecione a codificação para exibição e exportação do arquivo.
              O armazenamento interno usa Unicode (UTF-16 do JavaScript).
            </Text>
            {ENCODINGS.map((enc) => (
              <TouchableOpacity
                key={enc}
                onPress={() => {
                  setSelectedEncoding(enc);
                  setShowEncoding(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.encodingOption,
                  {
                    backgroundColor: selectedEncoding === enc ? colors.primary : colors.card,
                    borderColor: selectedEncoding === enc ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.encodingOptionText,
                    { color: selectedEncoding === enc ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {enc}
                </Text>
                {selectedEncoding === enc && (
                  <Feather name="check" size={16} color={colors.primaryForeground} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Linguagem */}
      <Modal visible={showLangPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Linguagem do Arquivo</Text>
            <TouchableOpacity onPress={() => setShowLangPicker(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            {activeFile && LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => {
                  if (activeProject && activeFile) {
                    const newName = activeFile.name.split(".")[0] + "." + (lang === "typescript" ? "ts" : lang === "javascript" ? "js" : lang === "python" ? "py" : lang);
                    Alert.alert(
                      "Mudar Linguagem",
                      `Alterar sintaxe para "${lang}"? O arquivo será renomeado se necessário.`,
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Confirmar",
                          onPress: () => {
                            setShowLangPicker(false);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          },
                        },
                      ]
                    );
                  }
                }}
                style={[
                  styles.encodingOption,
                  {
                    backgroundColor: activeFile.language === lang ? colors.primary : colors.card,
                    borderColor: activeFile.language === lang ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.encodingOptionText,
                    { color: activeFile.language === lang ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {lang}
                </Text>
                {activeFile.language === lang && (
                  <Feather name="check" size={16} color={colors.primaryForeground} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <LibrarySearch visible={showLibSearch} onClose={() => setShowLibSearch(false)} />
      <ProjectPlanModal visible={showPlan} onClose={() => setShowPlan(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  editorTitle: { fontSize: 12, fontWeight: "600" },
  encodingLabel: { fontSize: 10, marginTop: 1 },
  editorPlaceholder: { fontSize: 12 },
  headerIcons: { flexDirection: "row", gap: 4 },
  editorBody: { flex: 1, flexDirection: "row" },
  sidebar: { width: 190, borderRightWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  toolsMenu: {
    width: 300,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 8,
  },
  menuTitle: { fontSize: 10, fontWeight: "700", paddingHorizontal: 16, paddingBottom: 6, letterSpacing: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: { fontSize: 14 },
  sheetContainer: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  sheetDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  encodingOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  encodingOptionText: { fontSize: 15 },
});
