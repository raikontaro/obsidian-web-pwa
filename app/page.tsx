'use client';

import { useState } from 'react';
import { encryptText, decryptText } from '@/utils/crypto';
import { fetchGitHubFiles, fetchFileContent, saveFileToGitHub } from '@/utils/github';

export default function Home() {
  const [passphrase, setPassphrase] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);

  // 1. GitHub'dan Dosyaları Çekme
  const handleLoadFromGitHub = async () => {
    if (!githubToken) {
      alert('Lütfen GitHub Personal Access Token girin!');
      return;
    }

    try {
      setStatusMessage('GitHub\'dan dosyalar çekiliyor...');
      const files = await fetchGitHubFiles(githubToken);
      
      const loadedNotes = [];
      for (const file of files) {
        const fileData = await fetchFileContent(file.path, githubToken);
        loadedNotes.push({
          id: file.sha,
          name: file.name,
          path: file.path,
          content: fileData.content,
          sha: fileData.sha
        });
      }

      setNotes(loadedNotes);
      if (loadedNotes.length > 0) setSelectedNote(loadedNotes[0]);
      setStatusMessage('Notlar GitHub\'dan başarıyla yüklendi!');
    } catch (e: any) {
      setStatusMessage(`Hata: ${e.message}`);
    }
  };

  // 2. Notu Şifreleyip GitHub'a Kaydetme
  const handleSaveToGitHub = async () => {
    if (!githubToken || !passphrase) {
      alert('Lütfen hem GitHub Token hem de Şifreleme Parolası girin!');
      return;
    }

    if (!selectedNote) return;

    try {
      setStatusMessage('Metin şifreleniyor ve GitHub\'a gönderiliyor...');
      
      // Önce içeriği şifreleyelim
      const encryptedContent = await encryptText(selectedNote.content, passphrase);

      // GitHub'a commit atalım
      const res = await saveFileToGitHub(
        selectedNote.path,
        encryptedContent,
        selectedNote.sha,
        githubToken,
        `web update: ${selectedNote.name}`
      );

      // Yeni SHA değerini güncelleyelim
      setSelectedNote({ ...selectedNote, sha: res.content.sha });
      setStatusMessage('Başarıyla şifrelendi ve GitHub\'a kaydedildi!');
    } catch (e: any) {
      setStatusMessage(`Kayıt hatası: ${e.message}`);
    }
  };

  // 3. Şifreyi Çözme
  const handleDecrypt = async () => {
    if (!passphrase) {
      alert('Parola girilmedi!');
      return;
    }

    try {
      const decrypted = await decryptText(selectedNote.content, passphrase);
      setSelectedNote({ ...selectedNote, content: decrypted });
      setNotes(notes.map(n => n.path === selectedNote.path ? { ...n, content: decrypted } : n));
      setStatusMessage('Şifre başarıyla çözüldü!');
    } catch (e) {
      setStatusMessage('Şifre çözülemedi! Parola yanlış olabilir.');
    }
  };

  return (
    <main className="flex h-screen bg-neutral-950 text-neutral-100">
      {/* Sol Menü: Kimlik Bilgileri ve Not Listesi */}
      <div className="w-1/3 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800 space-y-3">
          <div className="flex justify-between items-center">
            <h1 className="font-bold text-lg">Obsidian PWA</h1>
            <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-1 rounded">E2E Şifreli</span>
          </div>
          
          {/* GitHub Token */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1">GitHub Token:</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Şifreleme Parolası */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Şifreleme Parolası (Passphrase):</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Gizli parolanız..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleLoadFromGitHub}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded transition-colors"
          >
            GitHub&apos;dan Notları Çek
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {notes.map((note) => (
            <div
              key={note.path}
              onClick={() => setSelectedNote(note)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedNote?.path === note.path ? 'bg-neutral-800' : 'hover:bg-neutral-900'
              }`}
            >
              <h2 className="font-semibold text-sm truncate">{note.name}</h2>
              <p className="text-xs text-neutral-400 truncate">{note.content}</p>
            </div>
          ))}
        </div>

        {statusMessage && (
          <div className="p-2 text-center text-xs text-emerald-400 bg-neutral-900 border-t border-neutral-800">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Sağ Taraf: Editör ve İşlem Butonları */}
      <div className="w-2/3 flex flex-col">
        {selectedNote ? (
          <>
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <span className="font-bold text-sm text-neutral-300">{selectedNote.name}</span>
              <div className="flex gap-2">
                <button 
                  onClick={handleDecrypt}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  Şifreyi Çöz
                </button>
                <button 
                  onClick={handleSaveToGitHub}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  Şifrele & GitHub&apos;a Kaydet
                </button>
              </div>
            </div>
            <textarea
              value={selectedNote.content}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedNote({ ...selectedNote, content: val });
                setNotes(notes.map(n => n.path === selectedNote.path ? { ...n, content: val } : n));
              }}
              className="flex-1 p-4 bg-transparent resize-none focus:outline-none font-mono text-sm"
              placeholder="Not içeriği..."
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
            Sol menüden token girip notları çekin.
          </div>
        )}
      </div>
    </main>
  );
}