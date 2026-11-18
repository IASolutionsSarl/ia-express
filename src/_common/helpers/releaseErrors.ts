import { escape } from 'html-escaper';

type ReleaseError = { code?: unknown; message?: unknown };
type ReleaseContext = { action: 'promote' | 'rollback'; cacheVersion?: string };

function missingArtifactMessage({ action, cacheVersion }: ReleaseContext): string {
    return action === 'promote'
        ? 'The server build is unavailable. Publish to staging again, then promote to production.'
        : `Version ${escape(cacheVersion ?? '')} can't be restored: its server build is no longer available.`;
}

const RELEASE_REFUSALS: Record<string, (context: ReleaseContext, error: ReleaseError) => string> = {
    DEPLOY_IN_PROGRESS: ({ action }) =>
        action === 'promote'
            ? 'A publication is already in progress. Wait for it to finish, then try promoting again.'
            : 'A publish is in progress. Try again once it has finished.',
    ENVIRONMENT_MIGRATION_IN_PROGRESS: ({ action }) =>
        action === 'promote'
            ? 'A data migration is in progress. Wait for it to finish, then try promoting again.'
            : 'A data migration is running on this project. Try again once it has finished.',
    BACKEND_ARTIFACT_NOT_FOUND: missingArtifactMessage,
    JOBS_ARTIFACT_NOT_FOUND: missingArtifactMessage,
    NOT_FOUND: ({ action, cacheVersion }) =>
        action === 'promote'
            ? 'This version is no longer available for promotion. Publish to staging again, then promote to production.'
            : `Version ${escape(cacheVersion ?? '')} can no longer be rolled back.`,
    VERSION_NOT_PUBLISHED: ({ action, cacheVersion }) =>
        action === 'promote'
            ? 'This version is no longer available for promotion. Publish to staging again, then promote to production.'
            : `Version ${escape(cacheVersion ?? '')} was never published, so it can't be rolled back.`,
    DATABASE_MIGRATION_FAILED: ({ action }, { message }) => {
        const detail =
            typeof message === 'string' && message && message !== 'DATABASE_MIGRATION_FAILED'
                ? ` ${escape(message.slice(0, 500))}${message.length > 500 ? '…' : ''}.`
                : '';
        const retry = action === 'promote' ? 'promoting' : 'restoring this version';
        return `The database migration failed.${detail} Check the migration and fix the production data that blocks it before ${retry} again.`;
    },
};

/** Promotion and version restore use the same release endpoint. */
export function getReleaseRefusalMessage(error: ReleaseError, context: ReleaseContext): string | undefined {
    if (typeof error.code !== 'string' || !Object.hasOwn(RELEASE_REFUSALS, error.code)) return undefined;
    return RELEASE_REFUSALS[error.code](context, error);
}
