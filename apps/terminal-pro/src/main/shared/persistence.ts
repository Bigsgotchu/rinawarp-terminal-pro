// @ts-nocheck
export function readJsonIfExists(fs, filePath) {
    try {
        if (!fs.existsSync(filePath))
            return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    catch {
        return null;
    }
}
export function writeJsonFile(fs, path, filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}
