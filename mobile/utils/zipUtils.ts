import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

import type { Project, ProjectFile } from "@/context/AppContext";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    kt: "kotlin", swift: "swift", cs: "csharp", cpp: "cpp", c: "c",
    html: "html", css: "css", scss: "scss", json: "json", yaml: "yaml",
    yml: "yaml", md: "markdown", sql: "sql", sh: "bash", bash: "bash",
    dockerfile: "dockerfile", toml: "toml", xml: "xml", php: "php",
    vue: "vue", svelte: "svelte", txt: "plaintext",
  };
  return map[ext] || "plaintext";
}

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "svg",
  "pdf", "zip", "tar", "gz", "7z", "rar",
  "mp3", "mp4", "wav", "mov", "avi",
  "ttf", "otf", "woff", "woff2",
  "exe", "dll", "so", "dylib",
]);

function isBinaryFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return BINARY_EXTENSIONS.has(ext);
}

export async function importZip(): Promise<Omit<Project, "id" | "createdAt" | "updatedAt"> | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = asset.name || "projeto.zip";

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(base64, { base64: true });

    const files: ProjectFile[] = [];
    const promises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      if (relativePath.startsWith("__MACOSX")) return;
      if (relativePath.includes(".DS_Store")) return;
      if (isBinaryFile(relativePath)) return;

      const fname = relativePath.split("/").pop() || relativePath;
      promises.push(
        zipEntry.async("string").then((content) => {
          files.push({
            id: generateId(),
            name: fname,
            path: relativePath,
            content,
            language: detectLanguage(fname),
          });
        }).catch(() => {})
      );
    });

    await Promise.all(promises);

    const projectName = filename.replace(/\.(zip|tar|tar\.gz|tgz)$/i, "");

    return {
      name: projectName,
      description: `Importado de ${filename}`,
      files,
    };
  } catch (e) {
    console.error("Erro ao importar ZIP:", e);
    return null;
  }
}

export async function exportZip(project: Project): Promise<boolean> {
  try {
    const zip = new JSZip();
    const folder = zip.folder(project.name) || zip;

    for (const file of project.files) {
      folder.file(file.name, file.content);
    }

    const blob = await zip.generateAsync({
      type: "base64",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const filename = `${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, blob, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/zip",
        dialogTitle: `Exportar ${project.name}`,
        UTI: "public.zip-archive",
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error("Erro ao exportar ZIP:", e);
    return false;
  }
}

export async function importTar(): Promise<Omit<Project, "id" | "createdAt" | "updatedAt"> | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/octet-stream",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    if (!asset.name?.match(/\.(tar|tar\.gz|tgz)$/i)) {
      return null;
    }
    const filename = asset.name;
    const projectName = filename.replace(/\.(tar\.gz|tgz|tar)$/i, "");

    return {
      name: projectName,
      description: `Importado de ${filename} (estrutura básica)`,
      files: [
        {
          id: generateId(),
          name: "README.md",
          path: "README.md",
          content: `# ${projectName}\n\nProjeto importado de ${filename}.\n\nArquivos TAR/TAR.GZ: extraia no computador e importe como ZIP para acessar todos os arquivos.\n`,
          language: "markdown",
        },
      ],
    };
  } catch {
    return null;
  }
}
