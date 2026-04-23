import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
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

import LibrarySearch from "@/components/LibrarySearch";
import ProjectPlanModal from "@/components/ProjectPlanModal";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportZip, importTar, importZip } from "@/utils/zipUtils";
import type { Project } from "@/context/AppContext";

const TEMPLATES: Record<string, { label: string; icon: string; files: { name: string; content: string }[] }> = {
  vazio: {
    label: "Projeto Vazio",
    icon: "box",
    files: [{ name: "README.md", content: "# Novo Projeto\n\nDescreva seu projeto aqui.\n" }],
  },
  javascript: {
    label: "JavaScript",
    icon: "code",
    files: [
      { name: "index.js", content: "// Projeto JavaScript\nconsole.log('Hello World!');\n" },
      { name: "package.json", content: '{\n  "name": "projeto",\n  "version": "1.0.0",\n  "scripts": {\n    "start": "node index.js"\n  }\n}\n' },
      { name: "README.md", content: "# Meu Projeto JS\n\n## Como executar\n```bash\nnode index.js\n```\n" },
      { name: ".gitignore", content: "node_modules/\n.env\n" },
    ],
  },
  typescript: {
    label: "TypeScript",
    icon: "file-text",
    files: [
      { name: "index.ts", content: "// Projeto TypeScript\nconst message: string = 'Hello World!';\nconsole.log(message);\n" },
      { name: "tsconfig.json", content: '{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "commonjs",\n    "strict": true,\n    "outDir": "./dist"\n  }\n}\n' },
      { name: "package.json", content: '{\n  "name": "projeto",\n  "version": "1.0.0",\n  "scripts": {\n    "build": "tsc",\n    "start": "node dist/index.js"\n  },\n  "devDependencies": {\n    "typescript": "^5.0.0"\n  }\n}\n' },
      { name: ".gitignore", content: "node_modules/\ndist/\n.env\n" },
    ],
  },
  python: {
    label: "Python",
    icon: "terminal",
    files: [
      { name: "main.py", content: '#!/usr/bin/env python3\n"""Projeto Python"""\n\ndef main():\n    print("Hello World!")\n\nif __name__ == "__main__":\n    main()\n' },
      { name: "requirements.txt", content: "# Dependências Python\n# Ex: requests==2.28.0\n" },
      { name: "README.md", content: "# Meu Projeto Python\n\n## Como executar\n```bash\npython main.py\n```\n" },
      { name: ".gitignore", content: "__pycache__/\n*.pyc\n.env\nvenv/\n.venv/\n" },
    ],
  },
  html: {
    label: "HTML/CSS/JS",
    icon: "globe",
    files: [
      { name: "index.html", content: '<!DOCTYPE html>\n<html lang="pt-br">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Meu Projeto</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n' },
      { name: "style.css", content: "* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: sans-serif;\n  padding: 2rem;\n  background: #f5f5f5;\n}\n\nh1 {\n  color: #333;\n}\n" },
      { name: "script.js", content: "// JavaScript\nconsole.log('Página carregada!');\n" },
    ],
  },
  api_express: {
    label: "API Node/Express",
    icon: "server",
    files: [
      { name: "server.js", content: "const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(express.json());\n\napp.get('/api/health', (req, res) => {\n  res.json({ status: 'ok' });\n});\n\napp.get('/api/users', (req, res) => {\n  res.json([{ id: 1, name: 'Usuário' }]);\n});\n\napp.post('/api/users', (req, res) => {\n  res.status(201).json({ id: 2, ...req.body });\n});\n\napp.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));\n" },
      { name: "package.json", content: '{\n  "name": "api-express",\n  "version": "1.0.0",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "nodemon server.js"\n  },\n  "dependencies": {\n    "express": "^4.18.0"\n  }\n}\n' },
      { name: ".env", content: "PORT=3000\nNODE_ENV=development\n" },
      { name: ".gitignore", content: "node_modules/\n.env\n" },
    ],
  },
  react: {
    label: "React + Vite",
    icon: "zap",
    files: [
      { name: "index.html", content: '<!DOCTYPE html>\n<html lang="pt-br">\n<head>\n  <meta charset="UTF-8">\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n' },
      { name: "src/main.jsx", content: "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode><App /></React.StrictMode>\n);\n" },
      { name: "src/App.jsx", content: "import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <h1>React App</h1>\n      <button onClick={() => setCount(c => c + 1)}>Cliques: {count}</button>\n    </div>\n  );\n}\n" },
      { name: "package.json", content: '{\n  "name": "react-app",\n  "version": "0.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.0.0",\n    "react-dom": "^18.0.0"\n  },\n  "devDependencies": {\n    "vite": "^4.0.0"\n  }\n}\n' },
    ],
  },
};

