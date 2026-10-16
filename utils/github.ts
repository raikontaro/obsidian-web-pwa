const GITHUB_OWNER = "raikontaro"; // GitHub kullanıcı adınız
const GITHUB_REPO = "projectobsidian"; // GitHub repo adınız
const GITHUB_BRANCH = "main";

// Depodaki dosyaları listeleme
export async function fetchGitHubFiles(token: string) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) throw new Error("GitHub dosyaları alınamadı! Token'ınızı kontrol edin.");
  const data = await res.json();
  
  // Sadece .md uzantılı dosyaları filtreleyelim
  return data.filter((file: any) => file.type === "file" && file.name.endsWith(".md"));
}

// Belirli bir dosyanın içeriğini okuma
export async function fetchFileContent(path: string, token: string) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) throw new Error("Dosya içeriği okunamadı.");
  const data = await res.json();
  
  // GitHub içeriği Base64 olarak döndürür, çözelim:
  const binString = atob(data.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
  const decoded = new TextDecoder().decode(bytes);

  return { content: decoded, sha: data.sha };
}

// Dosyayı şifreli olarak GitHub'a kaydetme (Commit & Push)
export async function saveFileToGitHub(path: string, content: string, sha: string, token: string, message: string) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  
  // İçeriği tekrar Base64 formatına çevirelim
  const encodedContent = btoa(unescape(encodeURIComponent(content)));

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: message,
      content: encodedContent,
      sha: sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(`GitHub'a kaydedilemedi: ${errData.message}`);
  }

  return await res.json();
}