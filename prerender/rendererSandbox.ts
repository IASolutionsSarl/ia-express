import path from 'node:path';

const DEFAULT_MAX_OLD_SPACE_SIZE_MB = 512;

type RendererSandboxOptions = {
    readPaths: string[];
    resultFile: string;
    scriptPath: string;
    scriptArguments: string[];
    maxOldSpaceSizeMb?: number;
    sourceEnvironment?: NodeJS.ProcessEnv;
};

export type RendererSandbox = {
    arguments: string[];
    environment: NodeJS.ProcessEnv;
};

/**
 * Creates the least-privileged Node profile used to execute the generated SSR
 * bundle. The bundle contains project-provided component code, so it receives
 * only the runtime files it needs and never inherits publisher credentials.
 */
export function createRendererSandbox({
    readPaths,
    resultFile,
    scriptPath,
    scriptArguments,
    maxOldSpaceSizeMb = DEFAULT_MAX_OLD_SPACE_SIZE_MB,
    sourceEnvironment = process.env,
}: RendererSandboxOptions): RendererSandbox {
    const resolvedReadPaths = [...new Set(readPaths.map(readPath => path.resolve(readPath)))];
    const resolvedResultFile = path.resolve(resultFile);
    const resolvedScriptPath = path.resolve(scriptPath);

    return {
        arguments: [
            `--max-old-space-size=${maxOldSpaceSizeMb}`,
            '--permission',
            ...resolvedReadPaths.map(readPath => `--allow-fs-read=${readPath}`),
            `--allow-fs-write=${resolvedResultFile}`,
            resolvedScriptPath,
            ...scriptArguments,
        ],
        environment: {
            NODE_ENV: sourceEnvironment.NODE_ENV || 'production',
            TZ: sourceEnvironment.TZ || 'UTC',
        },
    };
}