function ProjectCard({
  project,
  onPress,
  onDelete,
  onExport,
  onSelect,
  isSelected,
}: {
  project: Project;
  onPress: () => void;
  onDelete: () => void;
  onExport: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(project.name, "Opções do Projeto", [
          { text: "Abrir no Editor", onPress },
          { text: "Selecionar para combinar", onPress: onSelect },
          { text: "Exportar como ZIP", onPress: onExport },
          { text: "Excluir", style: "destructive", onPress: onDelete },
          { text: "Cancelar", style: "cancel" },
        ]);
      }}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.projectIcon, { backgroundColor: colors.secondary }]}>
          <Feather
            name={project.gitRepo ? "git-branch" : "folder"}
            size={16}
            color={project.gitRepo ? colors.success : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          {project.gitProvider && (
            <Text style={[styles.cardGit, { color: colors.mutedForeground }]}>
              {project.gitProvider === "github" ? "GitHub" : "GitLab"}
            </Text>
          )}
        </View>
        {isSelected && <Feather name="check-circle" size={18} color={colors.primary} />}
        <TouchableOpacity onPress={onExport} style={styles.exportBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="download" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      {project.description ? (
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {project.description}
        </Text>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
          {project.files.length} arquivo{project.files.length !== 1 ? "s" : ""}
        </Text>
        <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
          {new Date(project.updatedAt).toLocaleDateString("pt-BR")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    projects,
    createProject,
    deleteProject,
    setActiveProject,
    combineProjects,
    importGitRepo,
    gitConfigs,
    createFile,
    activeProject,
  } = useApp();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [showLibSearch, setShowLibSearch] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [template, setTemplate] = useState("vazio");

  const [gitUrl, setGitUrl] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [gitProvider, setGitProvider] = useState<"github" | "gitlab">("github");

  const [combineName, setCombineName] = useState("");
  const [importing, setImporting] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    router.navigate("/(tabs)/editor");
  };

  const handleExportZip = async (project: Project) => {
    const ok = await exportZip(project);
    if (!ok) Alert.alert("Erro", "Não foi possível exportar o projeto.");
  };

  const handleImportZip = async () => {
    setShowActionsMenu(false);
    try {
      const data = await importZip();
      if (!data) return;
      const proj = createProject(data.name, data.description);
      data.files.forEach((f) => createFile(proj.id, f.name, f.content));
      setActiveProject(proj);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Importado!", `Projeto "${data.name}" importado com ${data.files.length} arquivo(s).`);
    } catch {
      Alert.alert("Erro", "Não foi possível importar o ZIP.");
    }
  };

  const handleImportTar = async () => {
    setShowActionsMenu(false);
    const data = await importTar();
    if (!data) return;
    const proj = createProject(data.name, data.description);
    data.files.forEach((f) => createFile(proj.id, f.name, f.content));
    setActiveProject(proj);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Importado!", `Projeto "${data.name}" criado.`);
  };

  const handleCreateProject = () => {
    const autoName = newName.trim() || `Projeto ${projects.length + 1}`;
    const tmpl = TEMPLATES[template];
    const proj = createProject(autoName, newDesc.trim());
    tmpl.files.forEach((f) => createFile(proj.id, f.name, f.content));
    setActiveProject(proj);
    setShowNewModal(false);
    setNewName("");
    setNewDesc("");
    setTemplate("vazio");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.navigate("/(tabs)/editor");
  };

  const handleImportGit = async () => {
    if (!gitUrl.trim()) return;
    setImporting(true);
    try {
      const token = gitToken || gitConfigs.find((g) => g.provider === gitProvider)?.token || "";
      const proj = await importGitRepo(gitUrl.trim(), token, gitProvider);
      setActiveProject(proj);
      setShowGitModal(false);
      setGitUrl("");
      setGitToken("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.navigate("/(tabs)/editor");
    } catch {
      Alert.alert("Erro", "Não foi possível importar o repositório.");
    } finally {
      setImporting(false);
    }
  };

  const handleCombine = () => {
    if (selectedProjects.length < 2 || !combineName.trim()) return;
    const combined = combineProjects(selectedProjects, combineName.trim());
    setActiveProject(combined);
    setSelectedProjects([]);
    setCombineName("");
    setShowCombineModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.navigate("/(tabs)/editor");
  };

  const toggleSelect = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.primary }]}>DevMobile</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>IDE no Celular</Text>
        </View>
        <View style={styles.headerActions}>
          {selectedProjects.length >= 2 && (
            <TouchableOpacity
              onPress={() => setShowCombineModal(true)}
              style={[styles.headerBtn, { backgroundColor: colors.accent }]}
            >
              <Feather name="layers" size={14} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowActionsMenu(true)}
            style={[styles.headerBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Feather name="more-horizontal" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowNewModal(true)}
            style={[styles.headerBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de ferramentas rápidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.toolBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {[
          { label: "Importar ZIP", icon: "upload", action: handleImportZip },
          { label: "Importar TAR", icon: "archive", action: handleImportTar },
          { label: "Git Clone", icon: "git-branch", action: () => setShowGitModal(true) },
          { label: "Bibliotecas", icon: "package", action: () => setShowLibSearch(true) },
          {
            label: "Plano do Projeto",
            icon: "map",
            action: () => {
              if (!activeProject) {
                Alert.alert("Sem projeto ativo", "Abra um projeto primeiro.");
                return;
              }
              setShowPlan(true);
            },
          },
        ].map((tool) => (
          <TouchableOpacity
            key={tool.label}
            onPress={tool.action}
            style={[styles.toolChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name={tool.icon as never} size={12} color={colors.primary} />
            <Text style={[styles.toolChipText, { color: colors.foreground }]}>{tool.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedProjects.length > 0 && (
        <View style={[styles.selectBanner, { backgroundColor: colors.accent }]}>
          <Text style={styles.selectText}>
            {selectedProjects.length} selecionado{selectedProjects.length > 1 ? "s" : ""}
          </Text>
          <TouchableOpacity onPress={() => setSelectedProjects([])}>
            <Text style={styles.selectCancel}>Limpar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => handleOpenProject(item)}
            onDelete={() =>
              Alert.alert("Excluir projeto", `Excluir "${item.name}"?`, [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: () => deleteProject(item.id) },
              ])
            }
            onExport={() => handleExportZip(item)}
            onSelect={() => toggleSelect(item.id)}
            isSelected={selectedProjects.includes(item.id)}
          />
        )}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottomPadding + 16,
          gap: 12,
          flexGrow: projects.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="code" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Comece um projeto</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Crie um projeto novo, importe um ZIP ou clone do GitHub/GitLab
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                onPress={() => setShowNewModal(true)}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Criar Projeto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImportZip}
                style={[styles.emptyBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Feather name="upload" size={16} color={colors.foreground} />
                <Text style={[styles.emptyBtnText, { color: colors.foreground }]}>Importar ZIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Modal: Menu de Ações */}
      <Modal visible={showActionsMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
        >
          <View style={[styles.actionsMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.mutedForeground }]}>IMPORTAR</Text>
            {[
              { label: "Importar ZIP", icon: "upload", action: handleImportZip },
              { label: "Importar TAR/TAR.GZ", icon: "archive", action: handleImportTar },
              { label: "Clonar do GitHub", icon: "github", action: () => { setShowActionsMenu(false); setShowGitModal(true); } },
              { label: "Clonar do GitLab", icon: "git-branch", action: () => { setShowActionsMenu(false); setShowGitModal(true); } },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.action}
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
              >
                <Feather name={item.icon as never} size={16} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.foreground }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Novo Projeto */}
      <Modal visible={showNewModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo Projeto</Text>
            <TouchableOpacity onPress={() => setShowNewModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Nome do projeto <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>(opcional — auto-gerado se vazio)</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={`Projeto ${projects.length + 1}`}
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Descrição do projeto"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Template</Text>
            <View style={styles.templateGrid}>
              {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTemplate(key)}
                  style={[
                    styles.templateCard,
                    {
                      backgroundColor: template === key ? colors.primary : colors.card,
                      borderColor: template === key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={tmpl.icon as never}
                    size={18}
                    color={template === key ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.templateLabel,
                      { color: template === key ? colors.primaryForeground : colors.foreground },
                    ]}
                    numberOfLines={2}
                  >
                    {tmpl.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleCreateProject}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus-circle" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Criar Projeto
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Git Import */}
      <Modal visible={showGitModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Importar do Git</Text>
            <TouchableOpacity onPress={() => setShowGitModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Dica visual */}
            <View style={[styles.hintBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.info} />
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Cole a URL do repositório abaixo. GitHub e GitLab são detectados automaticamente.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>URL do Repositório</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={gitUrl}
              onChangeText={(text) => {
                setGitUrl(text);
                if (text.includes("gitlab")) setGitProvider("gitlab");
                else setGitProvider("github");
              }}
              placeholder="https://github.com/usuario/repositorio"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            {/* Detectado automaticamente */}
            {gitUrl.trim().length > 5 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Feather name="check-circle" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12 }}>
                  Detectado: {gitUrl.includes("gitlab") ? "GitLab" : "GitHub"}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Token de Acesso{" "}
              <Text style={{ fontSize: 11 }}>(opcional — para repositórios privados)</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={gitToken}
              onChangeText={setGitToken}
              placeholder={gitProvider === "github" ? "ghp_xxxxxxxxxxxx" : "glpat-xxxxxxxxxxxx"}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 14, lineHeight: 16 }}>
              {gitProvider === "github"
                ? "Token GitHub: github.com → Settings → Developer settings → Personal access tokens → Generate new token (selecione 'repo')"
                : "Token GitLab: gitlab.com → Preferências → Access Tokens → Adicionar (escopo: read_repository)"}
            </Text>

            <TouchableOpacity
              onPress={handleImportGit}
              disabled={!gitUrl.trim() || importing}
              style={[styles.primaryBtn, { backgroundColor: gitUrl.trim() && !importing ? colors.primary : colors.muted }]}
            >
              <Feather name="download-cloud" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                {importing ? "Importando..." : "Importar Repositório"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Combinar */}
      <Modal visible={showCombineModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Combinar Projetos</Text>
            <TouchableOpacity onPress={() => setShowCombineModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Combinando {selectedProjects.length} projetos em um novo
            </Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Nome do projeto combinado</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={combineName}
              onChangeText={setCombineName}
              placeholder="Projeto Combinado"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleCombine}
              disabled={!combineName.trim()}
              style={[styles.primaryBtn, { backgroundColor: combineName.trim() ? colors.primary : colors.muted }]}
            >
              <Feather name="layers" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Combinar Projetos</Text>
            </TouchableOpacity>
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
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toolBar: {
    maxHeight: 44,
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  toolChipText: { fontSize: 12, fontWeight: "500" },
  selectBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  selectText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  selectCancel: { color: "#fff", fontSize: 13 },
  card: { borderRadius: 12, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  projectIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardGit: { fontSize: 11, marginTop: 1 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  cardMeta: { fontSize: 11 },
  cardDate: { fontSize: 11 },
  exportBtn: { padding: 4 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", maxWidth: 260, lineHeight: 20 },
  emptyActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  actionsMenu: {
    width: 280,
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
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: { fontSize: 15 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { padding: 20, gap: 8, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: "600", marginTop: 8, marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  templateCard: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  templateLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  providerRow: { flexDirection: "row", gap: 10 },
  providerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  providerText: { fontSize: 14, fontWeight: "500" },
  sectionDesc: { fontSize: 14, marginBottom: 8 },
  hintBox: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8, alignItems: "flex-start" },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
