export const MAX_FILE_BYTES = 8_000_000;

export async function fileToBase64(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Le fichier dépasse 8 Mo.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",").pop() || "");
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });
}
