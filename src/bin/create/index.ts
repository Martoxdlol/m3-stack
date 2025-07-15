import { mkdir, readdir, writeFile } from "fs/promises";
import { join, resolve } from "path";

/**
 * Represents an error that might have a 'code' property, like those from Node.js 'fs' module.
 */
interface NodeJSCallError extends Error {
    code?: string;
}

/**
 * Creates a new directory, ensuring it's empty of user files before proceeding.
 * It allows .git folders and common hidden system files.
 *
 * @param args - An array where the first element is the desired directory name.
 * @throws {Error} If the directory name is invalid, or if the directory
 *                 already exists and contains user files.
 */
export async function createCommand(args: string[]): Promise<void> {
    const name = args[0];

    if (!name) {
        throw new Error("Invalid name: A directory name must be provided.");
    }

    const path = resolve(name);

    try {
        const files = await readdir(path);

        // Filter out .git, common hidden files, and Windows system files
        const userFiles = files.filter(
            (file) =>
                file !== ".git" && // Exclude .git folder
                !file.startsWith(".") && // Exclude other hidden files (e.g., .DS_Store, .vscode)
                !file.startsWith("Thumbs.db") && // Exclude Windows Thumbs.db
                !file.startsWith("desktop.ini") // Exclude Windows desktop.ini
        );

        if (userFiles.length > 0) {
            throw new Error(
                `Directory '${name}' is not empty and contains user files. ` +
                "Please choose an empty directory or delete its contents."
            );
        }
    } catch (error: unknown) {
        // We use 'unknown' as the type of caught errors in TypeScript 4.0+.
        // We then perform a type guard or assertion to safely access properties.
        const nodeError = error as NodeJSCallError;

        // If the error code is 'ENOENT' (Entry Not Found), it means the directory
        // does not exist, which is acceptable.
        if (nodeError.code !== "ENOENT") {
            // For any other error (e.g., permissions issues), rethrow it.
            throw error;
        }
        // If 'ENOENT', simply proceed as the directory will be created.
    }

    // Create the directory (recursively creates parent directories if needed)
    // If the directory already exists, mkdir does nothing.
    await mkdir(path, { recursive: true });

    async function createFile(name: string, content: unknown, format = 'json' as 'json' | 'text') {
        await writeFile(join(path, name), format === 'json' ? JSON.stringify(content, null, 2) : String(content), 'utf8');
    }

    await createFile("package.json", {
        "name": "m3-app",
        "private": true,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "dev": "m3-stack dev",
            "build": "m3-stack build",
            "auth-generate-schema": "m3-stack auth-generate-schema",
            "db:push": "m3-stack drizzle-kit push",
            "start": "m3-stack start"
        },
    })

    await createFile("tsconfig.json", {
        "extends": "m3-stack/tsconfig",
        "include": [
            "src"
        ]
    })

    await createFile("index.html", `<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8" />
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content"
    />
    <title>m3-stack APP</title>
    </head>
    <body>
    <div id="root"></div>
    <script type="module" src="/src/app/main.tsx"></script>
    </body>
</html>
    `.trim(), 'text')

    await mkdir(join(path, "src/app"), { recursive: true });
    await mkdir(join(path, "src/server"), { recursive: true });

    await createFile("tsconfig.json", {
        "extends": "m3-stack/tsconfig",
        "include": [
            "src"
        ]
    })

}